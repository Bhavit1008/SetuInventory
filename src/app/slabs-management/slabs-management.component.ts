import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule ,Validators} from '@angular/forms';
import { ProductService } from '../services/product.service';
import { Product } from '../model/product';
import { SlabPieces } from '../model/slab-pieces';
import {  ViewChild, ElementRef } from '@angular/core';
import { Platform } from '@angular/cdk/platform';
import { ToastService } from '../services/toast.service';


@Component({
  selector: 'app-slabs-management',
  standalone: true,
  imports: [CommonModule, FormsModule ,ReactiveFormsModule ],
  templateUrl: './slabs-management.component.html',
  styleUrl: './slabs-management.component.css'
})
export class SlabsManagementComponent {
  public stockFormGroup!: FormGroup;
  slabPieceForm: FormGroup[] = [];
  slabPieces :SlabPieces[] = [];

  isMobile = false;
  isUpdate = false;
  isSubmitting = false;
  submitted = false;
  updatedImage =false;
  showCamera = false;
  previewImg: string | null = null;
  stream: MediaStream | null = null;
  productId: any=null;

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  goDownLocations = [
    { id: 1, label: "Kishangarh" },
    { id: 2, label: "Moradabad" },
    { id: 3, label: "Banswara"}
  ]

  thicknessRange = [
    { id: 1, label: "10" },
    { id: 2, label: "15" },
    { id: 3, label: "20"},
    { id: 4, label: "25"},
    { id: 5, label: "30"}
  ]

  finishesRange = [
    { id: 1, label: "Raw" },
    { id: 2, label: "Mirror Finish" },
    { id: 3, label: "Honed Finish"},
    { id: 4, label: "Hydro Finish"},
    { id: 5, label: "Epoxy Process"},
    { id: 6, label: "Filling Process"},
    { id: 7, label: "Mirror Epoxy Finish"},
    { id: 8, label: "Sand Blast"},
    { id: 9, label: "Fire Flame"},
    { id: 10, label: "Leather Finish"},
  ]

  productQuality = [
    { id: 1, label: "Banswara White"},
    { id: 2, label: "Banswara Purple"},
    { id: 3, label: "Torronto"},
    { id: 4, label: "Traventine B."},
    { id: 5, label: "Kayampura"},
    { id: 6, label: "Morchana Brown"},
    { id: 7, label: "Marine Black"},
    { id: 8, label: "Kesariya Green"},
  ]

  statusOption = [
    { id: 1, label: "Available" },
    { id: 2, label: "Hold" },
    { id: 3, label: "Sold"}
  ]

  constructor(
    private fb: FormBuilder ,
    private productService: ProductService,
    private platform: Platform,
    private toastService: ToastService,
    private cd : ChangeDetectorRef
  ){}

  ngOnInit(){
    this.isMobile = this.platform.ANDROID || this.platform.IOS;
    this.buildForm();
    const state = history.state as { formData?: Product };
    if (state?.formData) {
      this.patchFormWithData(state.formData);
      this.productId = state.formData.id;
      this.isUpdate = true;
    }
  }

  buildForm(){
    this.stockFormGroup = new FormGroup({
      productCode: new FormControl('', Validators.required),
      godownLocation: new FormControl('',Validators.required),
      productQuality: new FormControl('',Validators.required),
      productFinished:new FormControl('',Validators.required),
      productLength: new FormControl('',Validators.required),
      productWidth:new FormControl('',Validators.required),
      productThickness:new FormControl('',Validators.required),
      quantity:new FormControl('',Validators.required),
      exFactoryCost:new FormControl('',Validators.required),
      miscellaneousCost:new FormControl('',Validators.required),
      freightCost:new FormControl('',Validators.required),
      inHouseCost: new FormControl('',Validators.required),
      sellingCost: new FormControl('',Validators.required),
      status:new FormControl('',Validators.required),
      remark:new FormControl('',Validators.required),
      size: new FormControl('')
    })
  }

 private patchFormWithData(formData?: Product): void {
  if (!formData) return;

  this.stockFormGroup.patchValue({
    id: formData.id ?? null,
    productCode: formData.productCode ?? null,
    godownLocation: formData.godownLocation ?? null,
    productQuality: formData.productQuality ?? null,
    productFinished: formData.productFinished ?? null,
    productLength: formData.productLength ?? null,
    productWidth: formData.productWidth ?? null,
    productThickness: formData.productThickness ?? null,
    quantity: formData.quantity ?? null,
    exFactoryCost: formData.exFactoryCost ?? null,
    miscellaneousCost: formData.miscellaneousCost ?? null,
    freightCost: formData.freightCost ?? null,
    inHouseCost: formData.inHouseCost ?? null,
    sellingCost: formData.sellingCost ?? null,
    status: formData.status ?? null,
    remark: formData.description ?? null
  });

  this.slabPieces = Array.isArray(formData.pieces) ? formData.pieces : [];
  this.slabPieceForm = this.slabPieces.map(item =>
    this.fb.group({
      id: [item.id],
      length: [item.length],
      width: [item.width],
      lessLength: [item.lessLength],
      lessWidth: [item.lessWidth],
      totalArea: [item.totalArea],
      editable: [item.editable],
      remark: [item.remark]
    })
  );
  
  if (formData.imageUrl) {
    this.productService.downloadImage(formData.imageUrl).subscribe(
      base64 => {
        this.previewImg = base64;
        this.updatedImage = false;
        this.cd.detectChanges();
      },
      () => this.cd.detectChanges()
    );
  } else {
    this.cd.detectChanges();
  }

  console.log('After patch -> productCode:', this.stockFormGroup.get('productCode')?.value);
  console.log('After patch -> slabPieces count:', this.slabPieces.length);
}


  calculateTotalSlabSize(): void {
  if (!this.slabPieces?.length) {
    console.log('No slab pieces found');
    return;
  }
  console.log('slab length', this.slabPieces.length);
  const area = this.slabPieces.reduce((sum, piece) => {
    console.log('slab piece area :: ', piece.totalArea);
    return sum + piece.totalArea;
  }, 0);
  console.log('total area :: ', area);
  this.stockFormGroup.get('size')?.setValue(area);
}

  editSlabPiece(index: number) {
    this.slabPieceForm[index].patchValue({ editable: true });
    this.calculateTotalSlabSize()
  }

  saveSlabPiece(index: number) {
    this.slabPieces[index] = this.slabPieceForm[index].value;
    this.calculateSlabArea(index)
    this.slabPieces[index] = this.slabPieceForm[index].value;
        this.calculateTotalSlabSize()

  }

  cancelEdit(index: number) {
    this.slabPieceForm[index].patchValue({ ...this.slabPieces[index], editable: false });
    this.calculateTotalSlabSize()
  }

  calculateSlabArea(index: number){
    const group = this.slabPieceForm.at(index) as FormGroup;
    var length = parseFloat(group.value.length) || 0;
    var width = parseFloat(group.value.width) || 0;
    var lessLength = parseFloat(group.value.lessLength) || 0;
    var lessWidth = parseFloat(group.value.lessWidth) || 0;
    var totalSlabSize = (length * width) - (lessLength * lessWidth);
   
    group.patchValue({ 
      totalArea: totalSlabSize,
      editable: false 
    });
  }

  deleteSlabPiece(index: number) {
    this.slabPieces.splice(index, 1);
    this.slabPieceForm.splice(index, 1);
    this.calculateTotalSlabSize()
  }

  addNewRow() {
    const newId = this.slabPieces.length > 0 ? this.slabPieces[this.slabPieces.length - 1].id + 1 : 1;
    const newSlab = new SlabPieces();
    newSlab.id = newId;
    this.slabPieces.push(newSlab);
    this.slabPieceForm.push(this.fb.group({
      id: new FormControl(newSlab.id),
      length: new FormControl(newSlab.length),
      width: new FormControl(newSlab.width),
      lessLength: new FormControl(newSlab.lessLength),
      lessWidth: new FormControl(newSlab.lessWidth),
      totalArea: new FormControl(newSlab.totalArea),
      editable: new FormControl(newSlab.editable),
      remark:new FormControl(newSlab.remark)
    }));
  }

  saveSlabDetails(slabForm: any): void {
    if (!slabForm) return;
    this.submitted = true;
    if (this.previewImg===null ) {
      this.toastService.showError("Please Add Image")
      return;
    }
    if(this.stockFormGroup.invalid){
      return;
    };
    console.log('slab form in save btn :: ', slabForm);
    this.isSubmitting = true;
    const state = history.state as { formData?: Product };
    const existingImageUrl = state.formData?.imageUrl ?? '';

    if (this.updatedImage && this.previewImg) {
      this.productService.uploadImage(this.previewImg).subscribe({
        next: (imageUrl) => {
          this.saveSlab(slabForm, imageUrl);
        },
        error: () => {
          this.isSubmitting = false;
          this.toastService.showError('Image upload failed.');
        }
      });
    } else {
      this.saveSlab(slabForm, existingImageUrl);
    }
    history.replaceState({}, document.title);
  }

  private saveSlab(slabForm: any, imageUrl: string): void {
    this.productService.postApiCall(this.prepareResponseObject(slabForm, imageUrl)).subscribe({
      next: () => {
        this.afterSave();
      },
      error: () => {
        this.isSubmitting = false;
        this.toastService.showError('Failed to save slab details.');
      }
    });
  }

  private afterSave(): void {
    this.buildForm();
    this.slabPieces = [];
    this.slabPieceForm = [];
    this.previewImg = null;
    this.toastService.showSuccess(this.isUpdate ? 'Slab details updated successfully.' : 'Added new slab successfully.');
    this.isUpdate = false;
    this.isSubmitting = false;
    this.submitted = false;
  }

  prepareResponseObject(slab: any , imgUrl : string){
    if(this.productId!=null){
      slab.value.id = this.productId
    }
    console.log('slab data in processing :: ', slab.value.id);
    const slabObject = {
      id : slab.value.id,
      category : "Slab",
      productCode : slab.value.productCode,
      godownLocation : slab.value.godownLocation,
      productQuality: slab.value.productQuality,
      productFinished : slab.value.productFinished,
      productLength : parseFloat(slab.value.productLength),
      productWidth : parseFloat(slab.value.productWidth),
      productThickness : parseFloat(slab.value.productThickness),
      quantity: parseInt(slab.value.quantity),
      exFactoryCost : parseFloat(slab.value.exFactoryCost),
      miscellaneousCost: parseFloat(slab.value.miscellaneousCost),
      freightCost : parseFloat(slab.value.freightCost),
      inHouseCost : parseFloat(slab.value.inHouseCost),
      sellingCost : parseFloat(slab.value.sellingCost),
      status: slab.value.status,
      description : slab.value.remark,
      pieces : this.slabPieces,
      imageUrl : imgUrl
    }
    return slabObject;
  }

  openCamera(): void {
    this.showCamera = true;
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      this.stream = stream;
      this.videoRef.nativeElement.srcObject = stream;
    }).catch(err => {
      alert('Camera access denied or unavailable.');
      this.showCamera = false;
    });
  }

  capturePhoto(): void {
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    this.previewImg = canvas.toDataURL('image/png');
    this.stopCamera();
    this.showCamera = false;
    this.updatedImage = true;
  }

  closeCamera(): void {
    this.stopCamera();
    this.showCamera = false;
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = e => this.previewImg = reader.result as string;
      this.updatedImage = true;
      reader.readAsDataURL(input.files[0]);
    }
  }
  
}

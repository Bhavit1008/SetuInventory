import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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
    private toastService: ToastService
  ){}

  ngOnInit(){
    this.isMobile = this.platform.ANDROID || this.platform.IOS;
    this.buildForm();
    const state = history.state as { formData?: Product };
    if (state?.formData) {
      this.patchFormWithData(state.formData);
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
    })
  }

  private patchFormWithData(formData: Product):void{
    this.stockFormGroup = new FormGroup({
      id: new FormControl(formData.id),
      productCode : new FormControl(formData.productCode,Validators.required),
      godownLocation : new FormControl(formData.godownLocation,Validators.required),
      productQuality:new FormControl(formData.productQuality,Validators.required),
      productFinished : new FormControl(formData.productFinished,Validators.required),
      productLength : new FormControl(formData.productLength,Validators.required),
      productWidth : new FormControl(formData.productWidth,Validators.required),
      productThickness:new FormControl(formData.productThickness,Validators.required),
      quantity:new FormControl(formData.quantity,Validators.required),
      exFactoryCost : new FormControl(formData.exFactoryCost,Validators.required),
      miscellaneousCost : new FormControl(formData.miscellaneousCost,Validators.required),
      freightCost : new FormControl(formData.freightCost,Validators.required),
      inHouseCost : new FormControl(formData.inHouseCost,Validators.required),
      sellingCost : new FormControl(formData.sellingCost,Validators.required),
      status: new FormControl(formData.status,Validators.required),
      remark :new FormControl(formData.description,Validators.required),
    })
    this.slabPieces = formData.pieces;
    for (const item of this.slabPieces) {
      this.slabPieceForm.push(this.fb.group({
        id: new FormControl(item.id),
        length: new FormControl(item.length),
        width: new FormControl(item.width),
        lessLength: new FormControl(item.lessLength),
        lessWidth: new FormControl(item.lessWidth),
        totalArea: new FormControl(item.totalArea),
        editable: new FormControl(item.editable),
        remark:new FormControl(item.remark)
      }));
    }
    this.productService.downloadImage(formData.imageUrl).subscribe((base64Image) => {
      this.previewImg = base64Image;
      this.updatedImage = false;
    });
  }

  editSlabPiece(index: number) {
    this.slabPieceForm[index].patchValue({ editable: true });
  }

  saveSlabPiece(index: number) {
    this.slabPieces[index] = this.slabPieceForm[index].value;
    this.calculateSlabArea(index)
    this.slabPieces[index] = this.slabPieceForm[index].value;
  }

  cancelEdit(index: number) {
    this.slabPieceForm[index].patchValue({ ...this.slabPieces[index], editable: false });
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

import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule ,Validators } from '@angular/forms';
import { Product } from '../model/product';
import { ProductService } from '../services/product.service';
import { Platform } from '@angular/cdk/platform';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-blocks-management',
  standalone: true,
  imports: [CommonModule, FormsModule ,ReactiveFormsModule ],
  templateUrl: './blocks-management.component.html',
  styleUrl: './blocks-management.component.css'
})
export class BlocksManagementComponent {

  constructor(
    private productService: ProductService,
    private platform: Platform,
    private toastService: ToastService
  ) {}
  
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  isMobile = false;
  showCamera = false;
  updatedImage = false;
  isUpdate = false;
  isSubmitting = false;
  submitted = false;

  previewImg: string | null = null;
  stream: MediaStream | null = null;

  public blockFormGroup!: FormGroup;

  goDownLocations = [
    { id: 1, label: "Kishangarh" },
    { id: 2, label: "Moradabad" },
    { id: 3, label: "Banswara"}
  ]

  statusOption = [
    { id: 1, label: "Available" },
    { id: 2, label: "Hold" },
    { id: 3, label: "Sold"}
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

  ngOnInit(){
    this.isMobile = this.platform.ANDROID || this.platform.IOS;
    const state = history.state as { formData?: Product };
    this.buildForm(state?.formData);
    if (state?.formData?.imageUrl) {
      this.productService.downloadImage(state.formData.imageUrl).subscribe(base64Image => {
        this.previewImg = base64Image;
        this.updatedImage = false;
      });
    }
    this.isUpdate = !!state?.formData;
  }

  buildForm(data?: Product) {
  this.blockFormGroup = new FormGroup({
    id: new FormControl(data?.id),
    productCode: new FormControl(data?.productCode || '', Validators.required),
    godownLocation: new FormControl(data?.godownLocation || '', Validators.required),
    productQuality: new FormControl(data?.productQuality || '', Validators.required),
    productLength: new FormControl(data?.productLength || '', Validators.required),
    productWidth: new FormControl(data?.productWidth || '', Validators.required),
    productHeight: new FormControl(data?.productHeight || '', Validators.required),
    productWeight: new FormControl(data?.productWeight || '', Validators.required),
    exFactoryCost: new FormControl(data?.exFactoryCost || '', Validators.required),
    royaltyCost: new FormControl(data?.royaltyCost || '', Validators.required),
    freightCost: new FormControl(data?.freightCost || '', Validators.required),
    inHouseCost: new FormControl(data?.inHouseCost || '', Validators.required),
    sellingCost: new FormControl(data?.sellingCost || '', Validators.required),
    status: new FormControl(data?.status || '', Validators.required),
    remarks: new FormControl(data?.description || '', Validators.required)
  });
  }

  saveBlockDetails(block: any): void {
    if (!block) return;
    this.submitted = true;
    if (this.previewImg===null ) {
      this.toastService.showError("Please Add Image")
      return;
    }
    if(this.blockFormGroup.invalid){
      return;
    };

    this.isSubmitting = true;
    const state = history.state as { formData?: Product };
    const existingImageUrl = state.formData?.imageUrl ?? '';

    if (this.updatedImage && this.previewImg) {
      this.productService.uploadImage(this.previewImg).subscribe({
        next: (imageUrl) => {
          this.saveBlock(block, imageUrl);
        },
        error: () => {
          this.isSubmitting = false;
          this.toastService.showError('Image upload failed.');
        }
      });
    } else {
      this.saveBlock(block, existingImageUrl);
    }
    history.replaceState({}, document.title);
  }
  private saveBlock(blockForm: any, imageUrl: string): void {
    this.productService.postApiCall(this.prepareResponseObject(blockForm, imageUrl)).subscribe({
      next: () => {
        this.afterSave();
      },
      error: () => {
        this.isSubmitting = false;
        this.toastService.showError('Failed to save block details.');
      }
    });
  }

  private afterSave(): void {
    this.buildForm();
    this.previewImg = null;
    this.toastService.showSuccess(this.isUpdate ? 'Block details updated successfully.' : 'Added new block successfully.');
    this.isUpdate = false;
    this.isSubmitting = false;
    this.submitted = false;
  }

  prepareResponseObject(block: FormGroup, imgUrl: string) {
  const value = block.value;
  return {
    id: value.id,
    category: 'Block',
    productCode: value.productCode,
    godownLocation: value.godownLocation,
    productQuality: value.productQuality,
    productLength: value.productLength,
    productWidth: value.productWidth,
    productHeight: value.productHeight,
    productWeight: value.productWeight,
    exFactoryCost: value.exFactoryCost,
    royaltyCost: value.royaltyCost,
    freightCost: value.freightCost,
    inHouseCost: value.inHouseCost,
    sellingCost: value.sellingCost,
    description: value.remarks,
    status: value.status,
    imageUrl: imgUrl
  };
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
  
}

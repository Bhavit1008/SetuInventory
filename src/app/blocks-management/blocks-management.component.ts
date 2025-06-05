import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Product } from '../model/product';
import { ProductService } from '../services/product.service';
import { Platform } from '@angular/cdk/platform';

@Component({
  selector: 'app-blocks-management',
  standalone: true,
  imports: [CommonModule, FormsModule ,ReactiveFormsModule ],
  templateUrl: './blocks-management.component.html',
  styleUrl: './blocks-management.component.css'
})
export class BlocksManagementComponent {

    constructor(private productService: ProductService, private platform: Platform){}
    @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
    @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
    isMobile = false;
    showCamera = false;
    previewImg: string | null = null;
    stream: MediaStream | null = null;
    updatedImage =false;
    public blockFormGroup!: FormGroup;
    isLoading = false;
    isResultDialog = false;

    goDownLocations = [
    { id: 1, label: "Kishangarh" },
    { id: 2, label: "Moradabad" },
    { id: 3, label: "Banswara"}
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
      this.buildForm();
      if (state?.formData) {
        this.blockFormGroup = new FormGroup({
          productCode : new FormControl(state.formData.productCode),
          godownLocation : new FormControl(state.formData.godownLocation),
          productQuality : new FormControl(state.formData.productQuality),
          productLength : new FormControl(state.formData.productLength),
          productWidth : new FormControl(state.formData.productWeight),
          productHeight : new FormControl(state.formData.productHeight),
          productWeight : new FormControl(state.formData.productWeight),
          exFactoryCost : new FormControl(state.formData.exFactoryCost),
          royaltyCost : new FormControl(state.formData.royaltyCost),
          freightCost : new FormControl(state.formData.freightCost),
          inHouseCost : new FormControl(state.formData.inHouseCost),
          sellingCost : new FormControl(state.formData.sellingCost),
          remarks :new FormControl(state.formData.description),
        })
      }
    }

    buildForm(){
      this.blockFormGroup = new FormGroup({
        productCode : new FormControl(''),
        godownLocation : new FormControl(''),
        productQuality : new FormControl(''),
        productLength : new FormControl(''),
        productWidth : new FormControl(''),
        productHeight : new FormControl(''),
        productWeight : new FormControl(''),
        exFactoryCost : new FormControl(''),
        royaltyCost : new FormControl(''),
        freightCost : new FormControl(''),
        inHouseCost : new FormControl(''),
        sellingCost : new FormControl(''),
        remarks : new FormControl('')
      })
    }

    saveBlockDetails(block: any){
      if(block!=null && block!=undefined){
        console.log('block details :: ', this.prepareResponseObject(block));
        this.isLoading = true;
        this.productService.postApiCall(this.prepareResponseObject(block)).subscribe(() => {
          this.isLoading = false;
          this.isResultDialog = true;
        })
      }
    }

    prepareResponseObject(block: any){
     const blockObject = {
        category : 'Block',
        productCode : block.value.productCode,
        godownLocation : block.value.godownLocation,
        productQuality : block.value.productQuality,
        productLength : block.value.productLength,
        productWidth : block.value.productWidth,
        productHeight : block.value.productHeight,
        productWeight : block.value.productWeight,
        exFactoryCost : block.value.exFactoryCost,
        royaltyCost : block.value.royaltyCost,
        freightCost : block.value.freightCost,
        inHouseCost : block.value.inHouseCost,
        sellingCost : block.value.sellingCost,
        description : block.value.remarks
      }
      return blockObject;
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

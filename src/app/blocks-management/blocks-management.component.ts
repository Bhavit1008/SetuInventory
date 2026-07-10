import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, HostListener, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Product } from '../model/product';
import { ProductService } from '../services/product.service';
import { Platform } from '@angular/cdk/platform';
import { ToastService } from '../services/toast.service';
import { firstValueFrom } from 'rxjs';

interface CatalogueItem {
  id: string;
  itemCode: string;
  marbleName: string;
  country: string;
  materialType: string;
  stoneFamily: string;
}

@Component({
  selector: 'app-blocks-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './blocks-management.component.html',
  styleUrl: './blocks-management.component.css'
})
export class BlocksManagementComponent implements OnInit {

  constructor(
    private http: HttpClient,
    private productService: ProductService,
    private platform: Platform,
    private toastService: ToastService
  ) {}

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  isMobile = false;
  showCamera = false;
  isUpdate = false;
  isSubmitting = false;
  submitted = false;

  previewImgs: string[] = [];
  stream: MediaStream | null = null;
  userBlockSuffix: string = '';

  // ── Catalogue / Stone selection ────────────────
  catalogueItems: CatalogueItem[] = [];
  selectedStone: CatalogueItem | null = null;
  isLoadingStones = false;

  // ── Static dropdown data ───────────────────────
  goDownLocations = [
    { id: 'KSH', label: 'Kishangarh' },
    { id: 'MRD', label: 'Moradabad'  },
    { id: 'BNS', label: 'Banswara'   },
  ];

  statusOption = [
    { id: 1, label: 'Available' },
    { id: 2, label: 'Hold'      },
    { id: 3, label: 'Sold'      },
  ];

  finishesRange = [
    { id: 1,  label: 'Raw'                 },
    { id: 2,  label: 'Mirror Finish'       },
    { id: 3,  label: 'Honed Finish'        },
    { id: 4,  label: 'Hydro Finish'        },
    { id: 5,  label: 'Epoxy Process'       },
    { id: 6,  label: 'Filling Process'     },
    { id: 7,  label: 'Mirror Epoxy Finish' },
    { id: 8,  label: 'Sand Blast'          },
    { id: 9,  label: 'Fire Flame'          },
    { id: 10, label: 'Leather Finish'      },
  ];

  // ── Custom dropdown state ──────────────────────
  openDropdown: string | null = null;

  toggleDropdown(name: string, event: Event): void {
    event.stopPropagation();
    this.openDropdown = this.openDropdown === name ? null : name;
  }

  selectOption(controlName: string, value: string): void {
    this.blockFormGroup.get(controlName)?.setValue(value);
    this.openDropdown = null;
  }

  @HostListener('document:click')
  closeDropdowns(): void { this.openDropdown = null; }

  // ── Form ───────────────────────────────────────
  public blockFormGroup!: FormGroup;

  // ── Lifecycle ──────────────────────────────────
  ngOnInit(): void {
    this.isMobile = this.platform.ANDROID || this.platform.IOS;
    const state = history.state as { formData?: Product };
    this.buildForm(state?.formData);

    if (state?.formData?.productCode) {
      const parts = state.formData.productCode.split('-');
      this.userBlockSuffix = parts[parts.length - 1];
    }

    const existingUrls: string[] = state?.formData?.imageUrls?.length
      ? state.formData.imageUrls
      : state?.formData?.imageUrl ? [state.formData.imageUrl] : [];
    this.previewImgs = [...existingUrls];

    this.isUpdate = !!state?.formData;

    this.loadCatalogueItems(state?.formData);

    const costFields = ['exFactoryCost', 'royaltyCost', 'freightCost'];
    costFields.forEach(field => {
      this.blockFormGroup.get(field)?.valueChanges.subscribe(() => {
        this.recalculateTotalCost();
      });
    });
  }

  // ── Catalogue loading ──────────────────────────
  private async loadCatalogueItems(formData?: Product): Promise<void> {
    this.isLoadingStones = true;
    try {
      this.catalogueItems = await firstValueFrom(
        this.http.get<CatalogueItem[]>('https://setu-crm.onrender.com/catalogue/all')
      );
      // When editing, pre-select the stone that matches saved values.
      // Prefer the persisted link; fall back to a name match for blocks saved
      // before catalogueItemId existed.
      if (formData?.catalogueItemId) {
        this.selectedStone = this.catalogueItems.find(i => i.id === formData.catalogueItemId) ?? null;
      }
      if (!this.selectedStone && formData?.productQuality) {
        this.selectedStone = this.catalogueItems.find(
          i => i.marbleName?.toLowerCase() === formData.productQuality?.toLowerCase()
        ) ?? null;
      }
    } catch {
      this.toastService.showError('Could not load catalogue stones.');
    } finally {
      this.isLoadingStones = false;
    }
  }

  onStoneSelected(itemCode: string): void {
    const stone = this.catalogueItems.find(i => i.itemCode === itemCode);
    if (!stone) return;
    this.selectedStone = stone;
    this.openDropdown = null;
    this.blockFormGroup.patchValue({
      origin:         stone.country,
      material:       stone.materialType,
      productQuality: stone.marbleName,
    }, { emitEvent: false });
    this.refreshBlockCode();
  }

  // ── Block code ─────────────────────────────────
  get autoPrefix(): string {
    return this.selectedStone?.itemCode ?? '';
  }

  private refreshBlockCode(): void {
    const prefix   = this.autoPrefix;
    const fullCode = this.userBlockSuffix ? `${prefix}-${this.userBlockSuffix}` : prefix;
    this.blockFormGroup.get('productCode')!.setValue(fullCode, { emitEvent: false });
  }

  onBlockSuffixInput(event: Event): void {
    this.userBlockSuffix = (event.target as HTMLInputElement).value;
    this.refreshBlockCode();
  }

  // ── Cost calculation ───────────────────────────
  private recalculateTotalCost(): void {
    const get = (key: string): number =>
      parseFloat(this.blockFormGroup.get(key)?.value) || 0;

    const total = get('exFactoryCost') + get('royaltyCost') + get('freightCost');
    this.blockFormGroup.get('totalCost')?.setValue(
      total > 0 ? total : null,
      { emitEvent: false }
    );
  }

  // ── Form builder ───────────────────────────────
  buildForm(data?: Product): void {
    this.blockFormGroup = new FormGroup({
      id:             new FormControl(data?.id),
      productCode:    new FormControl(data?.productCode    || '', Validators.required),
      godownLocation: new FormControl(data?.godownLocation || '', Validators.required),
      productQuality: new FormControl(data?.productQuality || '', Validators.required),
      productLength:  new FormControl(data?.productLength  || '', Validators.required),
      productWidth:   new FormControl(data?.productWidth   || '', Validators.required),
      productHeight:  new FormControl(data?.productHeight  || '', Validators.required),
      productWeight:  new FormControl(data?.productWeight  || '', Validators.required),
      exFactoryCost:  new FormControl(data?.exFactoryCost  || ''),
      royaltyCost:    new FormControl(data?.royaltyCost    || ''),
      freightCost:    new FormControl(data?.freightCost    || ''),
      inHouseCost:    new FormControl(data?.inHouseCost    || ''),
      sellingCost:    new FormControl(data?.sellingCost    || ''),
      status:         new FormControl(data?.status         || 'Available', Validators.required),
      remarks:        new FormControl(data?.description    || ''),
      origin:         new FormControl(data?.origin         || ''),
      material:       new FormControl(data?.material       || ''),
    });
  }

  // ── Save ───────────────────────────────────────
  saveBlockDetails(block: any): void {
    if (!block) return;
    this.submitted = true;

    if (this.previewImgs.length === 0) {
      this.toastService.showError('Please add at least one image');
      return;
    }
    if (this.blockFormGroup.invalid) { return; }

    this.isSubmitting = true;
    history.replaceState({}, document.title);

    this.uploadAllImages().then(urls => {
      this.saveBlock(block, urls);
    }).catch(() => {
      this.isSubmitting = false;
      this.toastService.showError('Image upload failed.');
    });
  }

  private async uploadAllImages(): Promise<string[]> {
    const urls: string[] = [];
    for (const img of this.previewImgs) {
      if (img.startsWith('data:')) {
        const url = await firstValueFrom(this.productService.uploadImage(img));
        urls.push(url);
      } else {
        urls.push(img);
      }
    }
    return urls;
  }

  private saveBlock(blockForm: any, imageUrls: string[]): void {
    this.productService.postApiCall(this.prepareResponseObject(blockForm, imageUrls)).subscribe({
      next:  () => this.afterSave(),
      error: () => {
        this.isSubmitting = false;
        this.toastService.showError('Failed to save block details.');
      }
    });
  }

  private afterSave(): void {
    this.userBlockSuffix = '';
    this.selectedStone   = null;
    this.buildForm();
    this.previewImgs = [];
    this.toastService.showSuccess(
      this.isUpdate ? 'Block details updated successfully.' : 'Added new block successfully.'
    );
    this.isUpdate    = false;
    this.isSubmitting = false;
    this.submitted   = false;
  }

  prepareResponseObject(block: FormGroup, imageUrls: string[]) {
    const value = block.value;
    return {
      id:             value.productCode + '-' + Date.now(),
      category:       'Block',
      productCode:    value.productCode,
      godownLocation: value.godownLocation,
      productQuality: value.productQuality,
      productLength:  value.productLength,
      productWidth:   value.productWidth,
      productHeight:  value.productHeight,
      productWeight:  value.productWeight,
      description:    value.remarks,
      status:         value.status,
      imageUrl:       imageUrls[0] || '',
      imageUrls:      imageUrls,
      origin:         value.origin,
      material:       value.material,
      catalogueItemId: this.selectedStone?.id || '',
    };
  }

  // ── Image / Camera ─────────────────────────────
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = () => { this.previewImgs.push(reader.result as string); };
        reader.readAsDataURL(file);
      });
      input.value = '';
    }
  }

  removeImage(index: number): void { this.previewImgs.splice(index, 1); }

  openCamera(): void {
    this.showCamera = true;
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      this.stream = stream;
      this.videoRef.nativeElement.srcObject = stream;
    }).catch(() => {
      this.toastService.showError('Camera access denied or unavailable.');
      this.showCamera = false;
    });
  }

  capturePhoto(): void {
    const video  = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    this.previewImgs.push(canvas.toDataURL('image/png'));
    this.stopCamera();
    this.showCamera = false;
  }

  closeCamera(): void { this.stopCamera(); this.showCamera = false; }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}

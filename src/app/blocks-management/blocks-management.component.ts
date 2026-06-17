import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, HostListener, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Product } from '../model/product';
import { ProductService } from '../services/product.service';
import { Platform } from '@angular/cdk/platform';
import { ToastService } from '../services/toast.service';
import { combineLatest, Subscription } from 'rxjs';
import { debounceTime, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-blocks-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './blocks-management.component.html',
  styleUrl: './blocks-management.component.css'
})
export class BlocksManagementComponent implements OnInit, OnDestroy {

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

  private blockCodeSub!: Subscription;
  userBlockSuffix: string = '';

  // ── Dropdown data ──────────────────────────────

  goDownLocations = [
    { id: 'KSH', label: 'Kishangarh' },
    { id: 'MRD', label: 'Moradabad' },
    { id: 'BNS', label: 'Banswara' },
  ];

  statusOption = [
    { id: 1, label: 'Available' },
    { id: 2, label: 'Hold' },
    { id: 3, label: 'Sold' },
  ];

  productQuality = [
    { id: 'BW',  label: 'Banswara White'  },
    { id: 'BP',  label: 'Banswara Purple' },
    { id: 'TOR', label: 'Torronto'        },
    { id: 'TVB', label: 'Traventine B.'   },
    { id: 'KAY', label: 'Kayampura'       },
    { id: 'MCB', label: 'Morchana Brown'  },
    { id: 'MNB', label: 'Marine Black'    },
    { id: 'KGR', label: 'Kesariya Green'  },
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

  origin = [
    { id: 'IND', label: 'INDIA'   },
    { id: 'IRN', label: 'IRAN'    },
    { id: 'ITA', label: 'ITALY'   },
    { id: 'GRE', label: 'GREECE'  },
    { id: 'TUR', label: 'TURKEY'  },
    { id: 'BRZ', label: 'BRAZIL'  },
    { id: 'VTN', label: 'VIETNAM' },
    { id: 'AFR', label: 'AFRICA'  },
  ];

  material = [
    { id: 'MB',  label: 'MARBLE'     },
    { id: 'GR',  label: 'GRANITE'    },
    { id: 'QT',  label: 'QUARTZ'     },
    { id: 'QZT', label: 'QUARZITE'   },
    { id: 'ON',  label: 'ONYX'       },
    { id: 'TR',  label: 'TRAVENTINE' },
    { id: 'SS',  label: 'SANDSTONE'  },
  ];

  product = [
    { id: 'WW', label: 'WISPER WHITE'  },
    { id: 'LH', label: 'LAVENDER HAZE' },
    { id: 'DB', label: 'DUSKY BLOOM'   },
    { id: 'WR', label: 'WISPER RED'    },
    { id: 'SV', label: 'SILVER VIEL'   },
    { id: 'SE', label: 'SUN VIEL'      },
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
  closeDropdowns(): void {
    this.openDropdown = null;
  }

  // ── Form ───────────────────────────────────────

  public blockFormGroup!: FormGroup;

  // ── Lifecycle ──────────────────────────────────

  ngOnInit(): void {
    this.isMobile = this.platform.ANDROID || this.platform.IOS;
    const state = history.state as { formData?: Product };
    this.buildForm(state?.formData);

    // Restore user-typed suffix when editing an existing block
    if (state?.formData?.productCode) {
      const parts = state.formData.productCode.split('-');
      this.userBlockSuffix = parts[parts.length - 1];
    }

    if (state?.formData?.imageUrl) {
      this.productService.downloadImage(state.formData.imageUrl).subscribe(base64Image => {
        this.previewImg = base64Image;
        this.updatedImage = false;
      });
    }

    this.isUpdate = !!state?.formData;

    this.listenForBlockCodeChanges();

    const costFields = ['exFactoryCost', 'royaltyCost', 'freightCost'];
    costFields.forEach(field => {
      this.blockFormGroup.get(field)?.valueChanges.subscribe(() => {
        this.recalculateTotalCost();
      });
    });
  }

  ngOnDestroy(): void {
    this.blockCodeSub?.unsubscribe();
  }

  // ── Block code auto-generation ─────────────────

  /**
   * Returns the id of the item whose label matches, from the given array.
   * Handles both string and number ids — always returns a string.
   */
  private getIdByLabel(arr: { id: string | number; label: string }[], label: string): string {
    return String(arr.find(item => item.label === label)?.id || '');
  }

  private listenForBlockCodeChanges(): void {
    // startWith ensures combineLatest fires immediately even if only one field changes,
    // instead of waiting for all four to emit at least once.
    const origin$ = this.blockFormGroup.get('origin')!.valueChanges.pipe(
      startWith(this.blockFormGroup.get('origin')!.value)
    );
    const material$ = this.blockFormGroup.get('material')!.valueChanges.pipe(
      startWith(this.blockFormGroup.get('material')!.value)
    );
    const product$ = this.blockFormGroup.get('product')!.valueChanges.pipe(
      startWith(this.blockFormGroup.get('product')!.value)
    );
    const quality$ = this.blockFormGroup.get('productQuality')!.valueChanges.pipe(
      startWith(this.blockFormGroup.get('productQuality')!.value)
    );

    this.blockCodeSub = combineLatest([origin$, material$, product$, quality$])
      .pipe(debounceTime(100))
      .subscribe(([origin, material, product, quality]) => {
        this.updateBlockCode(origin, material, product, quality);
      });
  }

  private updateBlockCode(
    originLabel: string,
    materialLabel: string,
    productLabel: string,
    qualityLabel: string
  ): void {
    const originId   = this.getIdByLabel(this.origin,         originLabel   || '');
    const materialId = this.getIdByLabel(this.material,       materialLabel || '');
    const productId  = this.getIdByLabel(this.product,        productLabel  || '');
    const qualityId  = this.getIdByLabel(this.productQuality, qualityLabel  || '');

    const parts = [originId, materialId, productId, qualityId].filter(v => v.length > 0);
    const prefix = parts.join('-');
    const fullCode = this.userBlockSuffix
      ? `${prefix}-${this.userBlockSuffix}`
      : prefix;

    this.blockFormGroup.get('productCode')!.setValue(fullCode, { emitEvent: false });
  }

  /** Getter used in the template to show the auto-generated prefix separately */
  get autoPrefix(): string {
    const o = this.blockFormGroup?.get('origin')?.value;
    const m = this.blockFormGroup?.get('material')?.value;
    const p = this.blockFormGroup?.get('product')?.value;
    const q = this.blockFormGroup?.get('productQuality')?.value;

    return [
      this.getIdByLabel(this.origin,         o || ''),
      this.getIdByLabel(this.material,       m || ''),
      this.getIdByLabel(this.product,        p || ''),
      this.getIdByLabel(this.productQuality, q || ''),
    ].filter(v => v.length > 0).join('-');
  }

  onBlockSuffixInput(event: Event): void {
    this.userBlockSuffix = (event.target as HTMLInputElement).value;

    const o = this.blockFormGroup.get('origin')?.value;
    const m = this.blockFormGroup.get('material')?.value;
    const p = this.blockFormGroup.get('product')?.value;
    const q = this.blockFormGroup.get('productQuality')?.value;
    this.updateBlockCode(o, m, p, q);
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
   exFactoryCost:  new FormControl(data?.exFactoryCost  || ''),   // ← removed required
    royaltyCost:    new FormControl(data?.royaltyCost    || ''),   // ← removed required
    freightCost:    new FormControl(data?.freightCost    || ''),   // ← removed required
    inHouseCost:    new FormControl(data?.inHouseCost    || ''),
    sellingCost:    new FormControl(data?.sellingCost    || ''),   // ← removed required
      status:         new FormControl(data?.status         || '', Validators.required),
      remarks:        new FormControl(data?.description    || ''),
      origin:         new FormControl(data?.origin         || ''),
      material:       new FormControl(data?.material       || ''),
      product:        new FormControl(data?.product        || ''),
    });
  }

  // ── Save ───────────────────────────────────────

  saveBlockDetails(block: any): void {
    if (!block) return;
    this.submitted = true;

    if (this.previewImg === null) {
      this.toastService.showError('Please Add Image');
      return;
    }
    if (this.blockFormGroup.invalid) { return; }

    this.isSubmitting = true;
    const state = history.state as { formData?: Product };
    const existingImageUrl = state.formData?.imageUrl ?? '';

    if (this.updatedImage && this.previewImg) {
      this.productService.uploadImage(this.previewImg).subscribe({
        next: (imageUrl) => { this.saveBlock(block, imageUrl); },
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
      next: () => { this.afterSave(); },
      error: () => {
        this.isSubmitting = false;
        this.toastService.showError('Failed to save block details.');
      }
    });

  }

  private afterSave(): void {
    this.userBlockSuffix = '';
    this.buildForm();
    this.previewImg = null;
    this.toastService.showSuccess(
      this.isUpdate ? 'Block details updated successfully.' : 'Added new block successfully.'
    );
    this.isUpdate = false;
    this.isSubmitting = false;
    this.submitted = false;
  }

  prepareResponseObject(block: FormGroup, imgUrl: string) {
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
      imageUrl:       imgUrl,
      origin:         value.origin,
      material:       value.material,
      product:        value.product,
    };
  }

  // ── Image / Camera ─────────────────────────────

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = () => { this.previewImg = reader.result as string; };
      this.updatedImage = true;
      reader.readAsDataURL(input.files[0]);
    }
  }

  openCamera(): void {
    this.showCamera = true;
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      this.stream = stream;
      this.videoRef.nativeElement.srcObject = stream;
    }).catch(() => {
      alert('Camera access denied or unavailable.');
      this.showCamera = false;
    });
  }

  capturePhoto(): void {
    const video  = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    this.previewImg = canvas.toDataURL('image/png');
    this.stopCamera();
    this.showCamera   = false;
    this.updatedImage = true;
  }

  closeCamera(): void { this.stopCamera(); this.showCamera = false; }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}
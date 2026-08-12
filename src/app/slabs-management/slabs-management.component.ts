import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../services/product.service';
import { Product } from '../model/product';
import { SlabPieces } from '../model/slab-pieces';
import { SourceBlockDetails } from '../model/source-block-details';
import { ViewChild, ElementRef } from '@angular/core';
import { Platform } from '@angular/cdk/platform';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-slabs-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './slabs-management.component.html',
  styleUrl: './slabs-management.component.css'
})
export class SlabsManagementComponent implements OnInit, OnDestroy {

  // ── Forms ──────────────────────────────────────────────────────────────────
  public stockFormGroup!: FormGroup;
  slabPieceForm: FormGroup[] = [];
  slabPieces: SlabPieces[] = [];

  // ── State ──────────────────────────────────────────────────────────────────
  isMobile = false;
  isUpdate = false;
  isSubmitting = false;
  submitted = false;
  isDark = false;
  productId: any = null;
  blockData: Product | null = null;

  /**
   * This slab entry's own photo gallery — prefilled from the source block's
   * images when converting a block, but freely addable/removable here too
   * (unlike the per-piece photos in the SLAB ENTRY GRID, which are tied to
   * one specific slab piece).
   */
  slabImgPreviews: string[] = [];

  // ── Slab-gallery photo camera state (separate from the per-piece camera) ──
  showGalleryCamera = false;
  galleryCameraStream: MediaStream | null = null;
  @ViewChild('galleryVideo')  galleryVideoRef!:  ElementRef<HTMLVideoElement>;
  @ViewChild('galleryCanvas') galleryCanvasRef!: ElementRef<HTMLCanvasElement>;

  /**
   * Frozen snapshot of the source block, sent through to the saved slab as
   * `sourceBlock`. Built once from the pristine block data when converting;
   * carried forward unchanged when just editing an existing slab (whose
   * `formData` is the slab itself, not a block); left null for standalone
   * slabs. See ngOnInit / prepareResponseObject.
   */
  private sourceBlockSnapshot: SourceBlockDetails | null = null;

  // ── Slab-level photo modal state ───────────────────────────────────────────
  slabPhotoModalIndex: number | null = null;
  slabCameraStream: MediaStream | null = null;
  showSlabCamera = false;

  // ── ViewRefs (slab-level) ──────────────────────────────────────────────────
  @ViewChild('slabVideo')  slabVideoRef!:  ElementRef<HTMLVideoElement>;
  @ViewChild('slabCanvas') slabCanvasRef!: ElementRef<HTMLCanvasElement>;

  // ── Subscriptions ──────────────────────────────────────────────────────────
  private subs = new Subscription();

  // ── Lookup data ────────────────────────────────────────────────────────────
  goDownLocations = [
    { id: 1, label: 'Kishangarh' },
    { id: 2, label: 'Moradabad' },
    { id: 3, label: 'Banswara' }
  ];

  thicknessRange = [
    { id: 1, label: '10' }, { id: 2, label: '15' }, { id: 3, label: '20' },
    { id: 4, label: '25' }, { id: 5, label: '30' }
  ];

  finishesRange = [
    { id: 1,  label: 'Raw' },
    { id: 2,  label: 'Mirror Finish' },
    { id: 3,  label: 'Honed Finish' },
    { id: 4,  label: 'Hydro Finish' },
    { id: 5,  label: 'Epoxy Process' },
    { id: 6,  label: 'Filling Process' },
    { id: 7,  label: 'Mirror Epoxy Finish' },
    { id: 8,  label: 'Sand Blast' },
    { id: 9,  label: 'Fire Flame' },
    { id: 10, label: 'Leather Finish' }
  ];

  productQuality = [
    { id: 1, label: 'Banswara White' },
    { id: 2, label: 'Banswara Purple' },
    { id: 3, label: 'Torronto' },
    { id: 4, label: 'Traventine B.' },
    { id: 5, label: 'Kayampura' },
    { id: 6, label: 'Morchana Brown' },
    { id: 7, label: 'Marine Black' },
    { id: 8, label: 'Kesariya Green' }
  ];

  statusOption = [
    { id: 1, label: 'Available' },
    { id: 2, label: 'Hold' },
    { id: 3, label: 'Sold' }
  ];

  productOptions = [
    { id: 'WW', label: 'WISPER WHITE'  },
    { id: 'LH', label: 'LAVENDER HAZE' },
    { id: 'DB', label: 'DUSKY BLOOM'   },
    { id: 'WR', label: 'WISPER RED'    },
    { id: 'SV', label: 'SILVER VIEL'   },
    { id: 'SE', label: 'SUN VIEL'      },
  ];

  // ── Constructor ────────────────────────────────────────────────────────────
  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private platform: Platform,
    private toastService: ToastService,
    private cd: ChangeDetectorRef,
    private router: Router
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.isMobile = this.platform.ANDROID || this.platform.IOS;
    this.loadTheme();
    this.buildForm();

    const state = history.state as { formData?: Product };
    if (state?.formData) {
      this.blockData = state.formData;
      this.patchFormWithData(state.formData);
      this.productId = state.formData.id;
      this.isUpdate = true;

      if (state.formData.category?.toLowerCase() === 'block') {
        // Converting a block: freeze its details now, before this same
        // record gets overwritten with the slab's own on save.
        this.sourceBlockSnapshot = {
          blockCode:       state.formData.productCode      ?? '',
          godownLocation:  state.formData.godownLocation   ?? '',
          productQuality:  state.formData.productQuality   ?? '',
          productLength:   state.formData.productLength    ?? 0,
          productWidth:    state.formData.productWidth     ?? 0,
          productHeight:   state.formData.productHeight    ?? 0,
          productWeight:   state.formData.productWeight    ?? 0,
          status:          state.formData.status           ?? '',
          description:     state.formData.description      ?? '',
          imageUrl:        state.formData.imageUrl         ?? '',
          imageUrls:       state.formData.imageUrls        ?? [],
          convertedAt:     Date.now(),
        };
      } else {
        // Editing an already-converted slab: keep whatever snapshot it already has.
        this.sourceBlockSnapshot = state.formData.sourceBlock ?? null;
      }
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.stopSlabCamera();
    this.stopGalleryCamera();
  }

  // ── Theme ──────────────────────────────────────────────────────────────────
  loadTheme(): void {
    const saved = localStorage.getItem('slab-theme');
    this.isDark = saved === 'dark';
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    localStorage.setItem('slab-theme', this.isDark ? 'dark' : 'light');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  goBack(): void {
    this.router.navigate(['/search']);
  }

  // ── Form Build ─────────────────────────────────────────────────────────────
  // Fields mirrored in the BLOCK INFO card (productCode, productQuality,
  // productLength/productWidth) are intentionally optional — they only have
  // a source value when converting from a block, and a slab must be
  // addable standalone with no block behind it. godownLocation and quantity
  // are required regardless of standalone/converted origin. The cost fields
  // are optional for the same reason as above: they're only ever populated
  // by copying the source block's own costing (see patchFormWithData) —
  // there is no input UI for them, so requiring them made standalone entry
  // impossible.
  buildForm(): void {
    this.stockFormGroup = new FormGroup({
      productCode:       new FormControl(''),
      slabNumber:        new FormControl(''),
      godownLocation:    new FormControl('', Validators.required),
      productQuality:    new FormControl(''),
      productFinished:   new FormControl('', Validators.required),
      productLength:     new FormControl(''),
      productWidth:      new FormControl(''),
      productThickness:  new FormControl('', Validators.required),
      quantity:          new FormControl(0, [Validators.required, Validators.min(1)]),
      exFactoryCost:     new FormControl(''),
      miscellaneousCost: new FormControl(''),
      freightCost:       new FormControl(''),
      inHouseCost:       new FormControl(''),
      sellingCost:       new FormControl(''),
      status:            new FormControl('Available', Validators.required),
      product:           new FormControl(''),
      remark:            new FormControl(''),
      size:              new FormControl('')
    });
  }

  // ── Computed getters ───────────────────────────────────────────────────────
  get totalCostPerSqft(): number {
    const f = this.stockFormGroup?.value;
    if (!f) return 0;
    return (parseFloat(f.exFactoryCost)     || 0)
         + (parseFloat(f.freightCost)        || 0)
         + (parseFloat(f.miscellaneousCost)  || 0)
         + (parseFloat(f.inHouseCost)        || 0)
         + (parseFloat(f.sellingCost)        || 0);
  }

  /** Sqft from the SLAB ENTRY GRID pieces only (each row's own L × W). */
  get totalSlabSqft(): number {
    return this.slabPieces.reduce((sum, p) => sum + (p.totalArea || 0), 0);
  }

  /**
   * Real-time per-slab sqft from the SLAB DETAILS "Size L × W" fields —
   * same (L × W) / 144 formula used per-row in the SLAB ENTRY GRID
   * (see calculateSlabArea). Recomputed on every change-detection pass, so
   * it stays live as the user types.
   */
  get sizeSqft(): number {
    const length = parseFloat(this.stockFormGroup?.get('productLength')?.value) || 0;
    const width  = parseFloat(this.stockFormGroup?.get('productWidth')?.value)  || 0;
    return Math.round((length * width / 144) * 100) / 100;
  }

  /** sizeSqft scaled by Quantity — the grid has no single quantity to multiply by, this does. */
  get sizeTotalSqft(): number {
    return Math.round((this.sizeSqft * this.totalSlabCount) * 100) / 100;
  }

  /**
   * Combined sqft across both entry methods: individually-measured grid
   * pieces plus the uniform Size L × W × Quantity shortcut. A slab entry
   * only ever uses one of the two in practice, so whichever is untouched
   * contributes 0 and this just reflects the one actually filled in.
   */
  get combinedTotalSqft(): number {
    return Math.round((this.totalSlabSqft + this.sizeTotalSqft) * 100) / 100;
  }

  /** Quantity is the authoritative slab count now that it's directly editable, falling back to the grid's row count only if left blank. */
  get totalSlabCount(): number {
    const quantity = parseInt(this.stockFormGroup?.get('quantity')?.value, 10) || 0;
    return quantity > 0 ? quantity : this.slabPieces.length;
  }

  get avgSlabSize(): number {
    if (!this.totalSlabCount) return 0;
    return this.combinedTotalSqft / this.totalSlabCount;
  }

  /** The source block's own remark, kept read-only and separate from the slab's own remark. */
  get blockRemark(): string {
    return this.blockData?.description ?? '';
  }

  get totalBlockCost(): number {
    if (!this.blockData) return 0;
    return (parseFloat(this.blockData.exFactoryCost as any)    || 0)
         + (parseFloat(this.blockData.freightCost as any)       || 0)
         + (parseFloat(this.blockData.miscellaneousCost as any) || 0);
  }

  // ── Patch ──────────────────────────────────────────────────────────────────
  private patchFormWithData(formData?: Product): void {
    if (!formData) return;

    this.stockFormGroup.patchValue({
      productCode:       formData.productCode      ?? '',
      slabNumber:        formData.slabNumber       ?? '',
      godownLocation:    formData.godownLocation   ?? '',
      productQuality:    formData.productQuality   ?? '',
      productFinished:   formData.productFinished  ?? '',
      productLength:     formData.productLength    ?? '',
      productWidth:      formData.productWidth     ?? '',
      productThickness:  formData.productThickness ?? '',
      quantity:          formData.quantity         ?? '',
      exFactoryCost:     formData.exFactoryCost    ?? '',
      miscellaneousCost: formData.miscellaneousCost ?? '',
      freightCost:       formData.freightCost      ?? '',
      inHouseCost:       formData.inHouseCost      ?? '',
      sellingCost:       formData.sellingCost      ?? '',
      // A block converted out of "Process" becomes a fresh, sellable slab —
      // default it to "Available" rather than silently carrying the block's
      // Process status forward (which isn't even a selectable status here).
      status:            formData.status?.toLowerCase() === 'process' ? 'Available' : (formData.status || 'Available'),
      product:           formData.product          ?? ''
      // remark is intentionally left blank — it's the slab's own remark,
      // kept separate from the block's remark (shown read-only in BLOCK INFO
      // and re-joined with a separator only at save time; see prepareResponseObject).
    });

    this.slabPieces = Array.isArray(formData.pieces) ? [...formData.pieces] : [];
    this.slabPieceForm = this.slabPieces.map(item =>
      this.fb.group({
        id:          [item.id],
        length:      [item.length],
        width:       [item.width],
        lessLength:  [item.lessLength],
        lessWidth:   [item.lessWidth],
        totalArea:   [item.totalArea],
        editable:    [item.editable],
        remark:      [item.remark],
        imageBase64: [item.imageBase64 ?? ''],
        imageUrl:    [item.imageUrl    ?? '']
      })
    );

    this.slabImgPreviews = formData.imageUrls?.length
      ? [...formData.imageUrls]
      : formData.imageUrl ? [formData.imageUrl] : [];
    // Quantity was already patched above from the saved product — don't
    // call syncQuantity() here, it would overwrite that with the grid's
    // current row count (0 for a standalone slab with no grid pieces),
    // wiping out the saved value the moment you open it for edit.
    this.cd.detectChanges();
  }

  // ── Slab area calc ─────────────────────────────────────────────────────────
  calculateTotalSlabSize(): void {
    const area = this.slabPieces.reduce((sum, piece) => sum + (piece.totalArea || 0), 0);
    this.stockFormGroup.get('size')?.setValue(area);
  }

  // ── Quantity auto-sync (mirrors number of slab pieces added) ───────────────
  private syncQuantity(): void {
    this.stockFormGroup.get('quantity')?.setValue(this.slabPieces.length);
  }

  calculateSlabArea(index: number): void {
    const group      = this.slabPieceForm[index] as FormGroup;
    const length     = parseFloat(group.value.length)     || 0;
    const width      = parseFloat(group.value.width)      || 0;
    const lessLength = parseFloat(group.value.lessLength) || 0;
    const lessWidth  = parseFloat(group.value.lessWidth)  || 0;
    const rawArea = (length * width) - (lessLength * lessWidth);
    const totalSlabSize = Math.round((rawArea / 144) * 100) / 100;
    group.patchValue({ totalArea: totalSlabSize, editable: false });
  }

  // ── Row CRUD ───────────────────────────────────────────────────────────────
  addNewRow(): void {
    const newId = this.slabPieces.length > 0
      ? this.slabPieces[this.slabPieces.length - 1].id + 1
      : 1;
    const newSlab    = new SlabPieces();
    newSlab.id       = newId;
    newSlab.editable = true;
    this.slabPieces.push(newSlab);
    this.slabPieceForm.push(this.fb.group({
      id:          new FormControl(newSlab.id),
      length:      new FormControl(newSlab.length),
      width:       new FormControl(newSlab.width),
      lessLength:  new FormControl(newSlab.lessLength),
      lessWidth:   new FormControl(newSlab.lessWidth),
      totalArea:   new FormControl(newSlab.totalArea),
      editable:    new FormControl(true),
      remark:      new FormControl(newSlab.remark),
      imageBase64: new FormControl(''),
      imageUrl:    new FormControl('')
    }));
    this.syncQuantity();
  }

  editSlabPiece(index: number): void {
    this.slabPieceForm[index].patchValue({ editable: true });
  }

  saveSlabPiece(index: number): void {
    this.calculateSlabArea(index);
    this.slabPieces[index] = { ...this.slabPieceForm[index].value };
    this.calculateTotalSlabSize();
  }

  cancelEdit(index: number): void {
    this.slabPieceForm[index].patchValue({ ...this.slabPieces[index], editable: false });
    this.calculateTotalSlabSize();
  }

  deleteSlabPiece(index: number): void {
    this.slabPieces.splice(index, 1);
    this.slabPieceForm.splice(index, 1);
    this.calculateTotalSlabSize();
    this.syncQuantity();
  }

  /**
   * Commit whatever is currently typed into every grid row into `slabPieces`,
   * regardless of whether that row's own checkmark (saveSlabPiece) was ever
   * clicked. Without this, an in-progress row's values are silently dropped
   * on submit — the user shouldn't have to individually lock every row
   * before saving the overall slab entry.
   */
  private syncAllSlabPieces(): void {
    this.slabPieceForm.forEach((_, i) => {
      this.calculateSlabArea(i);
      this.slabPieces[i] = { ...this.slabPieceForm[i].value };
    });
    this.calculateTotalSlabSize();
  }

  // ── Slab-level photo modal ─────────────────────────────────────────────────
  openSlabPhotoModal(index: number): void {
    this.slabPhotoModalIndex = index;
    this.showSlabCamera      = false;
  }

  closeSlabPhotoModal(): void {
    this.stopSlabCamera();
    this.slabPhotoModalIndex = null;
    this.showSlabCamera      = false;
  }

  openSlabCamera(): void {
    this.showSlabCamera = true;
    // Small delay to let *ngIf render the <video> element first
    setTimeout(() => {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          this.slabCameraStream = stream;
          this.slabVideoRef.nativeElement.srcObject = stream;
        })
        .catch(() => {
          this.toastService.showError('Camera access denied or unavailable.');
          this.showSlabCamera = false;
        });
    }, 100);
  }

  captureSlabPhoto(): void {
    const video  = this.slabVideoRef.nativeElement;
    const canvas = this.slabCanvasRef.nativeElement;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    this.setSlabImage(base64);
    this.stopSlabCamera();
    this.showSlabCamera = false;
  }

  stopSlabCamera(): void {
    if (this.slabCameraStream) {
      this.slabCameraStream.getTracks().forEach(t => t.stop());
      this.slabCameraStream = null;
    }
  }

  onSlabImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        this.setSlabImage(reader.result as string);
        input.value = '';   // allow re-selecting the same file
        this.cd.detectChanges();
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  removeSlabImage(index: number): void {
    this.slabPieceForm[index].patchValue({ imageBase64: '', imageUrl: '' });
    this.slabPieces[index].imageBase64 = '';
    this.slabPieces[index].imageUrl    = '';
  }

  // ── Slab-entry photo gallery (multiple images, mirrors add-block) ──────────
  onGalleryImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          this.slabImgPreviews.push(reader.result as string);
          this.cd.detectChanges();
        };
        reader.readAsDataURL(file);
      });
      input.value = '';
    }
  }

  removeGalleryImage(index: number): void {
    this.slabImgPreviews.splice(index, 1);
  }

  openGalleryCamera(): void {
    this.showGalleryCamera = true;
    // Small delay to let *ngIf render the <video> element first
    setTimeout(() => {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          this.galleryCameraStream = stream;
          this.galleryVideoRef.nativeElement.srcObject = stream;
        })
        .catch(() => {
          this.toastService.showError('Camera access denied or unavailable.');
          this.showGalleryCamera = false;
        });
    }, 100);
  }

  captureGalleryPhoto(): void {
    const video  = this.galleryVideoRef.nativeElement;
    const canvas = this.galleryCanvasRef.nativeElement;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    this.slabImgPreviews.push(canvas.toDataURL('image/jpeg', 0.85));
    this.closeGalleryCamera();
  }

  closeGalleryCamera(): void {
    this.stopGalleryCamera();
    this.showGalleryCamera = false;
  }

  stopGalleryCamera(): void {
    if (this.galleryCameraStream) {
      this.galleryCameraStream.getTracks().forEach(t => t.stop());
      this.galleryCameraStream = null;
    }
  }

  private setSlabImage(base64: string): void {
    const i = this.slabPhotoModalIndex;
    if (i === null) return;
    this.slabPieceForm[i].patchValue({ imageBase64: base64 });
    this.slabPieces[i].imageBase64 = base64;
    this.closeSlabPhotoModal();
    this.cd.detectChanges();
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  saveSlabDetails(slabForm: any): void {
    if (!slabForm) return;
    this.submitted = true;

    if (this.stockFormGroup.invalid) return;

    this.syncAllSlabPieces();

    this.isSubmitting = true;
    history.replaceState({}, document.title);

    this.uploadGalleryImages().then(urls => {
      this.saveSlab(slabForm, urls);
    }).catch(() => {
      this.isSubmitting = false;
      this.toastService.showError('Image upload failed.');
    });
  }

  private async uploadGalleryImages(): Promise<string[]> {
    const urls: string[] = [];
    for (const img of this.slabImgPreviews) {
      if (img.startsWith('data:')) {
        const url = await firstValueFrom(this.productService.uploadImage(img));
        urls.push(url);
      } else {
        urls.push(img);
      }
    }
    return urls;
  }

  private saveSlab(slabForm: any, imageUrls: string[]): void {
    const sub = this.productService
      .postApiCall(this.prepareResponseObject(slabForm, imageUrls))
      .subscribe({
        next:  () => this.afterSave(),
        error: (err) => {
          this.isSubmitting = false;
          const duplicateMsg = err?.status === 409 && typeof err.error === 'string' ? err.error : null;
          this.toastService.showError(duplicateMsg || 'Failed to save slab details.');
        }
      });
    this.subs.add(sub);
  }

  private afterSave(): void {
    this.buildForm();
    this.slabPieces       = [];
    this.slabPieceForm    = [];
    this.blockData        = null;
    this.slabImgPreviews  = [];
    this.sourceBlockSnapshot = null;
    this.toastService.showSuccess(
      this.isUpdate ? 'Slab updated successfully.' : 'New slab added successfully.'
    );
    this.isUpdate    = false;
    this.isSubmitting = false;
    this.submitted   = false;
  }

  /**
   * Block and slab remarks are kept as separate concepts in the UI, but the
   * Product model only has one `description` field — so they're joined here
   * with a separator (matching the " | " convention already used elsewhere
   * in this app's remark history) rather than adding a new model field.
   */
  private combinedRemark(slabRemark: string): string {
    const blockPart = this.blockRemark.trim();
    const slabPart = (slabRemark || '').trim();
    return [blockPart, slabPart].filter(Boolean).join(' | ');
  }

  prepareResponseObject(slab: any, imageUrls: string[]): any {
    if (this.productId != null) slab.value.id = this.productId;
    return {
      id:                slab.value.id,
      category:          'Slab',
      productCode:       slab.value.productCode,
      slabNumber:        slab.value.slabNumber,
      godownLocation:    slab.value.godownLocation,
      productQuality:    slab.value.productQuality,
      productFinished:   slab.value.productFinished,
      productLength:     parseFloat(slab.value.productLength) || 0,
      productWidth:      parseFloat(slab.value.productWidth)  || 0,
      productThickness:  parseFloat(slab.value.productThickness),
      quantity:          parseInt(slab.value.quantity),
      size:              this.combinedTotalSqft,
      exFactoryCost:     parseFloat(slab.value.exFactoryCost)     || 0,
      miscellaneousCost: parseFloat(slab.value.miscellaneousCost) || 0,
      freightCost:       parseFloat(slab.value.freightCost)       || 0,
      inHouseCost:       parseFloat(slab.value.inHouseCost)       || 0,
      sellingCost:       parseFloat(slab.value.sellingCost)       || 0,
      status:            slab.value.status,
      product:           slab.value.product,
      description:       this.combinedRemark(slab.value.remark),
      pieces:            this.slabPieces,
      imageUrl:          imageUrls[0] || '',
      imageUrls:         imageUrls,
      sourceBlock:       this.sourceBlockSnapshot
    };
  }

}
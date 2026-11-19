import { CommonModule, Location } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ProductService } from '../services/product.service';
import { Product } from '../model/product';
import { SlabPieces } from '../model/slab-pieces';
import { SourceBlockDetails } from '../model/source-block-details';
import { ViewChild, ElementRef } from '@angular/core';
import { Platform } from '@angular/cdk/platform';
import { ToastService } from '../services/toast.service';
import { Subscription, firstValueFrom } from 'rxjs';
import { COLLECTION_SHORT_CODE_MAP, COUNTRY_SHORT_CODE_MAP, STONE_FAMILY_SHORT_CODE_MAP, abbreviate } from '../model/catalogue-options';
import { CatalogueLookupService } from '../services/catalogue-lookup.service';

/** One Marble Master entry — fields needed to build the abbreviated slab code. */
interface CatalogueMarble {
  id: string;
  itemCode: string;
  collectionName?: string;
  stoneFamily: string;
  country: string;
  color?: string;
  alternateTradeName?: string;
  /** 2-char code entered manually on the catalogue entry — see Add Marble Master. */
  alternateTradeNameAbbreviation?: string;
}

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
  /** True only when this entry is an in-progress Block→Slab conversion — distinguishes that from editing an already-standalone slab, so the left-panel summary (and header) show the right source. */
  isConvertingBlock = false;

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

  // ── Image zoom viewer state (gallery photos + per-slab grid photos) ───────
  zoomImageSrc: string | null = null;
  zoomScale = 1;
  zoomTranslateX = 0;
  zoomTranslateY = 0;
  private zoomDragging = false;
  private zoomDragStart = { x: 0, y: 0 };
  private readonly ZOOM_MIN = 1;
  private readonly ZOOM_MAX = 5;
  private readonly ZOOM_STEP = 0.5;
  // Touch-specific: pinch-to-zoom + double-tap detection (mouse events don't fire on touch devices)
  private isPinching = false;
  private pinchStartDist = 0;
  private pinchStartScale = 1;
  private lastTapTime = 0;

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

  statusOption = [
    { id: 1, label: 'Available' },
    { id: 2, label: 'Hold' },
    { id: 3, label: 'Sold' }
  ];

  // ── Marble type (Marble Master) ─────────────────────────────────────────────
  catalogueMarbles: CatalogueMarble[] = [];
  selectedMarble: CatalogueMarble | null = null;
  isLoadingMarbleTypes = false;

  // ── Constructor ────────────────────────────────────────────────────────────
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private productService: ProductService,
    private platform: Platform,
    private toastService: ToastService,
    private cd: ChangeDetectorRef,
    private catalogueLookup: CatalogueLookupService,
    private location: Location,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.isMobile = this.platform.ANDROID || this.platform.IOS;
    this.loadTheme();
    this.buildForm();
    this.catalogueLookup.ensureLoaded();
    const marbleTypesLoaded = this.loadMarbleTypeOptions();

    const state = history.state as { formData?: Product };
    let convertingBlock = false;

    if (state?.formData) {
      this.blockData = state.formData;
      this.patchFormWithData(state.formData);
      this.productId = state.formData.id;
      this.isUpdate = true;

      if (state.formData.category?.toLowerCase() === 'block') {
        convertingBlock = true;
        this.isConvertingBlock = true;
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

    // Pre-select the Marble Type dropdown whenever there's a linked catalogue
    // entry to match — both when converting a block AND when editing an
    // existing slab. Only RECOMPUTE the generated code when converting a
    // fresh block, though — an existing slab's already-saved slabNumber
    // (already patched above) must never be overwritten out from under it.
    if (state?.formData?.catalogueItemId) {
      marbleTypesLoaded.then(() => {
        // Deferred a tick past the *ngFor that just rendered catalogueMarbles'
        // <option> elements — setting the <select>'s bound value in the very
        // same cycle those options are created can lose the selection, since
        // the browser has nothing to match it against yet.
        setTimeout(() => this.preselectMarbleFromSource(state.formData!, convertingBlock));
      });
    }
  }

  /**
   * Pre-selects the Marble Master entry a slab/block was already linked to
   * (via catalogueItemId) — so Marble Type opens already matching it. The
   * generated Slab Code is only recomputed from it (`recomputeCode`) when
   * converting a fresh block; an existing slab's own saved code is left
   * exactly as patched. The dropdown and the code stay fully editable
   * afterward either way, this just seeds them.
   */
  private preselectMarbleFromSource(formData: Product, recomputeCode: boolean): void {
    if (!formData.catalogueItemId) return;
    this.selectedMarble = this.catalogueMarbles.find(m => m.id === formData.catalogueItemId) ?? null;
    if (this.selectedMarble && recomputeCode) this.updateSlabNumber();
    this.cd.detectChanges();
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
    this.location.back();
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
      slabNumberInput:   new FormControl(''),
      /** Computed from the selected marble's codes + slabNumberInput — see updateSlabNumber(). */
      slabNumber:        new FormControl(''),
      godownLocation:    new FormControl('', Validators.required),
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
      remark:            new FormControl(''),
      size:              new FormControl('')
    });
  }

  /** Fetches every Marble Master entry to populate the Marble Type dropdown. */
  private async loadMarbleTypeOptions(): Promise<void> {
    this.isLoadingMarbleTypes = true;
    try {
      this.catalogueMarbles = await firstValueFrom(
        this.http.get<CatalogueMarble[]>('https://setu-crm.onrender.com/catalogue/all')
      );
    } catch {
      this.toastService.showError('Could not load marble types from catalogue.');
    } finally {
      this.isLoadingMarbleTypes = false;
    }
  }

  onMarbleSelected(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.selectedMarble = this.catalogueMarbles.find(m => m.id === id) ?? null;
    this.updateSlabNumber();
  }

  /**
   * Recomputes the final Slab Number as
   * collection-color-stoneFamily-country-tradeNameAbbreviation-slabNumber —
   * same order as Marble Master's own Product Code (see
   * add-catalogue.component.ts's generatedItemCode), so the two stay
   * consistent. Every segment is 2 characters by default — the
   * *_SHORT_CODE_MAP lookups already resolve same-category collisions up
   * to 3 characters (see toShortCodeMap in catalogue-options.ts); color has
   * no fixed code list, so it uses the shared 2-char abbreviation
   * algorithm, and trade name uses the abbreviation entered manually on
   * the catalogue entry itself (see Add Marble Master), falling back to
   * the same algorithm if that entry predates the field. Blank segments
   * are dropped so an incomplete marble entry doesn't produce stray
   * dashes.
   */
  updateSlabNumber(): void {
    const marble = this.selectedMarble;
    const number = (this.stockFormGroup.get('slabNumberInput')?.value || '').toString().trim();

    if (!marble) {
      this.stockFormGroup.get('slabNumber')?.setValue(number, { emitEvent: false });
      return;
    }

    const parts = [
      COLLECTION_SHORT_CODE_MAP[marble.collectionName || ''] || abbreviate(marble.collectionName),
      abbreviate(marble.color),
      STONE_FAMILY_SHORT_CODE_MAP[marble.stoneFamily] || abbreviate(marble.stoneFamily),
      COUNTRY_SHORT_CODE_MAP[marble.country] || abbreviate(marble.country),
      marble.alternateTradeNameAbbreviation || abbreviate(marble.alternateTradeName),
      number
    ].filter(Boolean);

    this.stockFormGroup.get('slabNumber')?.setValue(parts.join('-'), { emitEvent: false });
  }

  /**
   * BLOCK INFO always stays on screen, but only actually shows the source
   * block's details while a conversion is genuinely in progress — editing a
   * standalone (or already-converted) slab has no block behind it, so every
   * row there just reads blank instead of borrowing the slab's own values.
   */
  get blockInfoSource(): Product | null {
    return this.isConvertingBlock ? this.blockData : null;
  }

  get blockInfoStoneType(): string {
    return this.blockInfoSource ? this.catalogueLookup.stoneType(this.blockInfoSource) : '—';
  }

  get blockInfoRemark(): string {
    return this.blockInfoSource?.description ?? '';
  }

  /**
   * Header title: the block's own code while converting it ("LUN-...-666"),
   * this slab's own code + " Edit" when editing an existing standalone/
   * already-converted slab, or "New Entry" for a genuinely fresh one.
   */
  get headerTitle(): string {
    if (this.isConvertingBlock) return this.blockData?.productCode || 'New Entry';
    if (this.isUpdate) {
      const code = this.blockData?.slabNumber || this.stockFormGroup.get('slabNumber')?.value;
      return code ? `${code} Edit` : 'Edit';
    }
    return 'New Entry';
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

  /** Piece count represented by the SLAB ENTRY GRID — one row is one physical piece (see copySlabPiece for fast entry of same-size pieces without collapsing them into a single ambiguous count). */
  get gridPieceCount(): number {
    return this.slabPieces.length;
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

  /**
   * "Overall Sqft" — driven entirely by SLAB DETAILS (Size L × W × Quantity),
   * independent of whatever is in the SLAB ENTRY GRID. See [[gridPieceCount]]
   * / totalSlabSqft for the grid's own, separately-tracked total.
   */
  get sizeTotalSqft(): number {
    return Math.round((this.sizeSqft * this.totalSlabCount) * 100) / 100;
  }

  /** Quantity is the authoritative slab count, entered directly in SLAB DETAILS — the grid never writes back into it. Falls back to the grid's piece count only if left blank. */
  get totalSlabCount(): number {
    const quantity = parseInt(this.stockFormGroup?.get('quantity')?.value, 10) || 0;
    return quantity > 0 ? quantity : this.gridPieceCount;
  }

  get avgSlabSize(): number {
    if (!this.totalSlabCount) return 0;
    return this.sizeTotalSqft / this.totalSlabCount;
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
      // The small "Slab Code" suffix box has no field of its own on the
      // backend — only the final combined slabNumber is saved. On edit,
      // seed it with that code's own last "-"-separated segment, so it
      // isn't just blank even though it won't exactly reconstruct the
      // original suffix typed when the slab was first built.
      slabNumberInput:   formData.slabNumber ? formData.slabNumber.split('-').pop() : '',
      godownLocation:    formData.godownLocation   ?? '',
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
      status:            formData.status?.toLowerCase() === 'process' ? 'Available' : (formData.status || 'Available')
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
    // Quantity was already patched above from the saved product — the grid
    // never writes back into it, so nothing to reconcile here.
    this.cd.detectChanges();
  }

  // ── Slab area calc ─────────────────────────────────────────────────────────
  calculateTotalSlabSize(): void {
    const area = this.slabPieces.reduce((sum, piece) => sum + (piece.totalArea || 0), 0);
    this.stockFormGroup.get('size')?.setValue(area);
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

  /**
   * SLAB DETAILS' own Quantity value — used only as a soft cap on how many
   * rows the grid can hold, since the grid can never legitimately claim
   * more physical pieces than the declared total. 0 means "not set", i.e.
   * no cap yet.
   */
  get slabDetailsQuantity(): number {
    return parseInt(this.stockFormGroup?.get('quantity')?.value, 10) || 0;
  }

  /** True once the grid already has one row per piece declared in slabDetailsQuantity — drives disabling "Add Slab" / "Copy". */
  get isGridRowCapReached(): boolean {
    return this.slabDetailsQuantity > 0 && this.slabPieceForm.length >= this.slabDetailsQuantity;
  }

  /** False only when slabDetailsQuantity is set AND the grid's row count doesn't match it — drives the sync indicator's warning state. */
  get isGridQtyInSync(): boolean {
    return this.slabDetailsQuantity <= 0 || this.slabPieceForm.length === this.slabDetailsQuantity;
  }

  private warnIfRowCapReached(): boolean {
    if (!this.isGridRowCapReached) return false;
    this.toastService.showError(
      `All ${this.slabDetailsQuantity} pieces from Slab Details Quantity are already in the grid. Increase Quantity in Slab Details to add more rows.`
    );
    return true;
  }

  // ── Row CRUD ───────────────────────────────────────────────────────────────
  addNewRow(): void {
    if (this.warnIfRowCapReached()) return;

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
  }

  /**
   * Copies another row's Length/Width/Less/Remark straight into a brand new
   * row — the fast path for "50 of these came out the same size" without
   * collapsing them into one ambiguous count. Each copy is still its own
   * row with its own ID, remark and photo, so every physical piece stays
   * individually identifiable, editable and traceable back to which
   * measurement it came from.
   */
  copySlabPiece(index: number): void {
    if (this.warnIfRowCapReached()) return;

    const source = this.slabPieceForm[index].value;
    const newId = this.slabPieces.length > 0
      ? this.slabPieces[this.slabPieces.length - 1].id + 1
      : 1;

    const newSlab      = new SlabPieces();
    newSlab.id         = newId;
    newSlab.length     = source.length;
    newSlab.width      = source.width;
    newSlab.lessLength = source.lessLength;
    newSlab.lessWidth  = source.lessWidth;
    newSlab.remark     = source.remark;
    newSlab.editable   = false;
    const rawArea = (Number(newSlab.length) * Number(newSlab.width)) - (Number(newSlab.lessLength) * Number(newSlab.lessWidth));
    newSlab.totalArea  = Math.round((rawArea / 144) * 100) / 100;

    this.slabPieces.push(newSlab);
    this.slabPieceForm.push(this.fb.group({
      id:          new FormControl(newSlab.id),
      length:      new FormControl(newSlab.length),
      width:       new FormControl(newSlab.width),
      lessLength:  new FormControl(newSlab.lessLength),
      lessWidth:   new FormControl(newSlab.lessWidth),
      totalArea:   new FormControl(newSlab.totalArea),
      editable:    new FormControl(false),
      remark:      new FormControl(newSlab.remark),
      imageBase64: new FormControl(''),
      imageUrl:    new FormControl('')
    }));
    this.calculateTotalSlabSize();
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

  // ── Image zoom viewer ───────────────────────────────────────────────────────
  openImageZoom(src: string | null | undefined): void {
    if (!src) return;
    this.zoomImageSrc = src;
    this.resetZoom();
  }

  closeImageZoom(): void {
    this.zoomImageSrc = null;
    this.resetZoom();
  }

  private resetZoom(): void {
    this.zoomScale = 1;
    this.zoomTranslateX = 0;
    this.zoomTranslateY = 0;
    this.zoomDragging = false;
  }

  zoomIn(): void {
    this.zoomScale = Math.min(this.zoomScale + this.ZOOM_STEP, this.ZOOM_MAX);
  }

  zoomOut(): void {
    this.zoomScale = Math.max(this.zoomScale - this.ZOOM_STEP, this.ZOOM_MIN);
    if (this.zoomScale === this.ZOOM_MIN) { this.zoomTranslateX = 0; this.zoomTranslateY = 0; }
  }

  onZoomWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY < 0 ? this.ZOOM_STEP : -this.ZOOM_STEP;
    this.zoomScale = Math.min(Math.max(this.zoomScale + delta, this.ZOOM_MIN), this.ZOOM_MAX);
    if (this.zoomScale === this.ZOOM_MIN) { this.zoomTranslateX = 0; this.zoomTranslateY = 0; }
  }

  /** Double-click/tap toggles between fit and a fixed zoomed-in level. */
  onZoomDoubleClick(): void {
    this.zoomScale = this.zoomScale > this.ZOOM_MIN ? this.ZOOM_MIN : 2.5;
    if (this.zoomScale === this.ZOOM_MIN) { this.zoomTranslateX = 0; this.zoomTranslateY = 0; }
  }

  onZoomDragStart(event: MouseEvent): void {
    if (this.zoomScale <= this.ZOOM_MIN) return;
    event.preventDefault();
    this.zoomDragging = true;
    this.zoomDragStart = { x: event.clientX - this.zoomTranslateX, y: event.clientY - this.zoomTranslateY };
  }

  onZoomDragMove(event: MouseEvent): void {
    if (!this.zoomDragging) return;
    this.zoomTranslateX = event.clientX - this.zoomDragStart.x;
    this.zoomTranslateY = event.clientY - this.zoomDragStart.y;
  }

  onZoomDragEnd(): void {
    this.zoomDragging = false;
  }

  // ── Touch support (pinch-to-zoom, single-finger pan, double-tap) ──────────
  onZoomTouchStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      this.isPinching   = true;
      this.zoomDragging = false;
      this.pinchStartDist  = this.touchDistance(event.touches);
      this.pinchStartScale = this.zoomScale;
      return;
    }

    if (event.touches.length === 1) {
      const now = Date.now();
      if (now - this.lastTapTime < 300) {
        this.lastTapTime = 0;
        this.onZoomDoubleClick();
        return;
      }
      this.lastTapTime = now;

      if (this.zoomScale > this.ZOOM_MIN) {
        this.zoomDragging = true;
        const t = event.touches[0];
        this.zoomDragStart = { x: t.clientX - this.zoomTranslateX, y: t.clientY - this.zoomTranslateY };
      }
    }
  }

  onZoomTouchMove(event: TouchEvent): void {
    if (this.isPinching && event.touches.length === 2) {
      event.preventDefault();
      const dist  = this.touchDistance(event.touches);
      const ratio = dist / (this.pinchStartDist || 1);
      this.zoomScale = Math.min(Math.max(this.pinchStartScale * ratio, this.ZOOM_MIN), this.ZOOM_MAX);
      if (this.zoomScale === this.ZOOM_MIN) { this.zoomTranslateX = 0; this.zoomTranslateY = 0; }
      return;
    }

    if (this.zoomDragging && event.touches.length === 1) {
      event.preventDefault();
      const t = event.touches[0];
      this.zoomTranslateX = t.clientX - this.zoomDragStart.x;
      this.zoomTranslateY = t.clientY - this.zoomDragStart.y;
    }
  }

  onZoomTouchEnd(event: TouchEvent): void {
    if (event.touches.length < 2) this.isPinching = false;
    if (event.touches.length === 0) this.zoomDragging = false;
  }

  private touchDistance(touches: TouchList): number {
    const a = touches[0], b = touches[1];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
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

    // Guards against the grid drifting out of sync with Slab Details'
    // Quantity — e.g. Quantity was lowered after the grid already had more
    // rows, which the row cap alone doesn't catch retroactively.
    if (this.slabDetailsQuantity > 0 && this.gridPieceCount > this.slabDetailsQuantity) {
      this.toastService.showError(
        `Slab Entry Grid has ${this.gridPieceCount} rows, which is more than the Quantity (${this.slabDetailsQuantity}) in Slab Details. Remove a row or increase Quantity before saving.`
      );
      return;
    }

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
    this.selectedMarble   = null;
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
      productFinished:   slab.value.productFinished,
      productLength:     parseFloat(slab.value.productLength) || 0,
      productWidth:      parseFloat(slab.value.productWidth)  || 0,
      productThickness:  parseFloat(slab.value.productThickness),
      quantity:          parseInt(slab.value.quantity),
      size:              this.sizeTotalSqft,
      gridQuantity:      this.gridPieceCount,
      gridSqft:          this.totalSlabSqft,
      exFactoryCost:     parseFloat(slab.value.exFactoryCost)     || 0,
      miscellaneousCost: parseFloat(slab.value.miscellaneousCost) || 0,
      freightCost:       parseFloat(slab.value.freightCost)       || 0,
      inHouseCost:       parseFloat(slab.value.inHouseCost)       || 0,
      sellingCost:       parseFloat(slab.value.sellingCost)       || 0,
      status:            slab.value.status,
      description:       this.combinedRemark(slab.value.remark),
      // Links this slab back to the Marble Master entry it was created from,
      // so the backend can fill in product/material from it (see comment on
      // the removed Product/Material fields in this form).
      catalogueItemId:   this.selectedMarble?.id || '',
      pieces:            this.slabPieces,
      imageUrl:          imageUrls[0] || '',
      imageUrls:         imageUrls,
      sourceBlock:       this.sourceBlockSnapshot
    };
  }

}
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../services/toast.service';
import { LayoutService } from '../services/layout.service';
import { ProductService } from '../services/product.service';
import { Subscription, combineLatest, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';
import {
  COLLECTION_OPTIONS, COUNTRY_OPTIONS, STONE_FAMILY_OPTIONS,
  COLLECTION_SHORT_CODE_MAP, COUNTRY_SHORT_CODE_MAP, STONE_FAMILY_SHORT_CODE_MAP,
  abbreviate,
} from '../model/catalogue-options';

const BASE = 'https://setu-crm.onrender.com/catalogue';

export interface CatalogueItem {
  id: string;
  itemCode: string;
  collectionName?: string;
  stoneFamily: string;
  country: string;
  createdAt: number;
  [key: string]: any;
}

/** Media form-control names that hold an image/video URL (or a data: URL preview pending upload). */
const MEDIA_FIELDS = [
  'mainSlabPhotoUrl',
  'bookmatchPhotoUrl',
  'blockPhotoUrl',
  'mineQuarryPhotoUrl',
  'quarryVideoUrl',
  'view360Url',
] as const;

@Component({
  selector: 'app-add-catalogue',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-catalogue.component.html',
  styleUrl: './add-catalogue.component.css',
})
export class AddCatalogueComponent implements OnInit, OnDestroy {
  activeTab: 'add' | 'saved' = 'add';
  submitted = false;
  isSaving  = false;
  isLoadingEdit = false;
  editId: string | null = null;

  items: CatalogueItem[] = [];
  isLoading = false;

  // ── Dropdown option lists ─────────────────────────────────────────
  // Collection Name / Stone Family / Country are backed by a shared
  // label→code list (see catalogue-options.ts) so other components can look
  // up the same codes when building a marble/product code later.
  readonly collectionNameOptions = COLLECTION_OPTIONS.map(o => o.label);
  readonly stoneFamilyOptions    = STONE_FAMILY_OPTIONS.map(o => o.label);
  readonly countryOptions        = COUNTRY_OPTIONS.map(o => o.label);
  readonly mineStatusOptions     = ['Active', 'Inactive', 'Under Exploration', 'Closed'];
  readonly materialNatureOptions = ['Calcareous', 'Siliceous'];
  readonly levelOptions          = ['Low', 'Medium', 'High'];
  readonly veinPatternOptions    = ['Linear', 'Wavy', 'Netted', 'Cloudy', 'None'];
  readonly surfaceTextureOptions = ['Smooth', 'Rough', 'Crystalline', 'Grainy'];
  readonly movementOptions       = ['Low', 'Medium', 'High', 'Dramatic'];
  readonly transparencyOptions   = ['Opaque', 'Translucent', 'Semi-Translucent'];
  readonly yesNoOptions          = ['Yes', 'No'];
  readonly availabilityOptions   = ['In Stock', 'Limited Stock', 'Made to Order', 'Out of Stock'];
  readonly outdoorRecoOptions    = ['Recommended', 'Not Recommended', 'Recommended with Sealing'];
  readonly resistanceOptions     = ['Low', 'Medium', 'High', 'Excellent'];
  readonly certificationOptions  = ['None', 'ISO Certified', 'Green Building Certified', 'Other'];
  readonly interiorStyleOptions  = ['Modern', 'Classic', 'Contemporary', 'Traditional', 'Minimalist', 'Luxury'];
  readonly recommendedFinishOptions = ['Polished', 'Honed', 'Leather', 'Brushed'];
  readonly gradeOptions          = ['Economy', 'Standard', 'Premium', 'Signature'];
  readonly priceCategoryOptions  = ['Economy', 'Premium', 'Luxury', 'Signature'];

  // ── Checkbox group options ────────────────────────────────────────
  readonly finishOptions      = ['Polish', 'Honed', 'Leather', 'Brushed', 'Sandblasted', 'Flamed', 'Bush Hammered', 'Antique', 'Waterjet Finish', 'Tumbled', 'Lapatura', 'Others'];
  readonly applicationOptions = ['Flooring', 'Wall Cladding', 'Bathroom', 'Kitchen', 'Countertop', 'Staircase', 'Outdoor', 'Furniture', 'Sculpture', 'Temple', 'Luxury Villa', 'Hotel', 'Commercial', 'Facade', 'Pool Area', 'Others'];
  readonly thicknessOptions   = ['18 mm', '20 mm', '30 mm', '40 mm', '50 mm', 'Other'];
  readonly qualityIssueOptions = ['Pinholes', 'Dry Veins', 'Cracks', 'Color Variation', 'Fossils', 'Iron Spots', 'Shade Difference', 'Resin Required'];

  // ── Checkbox group state (plain arrays, not part of the reactive form) ──
  finishCompatibility: string[] = [];
  applications: string[] = [];
  suitableThickness: string[] = [];
  qualityIssues: string[] = [];

  isUploadingMedia: Record<string, boolean> = {};

  form = new FormGroup({
    // 1. Basic Information
    collectionName:      new FormControl(''),
    itemCode:            new FormControl('', Validators.required), // Product Code — auto-generated, see updateItemCode()
    alternateTradeName:  new FormControl(''),
    alternateTradeNameAbbreviation: new FormControl(''), // 2-char code entered alongside Trade Name, used to build itemCode
    color:               new FormControl(''),
    stoneFamily:         new FormControl('', Validators.required),

    // 2. Origin Details
    country:             new FormControl('', Validators.required),
    state:               new FormControl(''),
    city:                new FormControl(''),
    villageRegion:       new FormControl(''),
    quarryMineName:      new FormControl(''),
    mineOwner:           new FormControl(''),
    gpsCoordinates:      new FormControl(''),
    elevation:           new FormControl(''),
    mineStatus:          new FormControl(''),

    // 3. Material Characteristics
    materialNature:      new FormControl(''),
    fragility:           new FormControl(''),
    porosity:            new FormControl(''),
    waterAbsorption:     new FormControl<number | null>(null),
    density:             new FormControl<number | null>(null),
    specificGravity:     new FormControl<number | null>(null),
    compressiveStrength: new FormControl<number | null>(null),
    flexuralStrength:    new FormControl<number | null>(null),
    mohsHardness:        new FormControl<number | null>(null),

    // 4. Appearance
    primaryColor:        new FormControl(''),
    secondaryColor:      new FormControl(''),
    accentColor:         new FormControl(''),
    backgroundTone:      new FormControl(''),
    veinColor:           new FormControl(''),
    veinPattern:         new FormControl(''),
    surfaceTexture:      new FormControl(''),
    movement:            new FormControl(''),
    transparency:        new FormControl(''),

    // 5/6. Finish & Applications "others" free text
    finishOthers:        new FormControl(''),
    applicationsOthers:  new FormControl(''),

    // 7. Technical Recommendation
    bookmatch:              new FormControl('Yes'),
    backNetRequired:        new FormControl('Yes'),
    resinFillingRequired:   new FormControl('Yes'),
    epoxyRequired:          new FormControl('Yes'),
    fiberglassRequired:     new FormControl('Yes'),
    suitableThicknessOther: new FormControl(''),

    // Quality Notes
    otherIssues:         new FormControl(''),

    // Commercial Information
    availability:            new FormControl(''),
    commercialMineStatus:    new FormControl(''),
    productionCapacity:      new FormControl(''),
    exportAvailability:      new FormControl(''),
    approxBlocksPerMonth:    new FormControl(''),
    leadTime:                new FormControl(''),

    // Maintenance Guide
    recommendedSealer:      new FormControl(''),
    cleaningInstructions:   new FormControl(''),
    outdoorRecommendation:  new FormControl(''),
    chemicalResistance:     new FormControl(''),
    heatResistance:         new FormControl(''),
    scratchResistance:      new FormControl(''),

    // Sustainability
    ecoFriendly:               new FormControl(''),
    recyclable:                new FormControl(''),
    naturalStoneCertification: new FormControl(''),
    sustainabilityNotes:       new FormControl(''),

    // Media
    mainSlabPhotoUrl:    new FormControl(''),
    bookmatchPhotoUrl:   new FormControl(''),
    blockPhotoUrl:       new FormControl(''),
    mineQuarryPhotoUrl:  new FormControl(''),
    quarryVideoUrl:      new FormControl(''),
    view360Url:          new FormControl(''),

    // Marketing Information
    shortDescription:       new FormControl(''),
    luxuryDescription:      new FormControl(''),
    usp:                    new FormControl(''),
    bestSellingPoints:      new FormControl(''),
    keywords:               new FormControl(''),
    suitableInteriorStyle:  new FormControl(''),

    // Internal Information
    preferredSupplier:   new FormControl(''),
    purchaseManager:     new FormControl(''),
    supplierContact:     new FormControl(''),
    mineContact:         new FormControl(''),
    createdBy:           new FormControl('Auto'),
    remarks:             new FormControl(''),

    // Stone DNA (SETU Exclusive)
    originMapLocation:          new FormControl(''),
    quarryAge:                  new FormControl(''),
    geologicalFormation:        new FormControl(''),
    mineralComposition:         new FormControl(''),
    typicalBlockSize:           new FormControl(''),
    averageRecoveryPercent:     new FormControl(''),
    averageRecoverySqftPerTon:  new FormControl(''),
    recommendedFinish:          new FormControl(''),
    premiumGrade:               new FormControl(''),
    bestMatchingMaterials:      new FormControl(''),
    similarStones:              new FormControl(''),
    priceCategory:              new FormControl('Premium'),
    rarityIndex:                new FormControl(5),
  });

  private sub!: Subscription;
  private abbrSub?: Subscription;

  /** Every other marble's Trade Name Abbreviation already in use, lowercased → its id — loaded once, rechecked live as this one is typed. */
  private abbreviationIndex = new Map<string, string>();
  isCheckingAbbreviation = false;
  /** null = nothing to check (blank); true/false once checked against abbreviationIndex. */
  abbreviationTaken: boolean | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService,
    public  layout: LayoutService,
    private productService: ProductService,
  ) {}

  get f() { return this.form.controls; }

  /** Fields the auto-generated Product Code is built from — see updateItemCode(). */
  private static readonly ITEM_CODE_SOURCE_FIELDS = [
    'collectionName', 'color', 'stoneFamily', 'country', 'alternateTradeNameAbbreviation'
  ] as const;

  ngOnInit(): void {
    // combineLatest (rather than 5 independent subscriptions) guarantees one
    // synchronized recompute the instant ANY of the 5 fields changes — and
    // startWith(control.value) means it also fires once immediately on load
    // (relevant when editing, since loadForEdit() below patches these
    // fields in before this subscription would otherwise see them).
    const sourceControls = AddCatalogueComponent.ITEM_CODE_SOURCE_FIELDS.map(name => this.form.get(name)!);
    this.sub = combineLatest(
      sourceControls.map(c => c.valueChanges.pipe(startWith(c.value)))
    ).subscribe(() => this.updateItemCode());

    this.loadAbbreviationIndex();
    this.abbrSub = this.form.get('alternateTradeNameAbbreviation')!.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(value => this.checkAbbreviation(value));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId = id;
      this.loadForEdit(id);
      return;
    }
    if (this.route.snapshot.queryParamMap.get('tab') === 'saved') {
      this.switchTab('saved');
    }
  }

  /**
   * The live Product Code, computed fresh from current form values, as
   * collection-color-stoneFamily-country-tradeNameAbbreviation. Collection/
   * Stone Family/Country use the fixed 2-char (3 on collision) code lists
   * from catalogue-options.ts; Color has no fixed list so it uses the
   * shared abbreviation algorithm; Trade Name uses the 2-char abbreviation
   * typed alongside it. Blank segments are dropped so an incomplete entry
   * doesn't produce stray dashes. Bound directly in the template (not just
   * pushed into the itemCode control), so the displayed value is always
   * correct on every change-detection cycle — it doesn't depend on a
   * subscription having fired in time.
   */
  get generatedItemCode(): string {
    const v = this.form.value;
    const parts = [
      COLLECTION_SHORT_CODE_MAP[v.collectionName || ''] || abbreviate(v.collectionName),
      abbreviate(v.color),
      STONE_FAMILY_SHORT_CODE_MAP[v.stoneFamily || ''] || abbreviate(v.stoneFamily),
      COUNTRY_SHORT_CODE_MAP[v.country || ''] || abbreviate(v.country),
      (v.alternateTradeNameAbbreviation || '').toString().trim().toUpperCase(),
    ].filter(Boolean);
    return parts.join('-');
  }

  /** Keeps the itemCode control (used for validation and the save payload) in sync with generatedItemCode. */
  private updateItemCode(): void {
    this.form.get('itemCode')?.setValue(this.generatedItemCode, { emitEvent: false });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.abbrSub?.unsubscribe();
  }

  /** Loads every other marble's abbreviation once, then runs an immediate check against whatever's typed so far (covers the edit-load race, where the form may already have patched a value before this resolves). */
  private async loadAbbreviationIndex(): Promise<void> {
    this.isCheckingAbbreviation = true;
    try {
      const items = await firstValueFrom(this.http.get<CatalogueItem[]>(`${BASE}/all`));
      this.abbreviationIndex = new Map(
        items
          .filter(i => i['alternateTradeNameAbbreviation'])
          .map(i => [i['alternateTradeNameAbbreviation'].trim().toLowerCase(), i.id])
      );
    } catch {
      this.abbreviationIndex = new Map();
    } finally {
      this.isCheckingAbbreviation = false;
      this.checkAbbreviation(this.form.get('alternateTradeNameAbbreviation')?.value);
    }
  }

  /** Marks the currently-typed abbreviation as taken only if it belongs to a DIFFERENT marble — editing a marble never conflicts with its own existing abbreviation. */
  private checkAbbreviation(value: string | null | undefined): void {
    const trimmed = (value || '').trim().toLowerCase();
    if (!trimmed) {
      this.abbreviationTaken = null;
      return;
    }
    const ownerId = this.abbreviationIndex.get(trimmed);
    this.abbreviationTaken = !!ownerId && ownerId !== this.editId;
  }

  private async loadForEdit(id: string): Promise<void> {
    this.isLoadingEdit = true;
    try {
      const item = await firstValueFrom(this.http.get<CatalogueItem>(`${BASE}/${id}`));
      this.form.patchValue(item);
      this.finishCompatibility = item['finishCompatibility'] ?? [];
      this.applications        = item['applications'] ?? [];
      this.suitableThickness   = item['suitableThickness'] ?? [];
      this.qualityIssues       = item['qualityIssues'] ?? [];
      this.checkAbbreviation(item['alternateTradeNameAbbreviation']);
    } catch {
      this.toast.showError('Failed to load marble for editing.');
      this.router.navigate(['/catalogue']);
    } finally {
      this.isLoadingEdit = false;
    }
  }

  switchTab(tab: 'add' | 'saved'): void {
    this.activeTab = tab;
    if (tab === 'saved') this.loadItems();
  }

  async loadItems(): Promise<void> {
    this.isLoading = true;
    try {
      this.items = await firstValueFrom(this.http.get<CatalogueItem[]>(`${BASE}/all`));
    } catch {
      this.toast.showError('Failed to load catalogue.');
    } finally {
      this.isLoading = false;
    }
  }

  async deleteItem(id: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(`${BASE}/${id}`, { responseType: 'text' }));
      this.items = this.items.filter(i => i.id !== id);
      this.toast.showSuccess('Item deleted.');
    } catch {
      this.toast.showError('Failed to delete item.');
    }
  }

  // ── Checkbox group helpers ─────────────────────────────────────────
  toggle(list: string[], value: string): void {
    const idx = list.indexOf(value);
    if (idx === -1) list.push(value); else list.splice(idx, 1);
  }

  isChecked(list: string[], value: string): boolean {
    return list.includes(value);
  }

  // ── Media upload ───────────────────────────────────────────────────
  onMediaSelected(event: Event, controlName: typeof MEDIA_FIELDS[number]): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.form.get(controlName)?.setValue(reader.result as string);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearMedia(controlName: typeof MEDIA_FIELDS[number]): void {
    this.form.get(controlName)?.setValue('');
  }

  private async uploadPendingMedia(): Promise<void> {
    for (const field of MEDIA_FIELDS) {
      const value = this.form.get(field)?.value as string;
      if (value && value.startsWith('data:')) {
        this.isUploadingMedia[field] = true;
        try {
          const url = await firstValueFrom(this.productService.uploadImage(value));
          this.form.get(field)?.setValue(url);
        } finally {
          this.isUploadingMedia[field] = false;
        }
      }
    }
  }

  scrollToSection(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  saveDraft(): void { this.save(true); }

  async save(isDraft = false): Promise<void> {
    this.submitted = true;
    this.updateItemCode(); // final recompute, so the saved code can never lag behind the displayed one
    if ((!isDraft && this.form.invalid) || this.isSaving) return;

    this.isSaving = true;
    try {
      await this.uploadPendingMedia();

      const payload = {
        ...this.form.value,
        finishCompatibility: this.finishCompatibility,
        applications:        this.applications,
        suitableThickness:   this.suitableThickness,
        qualityIssues:       this.qualityIssues,
      };

      if (this.editId) {
        await firstValueFrom(this.http.put(`${BASE}/${this.editId}`, payload));
        this.toast.showSuccess('Marble updated.');
        this.router.navigate(['/view-marble', this.editId]);
      } else {
        await firstValueFrom(this.http.post(`${BASE}/add`, payload));
        this.toast.showSuccess(isDraft ? 'Saved as draft.' : `Saved — ID: ${this.f['itemCode'].value}`);
        this.resetForm();
      }
      // Refresh so the just-saved abbreviation is immediately reflected if the user adds another marble in the same session.
      this.loadAbbreviationIndex();
    } catch (err: any) {
      // The backend rejects a Trade Name Abbreviation already used by another marble with 409 + a plain-text message.
      const duplicateMsg = err?.status === 409 && typeof err.error === 'string' ? err.error : null;
      this.toast.showError(duplicateMsg || 'Failed to save. Please try again.');
    } finally {
      this.isSaving = false;
    }
  }

  viewMarble(id: string): void {
    this.router.navigate(['/view-marble', id]);
  }

  private resetForm(): void {
    this.form.reset({ createdBy: 'Auto', priceCategory: 'Premium', rarityIndex: 5, bookmatch: 'Yes', backNetRequired: 'Yes', resinFillingRequired: 'Yes', epoxyRequired: 'Yes', fiberglassRequired: 'Yes' });
    this.finishCompatibility = [];
    this.applications = [];
    this.suitableThickness = [];
    this.qualityIssues = [];
    this.submitted = false;
  }

  goBack(): void {
    if (this.editId) {
      this.router.navigate(['/view-marble', this.editId]);
    } else {
      this.router.navigate(['/search']);
    }
  }
}

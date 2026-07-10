import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../services/toast.service';
import { LayoutService } from '../services/layout.service';
import { ProductService } from '../services/product.service';
import { Subscription } from 'rxjs';
import { firstValueFrom } from 'rxjs';

const BASE = 'https://setu-crm.onrender.com/catalogue';

export interface CatalogueItem {
  id: string;
  itemCode: string;
  marbleName: string;
  collectionName?: string;
  materialType: string;
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
  readonly materialTypeOptions   = ['Marble', 'Granite', 'Quartzite', 'Onyx', 'Travertine', 'Limestone', 'Sandstone', 'Slate'];
  readonly stoneFamilyOptions    = ['Calcite Marble', 'Dolomite Marble', 'Onyx Marble', 'Travertine', 'Granite', 'Quartzite'];
  readonly countryOptions        = ['India', 'Italy', 'Turkey', 'China', 'Brazil', 'Spain', 'Portugal', 'Greece', 'Iran', 'Vietnam', 'Egypt', 'Pakistan', 'USA', 'Others'];
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
    marbleName:          new FormControl('', Validators.required),
    collectionName:      new FormControl(''),
    itemCode:            new FormControl('', Validators.required), // Product Code *
    alternateTradeName:  new FormControl(''),
    skuCode:             new FormControl(''),
    materialType:        new FormControl('', Validators.required),
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

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService,
    public  layout: LayoutService,
    private productService: ProductService,
  ) {}

  get f() { return this.form.controls; }

  ngOnInit(): void {
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

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private async loadForEdit(id: string): Promise<void> {
    this.isLoadingEdit = true;
    try {
      const item = await firstValueFrom(this.http.get<CatalogueItem>(`${BASE}/${id}`));
      this.form.patchValue(item);
      this.finishCompatibility = item['finishCompatibility'] ?? [];
      this.applications        = item['applications'] ?? [];
      this.suitableThickness   = item['suitableThickness'] ?? [];
      this.qualityIssues       = item['qualityIssues'] ?? [];
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
    } catch {
      this.toast.showError('Failed to save. Please try again.');
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

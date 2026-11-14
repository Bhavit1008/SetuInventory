import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { Product } from '../model/product';
import { ProductService } from '../services/product.service';
import { ToastService } from '../services/toast.service';
import { LayoutService } from '../services/layout.service';

interface VarietyGroup {
  name: string;
  lots: number;
  swatchClass: string;
}

const LOCATION_BY_SLUG: Record<string, string> = {
  kishangarh: 'Kishangarh',
  banswara:   'Banswara',
  moradabad:  'Moradabad',
};

/**
 * Admin-only "Warehouses" page — shows Block/Slab inventory scoped to a
 * single godown, grouped by marble variety (color/quality). A "Lot" here is
 * one Slab-category product record (the unit that actually carries
 * finish/thickness/slab-count/sqft); raw Blocks only surface in the
 * "Total Blocks" stat since they haven't been cut into slabs yet.
 */
@Component({
  selector: 'app-warehouse',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './warehouse.component.html',
  styleUrl: './warehouse.component.css',
})
export class WarehouseComponent implements OnInit, OnDestroy {
  readonly warehouses = ['Kishangarh', 'Banswara', 'Moradabad'];

  /** Same "Material" list as the SLAB DETAILS card in add-slab (slabs-management.component.ts productQuality). */
  readonly materialOptions = [
    'Banswara White', 'Banswara Purple', 'Torronto', 'Traventine B.',
    'Kayampura', 'Morchana Brown', 'Marine Black', 'Kesariya Green',
  ];

  /** Same Finish list as add-slab (slabs-management.component.ts finishesRange). */
  readonly finishOptions = [
    'Raw', 'Mirror Finish', 'Honed Finish', 'Hydro Finish', 'Epoxy Process',
    'Filling Process', 'Mirror Epoxy Finish', 'Sand Blast', 'Fire Flame', 'Leather Finish',
  ];

  /** Same Status list as add-slab (slabs-management.component.ts statusOption). */
  readonly statusOptions = ['Available', 'Hold', 'Sold'];

  isLoading = true;
  location = '';

  private allProducts: Product[] = [];
  /** All products (Block + Slab) tagged to this godown. */
  godownProducts: Product[] = [];
  /** Slab-category products at this godown — these are the "lots". */
  lots: Product[] = [];

  varietyGroups: VarietyGroup[] = [];
  selectedVariety: string | null = null;

  searchTerm = '';
  sizeFilter = '';
  finishFilter = '';
  statusFilter = '';

  pageNumber = 0;
  pageSize = 10;

  private paramSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private toast: ToastService,
    public layout: LayoutService,
  ) {}

  ngOnInit(): void {
    // A single route (`/warehouse/:slug`) backs all three godowns, so the
    // component instance is reused across them — react to param changes
    // rather than relying on ngOnInit running again.
    this.paramSub = this.route.paramMap.subscribe(params => {
      const slug = (params.get('slug') || '').toLowerCase();
      this.location = LOCATION_BY_SLUG[slug] || slug;
      this.selectedVariety = null;
      this.resetFilters();
      this.loadAll();
    });
  }

  ngOnDestroy(): void {
    this.paramSub?.unsubscribe();
  }

  get warehouseSlug(): string {
    return this.location.toLowerCase();
  }

  switchWarehouse(slug: string): void {
    if (slug === this.warehouseSlug) return;
    this.router.navigate(['/warehouse', slug]);
  }

  goBack(): void {
    this.router.navigate(['/search']);
  }

  async loadAll(): Promise<void> {
    this.isLoading = true;
    try {
      const res = await firstValueFrom(this.productService.getProductsPage(null, 0, 5000));
      this.allProducts = res.content;
      this.computeDerived();
    } catch {
      this.toast.showError('Failed to load warehouse inventory.');
    } finally {
      this.isLoading = false;
    }
  }

  private computeDerived(): void {
    const loc = this.location.toLowerCase();
    this.godownProducts = this.allProducts.filter(p => (p.godownLocation || '').toLowerCase() === loc);
    this.lots = this.godownProducts.filter(p => p.category?.toLowerCase() === 'slab');

    // Fixed catalog order (from add-slab's Material list), not derived from
    // whatever happens to be in this godown — so a variety with zero stock
    // here still shows up, at 0 lots, instead of disappearing.
    const palette = ['sw-1', 'sw-2', 'sw-3', 'sw-4', 'sw-5', 'sw-6', 'sw-7', 'sw-8'];
    this.varietyGroups = this.materialOptions.map((name, i) => ({
      name,
      lots: this.lots.filter(p => this.matches(p.productQuality, name)).length,
      swatchClass: palette[i % palette.length],
    }));

    if (!this.selectedVariety && this.varietyGroups.length) {
      this.selectedVariety = (this.varietyGroups.find(g => g.lots > 0) ?? this.varietyGroups[0]).name;
    }
  }

  /** Case/whitespace-insensitive equality — productQuality on older records is inconsistently cased (e.g. "banswara white" vs "Banswara White"). */
  private matches(value: string | undefined, target: string): boolean {
    return (value || '').trim().toLowerCase() === target.trim().toLowerCase();
  }

  // ── Top-level stats (whole godown) ─────────────────────────────────────────
  get totalBlocks(): number {
    return this.godownProducts.filter(p => p.category?.toLowerCase() === 'block').length;
  }

  get totalSlabs(): number {
    return this.lots.reduce((s, p) => s + this.lotSlabCount(p), 0);
  }

  get totalSqft(): number {
    return this.lots.reduce((s, p) => s + this.productSqft(p), 0);
  }

  get inTransitCount(): number {
    return this.godownProducts.filter(p => p.status?.toLowerCase() === 'intransit').length;
  }

  get availableSqft(): number {
    return this.lots
      .filter(p => p.status?.toLowerCase() === 'available')
      .reduce((s, p) => s + this.productSqft(p), 0);
  }

  // ── Selected-variety detail ─────────────────────────────────────────────────
  get varietyLots(): Product[] {
    if (!this.selectedVariety) return [];
    return this.lots.filter(p => this.matches(p.productQuality, this.selectedVariety!));
  }

  get varietyTotalSlabs(): number {
    return this.varietyLots.reduce((s, p) => s + this.lotSlabCount(p), 0);
  }

  get varietyTotalSqft(): number {
    return this.varietyLots.reduce((s, p) => s + this.productSqft(p), 0);
  }

  get sizeOptions(): string[] {
    return Array.from(new Set(this.varietyLots.map(p => this.lotSize(p)))).sort();
  }

  get hasActiveFilter(): boolean {
    return !!(this.searchTerm || this.sizeFilter || this.finishFilter || this.statusFilter);
  }

  get filteredLots(): Product[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.varietyLots.filter(p => {
      if (this.sizeFilter && this.lotSize(p) !== this.sizeFilter) return false;
      if (this.finishFilter && !this.matches(p.productFinished, this.finishFilter)) return false;
      if (this.statusFilter && !this.matches(p.status, this.statusFilter)) return false;
      if (term) {
        const lotNo = this.lotNumber(p).toLowerCase();
        const blockNo = this.blockNumber(p).toLowerCase();
        if (!lotNo.includes(term) && !blockNo.includes(term)) return false;
      }
      return true;
    });
  }

  get filteredTotalSlabs(): number {
    return this.filteredLots.reduce((s, p) => s + this.lotSlabCount(p), 0);
  }

  get filteredTotalSqft(): number {
    return this.filteredLots.reduce((s, p) => s + this.productSqft(p), 0);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLots.length / this.pageSize));
  }

  get pagedLots(): Product[] {
    const start = this.pageNumber * this.pageSize;
    return this.filteredLots.slice(start, start + this.pageSize);
  }

  get pageRangeEnd(): number {
    return Math.min(this.pageNumber * this.pageSize + this.pageSize, this.filteredLots.length);
  }

  selectVariety(name: string): void {
    this.selectedVariety = name;
    this.resetFilters();
  }

  onFilterChange(): void {
    this.pageNumber = 0;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.sizeFilter = '';
    this.finishFilter = '';
    this.statusFilter = '';
    this.pageNumber = 0;
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.pageNumber = page;
  }

  prevPage(): void { this.goToPage(this.pageNumber - 1); }
  nextPage(): void { this.goToPage(this.pageNumber + 1); }

  // ── Per-lot helpers ──────────────────────────────────────────────────────────
  lotNumber(p: Product): string {
    return p.slabNumber || p.productCode || '—';
  }

  blockNumber(p: Product): string {
    return p.sourceBlock?.blockCode || p.productCode || '—';
  }

  lotSize(p: Product): string {
    return `${p.productLength || '—'} x ${p.productWidth || '—'}`;
  }

  lotSlabCount(p: Product): number {
    return Number(p.quantity) || Number(p.gridQuantity) || 0;
  }

  productSqft(p: Product): number {
    if (p.pieces?.length) return p.pieces.reduce((s, pc) => s + (Number(pc.recheckedTotalArea) || Number(pc.totalArea) || 0), 0);
    return Number(p.sqft) || Number(p.size) || 0;
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'available':  return 'status-available';
      case 'sold':       return 'status-sold';
      case 'hold':       return 'status-hold';
      case 'process':    return 'status-process';
      case 'intransit':  return 'status-intransit';
      default:           return 'status-default';
    }
  }

  viewProduct(product: Product): void {
    this.router.navigate(['/view-product'], { state: { product }, queryParams: { id: product.id } });
  }
}

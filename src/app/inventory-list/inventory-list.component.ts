import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { firstValueFrom } from 'rxjs';
import { Product } from '../model/product';
import { SlabPieces } from '../model/slab-pieces';
import { ProductService } from '../services/product.service';
import { ToastService } from '../services/toast.service';
import { LayoutService } from '../services/layout.service';
import { AuthService } from '../services/auth.service';
import { CatalogueLookupService } from '../services/catalogue-lookup.service';
import { InventoryFilterStateService } from '../services/inventory-filter-state.service';

interface StatCard {
  icon: 'cube' | 'scale' | 'layers' | 'check' | 'box';
  colorClass: string;
  label: string;
  value: string;
  sub: string;
}

/**
 * Shared listing page for "Block Inventory", "Slab Inventory", "Process
 * Inventory" and "Sold Inventory" nav items. The page title, plus either a
 * category ("Block" / "Slab") or a status filter ("Process" / "Sold"), come
 * from route data, so one component backs all four routes instead of
 * duplicating near-identical code.
 *
 * The full scoped set (category or status) is fetched once and then
 * filtered/paginated client-side, since the backend doesn't support status
 * or the advanced filter fields as query params. Category-scoped views
 * (Block/Slab Inventory) exclude products whose status is "Process" or
 * "Sold" — those only show up in their own dedicated inventory pages — so
 * an item disappears from its category list the moment it's marked as
 * being processed or sold.
 */
@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxSkeletonLoaderModule],
  templateUrl: './inventory-list.component.html',
  styleUrl: './inventory-list.component.css',
})
export class InventoryListComponent implements OnInit {
  category: string | null = null;
  statusFilter: string | null = null;
  pageTitle = '';

  isLoading = true;
  pageItems: Product[] = [];

  pageNumber = 0;
  pageSize = 20;
  totalPages = 0;
  totalElements = 0;

  filterPanelVisible = false;
  filterActive = false;
  filterForm: FormGroup;

  /** Optional on-screen sort — 'none' keeps the backend's default (newest-created first). */
  sortField: 'none' | 'number' | 'date' = 'none';
  sortDirection: 'asc' | 'desc' = 'asc';

  exportPanelVisible = false;
  isExportingExcel = false;
  isExportingPdf = false;
  exportForm: FormGroup;

  /** Full scoped set: category or status filtered, with in-process items excluded from category views. */
  private baseProducts: Product[] = [];
  /** baseProducts narrowed by the ad-hoc filter panel, when active. */
  private displayProducts: Product[] = [];

  goDownLocations = [
    { id: 1, label: 'Kishangarh' },
    { id: 2, label: 'Moradabad' },
    { id: 3, label: 'Banswara' },
  ];

  productQuality = [
    { id: 1, label: 'Banswara White' },
    { id: 2, label: 'Banswara Purple' },
    { id: 3, label: 'Torronto' },
    { id: 4, label: 'Traventine B.' },
    { id: 5, label: 'Kayampura' },
    { id: 6, label: 'Morchana Brown' },
    { id: 7, label: 'Marine Black' },
    { id: 8, label: 'Kesariya Green' },
  ];

  private allStatusOptions = [
    { label: 'Available' },
    { label: 'Hold' },
    { label: 'Sold' },
    { label: 'InTransit' },
  ];

  /** "Sold" is excluded from category-scoped views (Block/Slab Inventory) since those items are filtered out of baseProducts entirely — see loadAll(). */
  get statusList() {
    return this.category ? this.allStatusOptions.filter(s => s.label !== 'Sold') : this.allStatusOptions;
  }

  /** Admin can filter by every godown; a store manager only by their own assigned ones (their rows are already restricted to these — see loadAll()). */
  get locationOptions() {
    if (this.isAdmin) return this.goDownLocations;
    const mine = this.auth.getCurrentLocations().map(l => l.toLowerCase());
    return this.goDownLocations.filter(g => mine.includes(g.label.toLowerCase()));
  }

  /** Sold Inventory mixes Block and Slab together — the only view that needs its own category filter (Block/Slab Inventory are already fixed to one category by their route). */
  get showCategoryFilter(): boolean {
    return this.statusFilter === 'Sold';
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  // ── Admin bulk-delete (Sold Inventory only) ───────────────────────────
  selectedIds = new Set<string>();
  showBulkDeleteConfirm = false;
  isBulkDeleting = false;

  get showBulkSelect(): boolean {
    return this.isAdmin && this.statusFilter === 'Sold';
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  toggleSelect(id: string): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }

  /** "Select all" covers only the current page — selections elsewhere on other pages are kept. */
  get allPageSelected(): boolean {
    return this.pageItems.length > 0 && this.pageItems.every(p => this.selectedIds.has(p.id));
  }

  toggleSelectAllOnPage(): void {
    const next = !this.allPageSelected;
    this.pageItems.forEach(p => next ? this.selectedIds.add(p.id) : this.selectedIds.delete(p.id));
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  openBulkDeleteConfirm(): void {
    if (this.selectedCount === 0) return;
    this.showBulkDeleteConfirm = true;
  }

  cancelBulkDelete(): void {
    this.showBulkDeleteConfirm = false;
  }

  async confirmBulkDelete(): Promise<void> {
    if (this.isBulkDeleting) return;
    this.isBulkDeleting = true;

    const ids = Array.from(this.selectedIds);
    let failures = 0;
    for (const id of ids) {
      try {
        await firstValueFrom(this.productService.deleteProduct(id));
      } catch {
        failures++;
      }
    }

    this.isBulkDeleting = false;
    this.showBulkDeleteConfirm = false;
    this.selectedIds.clear();

    if (failures) {
      this.toast.showError(`Deleted ${ids.length - failures} of ${ids.length} — ${failures} failed.`);
    } else {
      this.toast.showSuccess(`Deleted ${ids.length} sold item${ids.length > 1 ? 's' : ''}.`);
    }

    await this.loadAll();
  }

  /** Which date a row "belongs to": when it was sold for Sold Inventory, when it was added everywhere else — also drives the export date-range filter. */
  get dateField(): 'soldDate' | 'createdAt' {
    return this.statusFilter === 'Sold' ? 'soldDate' : 'createdAt';
  }

  get dateColumnLabel(): string {
    return this.statusFilter === 'Sold' ? 'Sold Date' : 'Date Added';
  }

  get numberColumnLabel(): string {
    if (this.category === 'Slab') return 'Slab';
    if (this.category === 'Block') return 'Block';
    return 'Product';
  }

  /** Identifies this page (Block/Slab/Process/Sold Inventory) for saving/restoring its own filter state. */
  private get stateKey(): string {
    return `${this.category ?? ''}|${this.statusFilter ?? ''}`;
  }

  private persistState(): void {
    this.filterState.save(this.stateKey, {
      filterValues: this.filterForm.value,
      filterActive: this.filterActive,
      sortField: this.sortField,
      sortDirection: this.sortDirection,
      pageNumber: this.pageNumber,
    });
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private productService: ProductService,
    private toast: ToastService,
    public layout: LayoutService,
    private auth: AuthService,
    private catalogueLookup: CatalogueLookupService,
    private filterState: InventoryFilterStateService,
  ) {
    this.filterForm = this.fb.group({
      godonLocations: [''],
      productQuality: [''],
      status: [''],
      category: [''],
      productCode: [''],
      minPrice: [''],
      maxPrice: [''],
      minQuantity: [''],
      maxQuantity: [''],
    });

    this.exportForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      category: [''],
      location: [''],
      includeImages: [false],
    });
  }

  ngOnInit(): void {
    this.category = this.route.snapshot.data['category'] ?? null;
    this.statusFilter = this.route.snapshot.data['statusFilter'] ?? null;
    this.pageTitle = this.route.snapshot.data['title'];
    this.loadAll();
  }

  get itemLabel(): string {
    if (this.category === 'Block') return 'Blocks';
    if (this.category === 'Slab') return 'Slabs';
    return 'Items';
  }

  get emptyStateLabel(): string {
    return this.category ?? this.pageTitle;
  }

  get statCards(): StatCard[] {
    const items = this.baseProducts;
    const totalWeight = items.reduce((s, p) => s + (Number(p.productWeight) || 0), 0);
    const totalSqft = items.reduce((s, p) => s + this.productSqft(p), 0);

    const cards: StatCard[] = [
      {
        icon: 'cube', colorClass: 'stat-orange',
        label: `Total ${this.itemLabel}`,
        value: items.length.toLocaleString(),
        sub: this.category ? 'All locations' : 'All categories',
      },
    ];

    if (this.category !== 'Slab') {
      cards.push({
        icon: 'scale', colorClass: 'stat-green',
        label: 'Total Weight',
        value: totalWeight.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        sub: 'Tons',
      });
    }
    if (this.category !== 'Block') {
      cards.push({
        icon: 'layers', colorClass: 'stat-blue',
        label: 'Total Sqft',
        value: totalSqft.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        sub: 'sq ft',
      });
    }

    if (this.statusFilter) {
      const blocks = items.filter(p => p.category?.toLowerCase() === 'block').length;
      const slabs = items.filter(p => p.category?.toLowerCase() === 'slab').length;
      cards.push({ icon: 'box', colorClass: 'stat-purple', label: 'Blocks Pending', value: blocks.toLocaleString(), sub: 'In process' });
      cards.push({ icon: 'layers', colorClass: 'stat-purple', label: 'Slabs Pending', value: slabs.toLocaleString(), sub: 'In process' });
    } else {
      const available = items.filter(p => p.status?.toLowerCase() === 'available').length;
      cards.push({
        icon: 'check', colorClass: 'stat-teal',
        label: `Available ${this.itemLabel}`,
        value: available.toLocaleString(),
        sub: 'Ready for sale',
      });
    }

    return cards;
  }

  private productSqft(p: Product): number {
    if (p.pieces?.length) return p.pieces.reduce((s, pc) => s + (Number(pc.recheckedTotalArea) || Number(pc.totalArea) || 0), 0);
    return Number(p.sqft) || Number(p.size) || 0;
  }

  stoneType(p: Product): string {
    return this.catalogueLookup.stoneType(p);
  }

  /** Slabs are identified by their own slab number when set; blocks (and legacy slabs without one) fall back to productCode. */
  rowCode(p: Product): string {
    if (p.category?.toLowerCase() === 'slab' && p.slabNumber) return p.slabNumber;
    return p.productCode;
  }

  /**
   * Blocks use their own block-level photo. Slabs use the first piece's own
   * photo instead — falling back to a block-level image only if no piece has
   * one, since a standalone slab never had a block image to inherit.
   */
  rowThumb(p: Product): string {
    if (p.category?.toLowerCase() === 'slab') {
      const withImg = p.pieces?.find(pc => pc.imageUrl || pc.imageBase64);
      if (withImg) return withImg.imageUrl || withImg.imageBase64;
    }
    if (p.imageUrls?.length) return p.imageUrls[0];
    return p.imageUrl || '';
  }

  productSize(p: Product): string {
    if (p.category?.toLowerCase() === 'slab') {
      return `${p.productLength || '—'} × ${p.productWidth || '—'}`;
    }
    return `${p.productLength || '—'} × ${p.productWidth || '—'} × ${p.productHeight || '—'}`;
  }

  productMetric(p: Product): string {
    if (p.category?.toLowerCase() === 'slab') {
      const sqft = this.productSqft(p);
      return sqft ? `${sqft.toLocaleString(undefined, { maximumFractionDigits: 2 })} sqft` : '—';
    }
    return p.productWeight ? `${p.productWeight} Tons` : '—';
  }

  /** One piece's size + sqft, for the expandable piece breakdown — uses the sold-recheck measurement when present (Sold Inventory rows carry only the pieces actually sold, already re-measured). */
  pieceSizeLabel(piece: SlabPieces): string {
    const length = piece.recheckedLength || piece.length;
    const width = piece.recheckedWidth || piece.width;
    const area = Number(piece.recheckedTotalArea) || Number(piece.totalArea) || 0;
    return `${length} × ${width} (${area.toFixed(2)} sqft)`;
  }

  /** Whether this slab's pieces carry actual measured dimensions worth expanding — a single-row placeholder from a simple-quantity entry (length/width always 0) shouldn't offer an empty "View sizes" toggle. */
  hasPieceSizes(p: Product): boolean {
    return !!p.pieces?.some(pc => (pc.recheckedLength || pc.length) > 0 || (pc.recheckedWidth || pc.width) > 0);
  }

  private expandedRows = new Set<string>();

  isRowExpanded(p: Product): boolean {
    return this.expandedRows.has(p.id);
  }

  toggleRowExpand(p: Product, event: Event): void {
    event.stopPropagation();
    if (this.expandedRows.has(p.id)) this.expandedRows.delete(p.id);
    else this.expandedRows.add(p.id);
  }

  // ── Hover-zoom preview for the row thumbnail ───────────────────────────
  hoveredImage: string | null = null;
  hoverPreviewStyle: Record<string, string> = {};

  onThumbEnter(event: MouseEvent, url: string): void {
    if (!url) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const previewSize = 440;

    let left = rect.right + 14;
    if (left + previewSize > window.innerWidth) left = rect.left - previewSize - 14;
    left = Math.max(8, left);

    let top = rect.top + rect.height / 2 - previewSize / 2;
    top = Math.max(8, Math.min(top, window.innerHeight - previewSize - 8));

    this.hoverPreviewStyle = { top: `${top}px`, left: `${left}px` };
    this.hoveredImage = url;
  }

  onThumbLeave(): void {
    this.hoveredImage = null;
  }

  rowDate(p: Product): string {
    const value = Number(p[this.dateField]);
    return value ? new Date(value).toLocaleDateString() : '—';
  }

  /**
   * Block/slab codes carry their real identifying number as a 4-digit run
   * embedded in the code (e.g. "BW-1234") — sorting the code as plain text
   * would order "10" before "2", so "Number" sort pulls that run out and
   * compares it numerically instead. Falls back to any digits found, or 0,
   * for codes that don't follow the 4-digit convention.
   */
  private sortNumberKey(p: Product): number {
    const code = this.rowCode(p) || '';
    const fourDigits = code.match(/\d{4}/);
    if (fourDigits) return parseInt(fourDigits[0], 10);
    const anyDigits = code.match(/\d+/);
    return anyDigits ? parseInt(anyDigits[0], 10) : 0;
  }

  private applySort(list: Product[]): Product[] {
    if (this.sortField === 'none') return list;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    const sorted = [...list];
    if (this.sortField === 'number') {
      sorted.sort((a, b) => (this.sortNumberKey(a) - this.sortNumberKey(b)) * dir);
    } else {
      sorted.sort((a, b) => ((Number(a[this.dateField]) || 0) - (Number(b[this.dateField]) || 0)) * dir);
    }
    return sorted;
  }

  onSortChange(): void {
    this.pageNumber = 0;
    this.recomputePagination();
    this.persistState();
  }

  toggleSortDirection(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.onSortChange();
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

  async loadAll(): Promise<void> {
    this.isLoading = true;
    try {
      const [res] = await Promise.all([
        firstValueFrom(this.productService.getProductsPage(this.category, 0, 5000)),
        this.catalogueLookup.ensureLoaded(),
      ]);
      this.baseProducts = (this.statusFilter
        ? res.content.filter(p => p.status?.toLowerCase() === this.statusFilter!.toLowerCase())
        : res.content.filter(p => {
            const status = p.status?.toLowerCase();
            // 'pendingsold' = staged for sale, awaiting admin approval on the
            // Sold Staging page — hidden from every inventory view until
            // resolved (approved → 'sold', rejected → back to its prior status).
            return status !== 'process' && status !== 'sold' && status !== 'pendingsold';
          })
      ).filter(p => this.auth.canAccessLocation(p.godownLocation));

      const saved = this.filterState.get(this.stateKey);
      if (saved) {
        this.filterForm.patchValue(saved.filterValues, { emitEvent: false });
        this.filterActive = saved.filterActive;
        this.sortField = saved.sortField;
        this.sortDirection = saved.sortDirection;
        this.pageNumber = saved.pageNumber;
        this.displayProducts = saved.filterActive ? this.computeFiltered(saved.filterValues) : this.baseProducts;
      } else {
        this.filterForm.reset();
        this.filterActive = false;
        this.displayProducts = this.baseProducts;
        this.pageNumber = 0;
      }
      this.recomputePagination();
    } catch {
      this.toast.showError('Failed to load inventory.');
    } finally {
      this.isLoading = false;
    }
  }

  private recomputePagination(): void {
    const sorted = this.applySort(this.displayProducts);
    this.totalElements = sorted.length;
    this.totalPages = Math.max(1, Math.ceil(sorted.length / this.pageSize));
    const start = this.pageNumber * this.pageSize;
    this.pageItems = sorted.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.pageNumber = page;
    this.recomputePagination();
    this.persistState();
  }

  prevPage(): void { this.goToPage(this.pageNumber - 1); }
  nextPage(): void { this.goToPage(this.pageNumber + 1); }

  toggleFilterPanel(): void {
    this.filterPanelVisible = !this.filterPanelVisible;
  }

  closeFilterPanel(): void {
    this.filterPanelVisible = false;
  }

  private computeFiltered(values: any): Product[] {
    const { godonLocations, productQuality, status, category, productCode, minPrice, maxPrice, minQuantity, maxQuantity } = values;

    return this.baseProducts.filter(p =>
      (!godonLocations || p.godownLocation?.toLowerCase().includes(godonLocations.toLowerCase())) &&
      (!productQuality || p.productQuality?.toLowerCase().includes(productQuality.toLowerCase())) &&
      (!status || p.status?.toLowerCase().includes(status.toLowerCase())) &&
      (!category || p.category === category) &&
      (!productCode || this.rowCode(p)?.toLowerCase().includes(productCode.toLowerCase())) &&
      (!minPrice || p.sellingCost >= +minPrice) &&
      (!maxPrice || p.sellingCost <= +maxPrice) &&
      (!minQuantity || p.quantity >= +minQuantity) &&
      (!maxQuantity || p.quantity <= +maxQuantity)
    );
  }

  applyFilter(): void {
    this.displayProducts = this.computeFiltered(this.filterForm.value);
    this.filterActive = true;
    this.pageNumber = 0;
    this.recomputePagination();
    this.closeFilterPanel();
    this.persistState();
  }

  resetFilter(): void {
    this.filterForm.reset();
    this.filterActive = false;
    this.displayProducts = this.baseProducts;
    this.pageNumber = 0;
    this.recomputePagination();
    this.persistState();
  }

  viewProduct(product: Product): void {
    this.router.navigate(['/view-product'], { state: { product }, queryParams: { id: product.id } });
  }

  goBack(): void {
    this.router.navigate(['/search']);
  }

  // ── Export (Excel / PDF) ──────────────────────────────────────────────

  /** Opens the export panel, defaulting its category to whatever the on-screen filter currently has selected (Sold Inventory only). */
  openExportPanel(): void {
    this.exportForm.patchValue({ category: this.filterForm.value.category || '', location: '' });
    this.exportPanelVisible = true;
  }

  closeExportPanel(): void {
    this.exportPanelVisible = false;
  }

  /**
   * Builds the row set to export: baseProducts (already location-scoped for
   * a store manager via loadAll()) narrowed by the export panel's own date
   * range, category (Sold Inventory only) and location (admin only — a
   * store manager never sees this control, since their baseProducts is
   * already restricted to their assigned godowns).
   */
  private buildExportDataset(): Product[] | null {
    const { startDate, endDate, category, location } = this.exportForm.value;

    if (!startDate || !endDate) {
      this.toast.showError('Select both a start and end date.');
      return null;
    }
    if (startDate > endDate) {
      this.toast.showError('Start date must be on or before the end date.');
      return null;
    }

    const startMs = new Date(`${startDate}T00:00:00`).getTime();
    const endMs = new Date(`${endDate}T23:59:59.999`).getTime();

    return this.baseProducts.filter(p => {
      const value = Number(p[this.dateField]);
      if (!value || value < startMs || value > endMs) return false;
      if (this.showCategoryFilter && category && p.category !== category) return false;
      if (this.isAdmin && location && p.godownLocation !== location) return false;
      return true;
    });
  }

  /**
   * Shared row shape for both export formats. Every row — Block or Slab —
   * carries the exact same set of keys (blank '—'/0 where not applicable to
   * that category), so PDF column headers (derived from the first row's
   * keys) stay correct even when Sold Inventory mixes both categories in
   * one export; a row missing a key that another row has would otherwise
   * render as the literal string "undefined" in that cell.
   */
  private toExportRow(p: Product): Record<string, string | number> {
    const isSlab = p.category?.toLowerCase() === 'slab';
    const row: Record<string, string | number> = {
      'Code': this.rowCode(p),
      'Quality': this.stoneType(p),
      'Status': p.status || '—',
      'Size': this.productSize(p),
      'Weight (Tons)': isSlab ? '—' : (p.productWeight || 0),
      'Date Added': p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—',
    };

    if (this.statusFilter === 'Sold') {
      row['Sold Date'] = p.soldDate ? new Date(p.soldDate).toLocaleDateString() : '—';
      row['Party Name'] = p.partyName || '—';
      row['Sold Quantity'] = isSlab ? (p.soldQuantity || 0) : '—';
      row['Sold Sqft'] = isSlab ? (p.soldSqft || 0) : '—';
      row['Weight Sold (Tons)'] = isSlab ? '—' : (p.weightSold || 0);
    }

    return row;
  }

  private exportFilename(extension: string): string {
    const { startDate, endDate } = this.exportForm.value;
    const safeTitle = this.pageTitle.replace(/\s+/g, '_');
    return `${safeTitle}_${startDate}_to_${endDate}.${extension}`;
  }

  async exportExcel(): Promise<void> {
    if (this.isExportingExcel) return;
    const dataset = this.buildExportDataset();
    if (!dataset) return;
    if (!dataset.length) {
      this.toast.showError('No records found in that date range.');
      return;
    }

    this.isExportingExcel = true;
    try {
      const XLSX = await import('xlsx');
      const rows = dataset.map(p => this.toExportRow(p));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, this.pageTitle.slice(0, 31) || 'Inventory');
      XLSX.writeFile(workbook, this.exportFilename('xlsx'));
      this.closeExportPanel();
    } catch {
      this.toast.showError('Failed to export Excel file.');
    } finally {
      this.isExportingExcel = false;
    }
  }

  /**
   * Fetches each product's row thumbnail (see rowThumb()) as a base64 data
   * URL, keyed by product id, so it can be drawn synchronously inside
   * autoTable's didDrawCell hook (which can't itself await a network
   * fetch). Products with no thumbnail, or whose fetch fails, are simply
   * left out of the map — the image cell is drawn blank rather than
   * failing the whole export.
   */
  private async loadImageMap(dataset: Product[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    await Promise.all(dataset.map(async p => {
      const url = this.rowThumb(p);
      if (!url) return;
      try {
        const dataUrl = url.startsWith('data:')
          ? url
          : await firstValueFrom(this.productService.downloadImage(url));
        map.set(p.id, dataUrl);
      } catch {
        // Skip this row's image — the export still proceeds without it.
      }
    }));
    return map;
  }

  /** jsPDF needs the image format ('JPEG'/'PNG'/...) to match what's actually encoded in the data URL. */
  private dataUrlFormat(dataUrl: string): string {
    return (dataUrl.match(/^data:image\/(\w+);/)?.[1] || 'JPEG').toUpperCase();
  }

  async exportPdf(): Promise<void> {
    if (this.isExportingPdf) return;
    const dataset = this.buildExportDataset();
    if (!dataset) return;
    if (!dataset.length) {
      this.toast.showError('No records found in that date range.');
      return;
    }

    const includeImages = !!this.exportForm.value.includeImages;

    this.isExportingPdf = true;
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const imageMap = includeImages ? await this.loadImageMap(dataset) : null;

      const rows = dataset.map(p => this.toExportRow(p));
      const dataColumns = Object.keys(rows[0] ?? {});
      const columns = includeImages ? ['Image', ...dataColumns] : dataColumns;
      const { startDate, endDate } = this.exportForm.value;

      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(14);
      doc.text(this.pageTitle, 14, 15);
      doc.setFontSize(10);
      doc.text(`${startDate} to ${endDate}`, 14, 21);

      const IMAGE_SIZE = 16; // mm

      autoTable(doc, {
        head: [columns],
        body: rows.map(r => includeImages
          ? ['', ...dataColumns.map(c => String(r[c]))]
          : dataColumns.map(c => String(r[c]))),
        startY: 26,
        styles: { fontSize: 8, minCellHeight: includeImages ? IMAGE_SIZE + 4 : undefined },
        headStyles: { fillColor: [28, 28, 30] },
        columnStyles: includeImages ? { 0: { cellWidth: IMAGE_SIZE + 4 } } : undefined,
        didDrawCell: includeImages ? (data) => {
          if (data.section !== 'body' || data.column.index !== 0) return;
          const dataUrl = imageMap?.get(dataset[data.row.index]?.id);
          if (!dataUrl) return;
          doc.addImage(
            dataUrl, this.dataUrlFormat(dataUrl),
            data.cell.x + 2, data.cell.y + 2, IMAGE_SIZE, IMAGE_SIZE
          );
        } : undefined,
      });

      doc.save(this.exportFilename('pdf'));
      this.closeExportPanel();
    } catch {
      this.toast.showError('Failed to export PDF file.');
    } finally {
      this.isExportingPdf = false;
    }
  }
}

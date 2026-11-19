import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Product } from '../model/product';
import { SlabPieces } from '../model/slab-pieces';
import { ProductService } from '../services/product.service';
import { ToastService } from '../services/toast.service';
import { LayoutService } from '../services/layout.service';
import { AuthService } from '../services/auth.service';
import { CatalogueLookupService } from '../services/catalogue-lookup.service';
import { SavedCatalogueService, SavedCatalogue } from '../services/saved-catalogue.service';
import { COLLECTION_OPTIONS, STONE_FAMILY_OPTIONS } from '../model/catalogue-options';

/** One selectable slab in the generator, plus its piece-level selection state (only meaningful when hasPieces) and its catalogue-only quoted rate. */
interface SlabSelection {
  product: Product;
  checked: boolean;
  hasPieces: boolean;
  /** 'full' includes every piece/the whole quantity; 'partial' only the pieces flagged true in pieceChecks. */
  mode: 'full' | 'partial';
  pieceChecks: boolean[];
  /** Catalogue-only quoted rate (₹/sqft) — never saved back onto the product; falls back to its real sellingCost when unset. */
  yourRate: number | null;
}

type LayoutFormat = 'premium' | 'standard' | 'quick' | 'pricelist';

type InfoKey =
  | 'slabImage' | 'stoneName' | 'slabNumber' | 'materialType' | 'collection'
  | 'lotQuality' | 'thickness' | 'size' | 'totalSqft' | 'rate'
  | 'location' | 'blockNumber' | 'finish' | 'remarks';

interface InfoOption { key: InfoKey; label: string; checked: boolean; }

type CompanyKey = 'logo' | 'contact' | 'showrooms' | 'website' | 'salesperson' | 'terms' | 'validity';
interface CompanyOption { key: CompanyKey; label: string; checked: boolean; }

interface FilterState {
  material: string;
  collection: string;
  location: string;
  minPrice: number | null;
  maxPrice: number | null;
  thickness: string;
  quality: string;
  availability: string;
}

function defaultFilters(): FilterState {
  return { material: '', collection: '', location: '', minPrice: null, maxPrice: null, thickness: '', quality: '', availability: 'Available Only' };
}

const INFO_LABELS: Record<InfoKey, string> = {
  slabImage: 'Image', stoneName: 'Stone Name', slabNumber: 'Slab Number', materialType: 'Material Type',
  collection: 'Collection', lotQuality: 'Lot Quality', thickness: 'Thickness', size: 'Size',
  totalSqft: 'Total Sqft', rate: 'Rate (Rs/sqft)', location: 'Location', blockNumber: 'Block Number',
  finish: 'Finish', remarks: 'Remarks',
};

/**
 * Builds a priced, branded PDF catalogue from a hand-picked set of in-stock
 * slabs for a specific customer — filter by material/collection/location/
 * price/thickness/quality, quote a per-slab rate (catalogue-only, never
 * saved to the product), choose a layout + which details/company info to
 * print, and save the whole configuration as a draft to resume later.
 */
@Component({
  selector: 'app-catalogue-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxSkeletonLoaderModule],
  templateUrl: './catalogue-generator.component.html',
  styleUrl: './catalogue-generator.component.css',
})
export class CatalogueGeneratorComponent implements OnInit {
  isLoading = true;
  isGenerating = false;
  isSavingDraft = false;

  customerName = '';
  catalogueName = '';
  currentSavedId: string | null = null;
  currentStatus: 'draft' | 'final' = 'draft';

  /**
   * Every slab ever fetched into this session, keyed by id — selections and
   * quoted rates live here so they survive paging back and forth, even
   * though only one server page's worth of slabs is ever loaded at a time
   * (see loadSlabs / currentPageRows).
   */
  private selectionById = new Map<string, SlabSelection>();
  /** The literal rows returned for the current server page — see loadSlabs(). */
  currentPageRows: SlabSelection[] = [];

  goDownLocations = [
    { id: 1, label: 'Kishangarh' },
    { id: 2, label: 'Moradabad' },
    { id: 3, label: 'Banswara' },
  ];

  readonly materialOptions = STONE_FAMILY_OPTIONS.map(o => o.label);
  readonly collectionOptionsList = COLLECTION_OPTIONS.map(o => o.label);

  filters: FilterState = defaultFilters();
  appliedFilters: FilterState = defaultFilters();

  pageNumber = 0;
  pageSize = 20;
  totalElements = 0;
  private totalPagesFromServer = 1;

  layoutFormat: LayoutFormat = 'premium';

  infoFields: InfoOption[] = [
    { key: 'slabImage',   label: 'Slab Image',    checked: true },
    { key: 'stoneName',   label: 'Stone Name',     checked: true },
    { key: 'slabNumber',  label: 'Slab Number',    checked: true },
    { key: 'materialType',label: 'Material Type',  checked: true },
    { key: 'collection',  label: 'Collection',     checked: true },
    { key: 'lotQuality',  label: 'Lot Quality',    checked: true },
    { key: 'thickness',   label: 'Thickness',      checked: true },
    { key: 'size',        label: 'Size',           checked: true },
    { key: 'totalSqft',   label: 'Total Sqft',     checked: true },
    { key: 'rate',        label: 'Rate (₹/sqft)',  checked: true },
    { key: 'location',    label: 'Location',       checked: false },
    { key: 'blockNumber', label: 'Block Number',   checked: false },
    { key: 'finish',      label: 'Finish',         checked: false },
    { key: 'remarks',     label: 'Remarks',        checked: false },
  ];

  companyFields: CompanyOption[] = [
    { key: 'logo',        label: 'SETU Logo & Company Name', checked: true },
    { key: 'contact',     label: 'Contact Number',            checked: true },
    { key: 'showrooms',   label: 'Showroom Locations',        checked: true },
    { key: 'website',     label: 'Website',                    checked: false },
    { key: 'salesperson', label: 'Salesperson Name & Contact', checked: false },
    { key: 'terms',       label: 'Terms & Conditions',         checked: false },
    { key: 'validity',    label: 'Catalogue Date & Validity',  checked: true },
  ];

  validityDays = '7';
  readonly validityOptions = [
    { value: '7',  label: 'Valid for 7 Days' },
    { value: '15', label: 'Valid for 15 Days' },
    { value: '30', label: 'Valid for 30 Days' },
  ];

  bulkRate: number | null = null;

  /** The slab currently open in the piece-selection popup — null when no popup is showing. */
  activeDetail: SlabSelection | null = null;

  // ── Saved Catalogues ───────────────────────────────────────────────────
  showSavedList = false;
  isLoadingSaved = false;
  savedCatalogues: SavedCatalogue[] = [];

  // ── Preview state ───────────────────────────────────────────────────
  showPreview = false;
  previewUrl: SafeResourceUrl | null = null;
  private previewDoc: any = null;
  private previewBlobUrl: string | null = null;

  constructor(
    private productService: ProductService,
    private toast: ToastService,
    public layout: LayoutService,
    private auth: AuthService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private catalogueLookup: CatalogueLookupService,
    private savedCatalogueService: SavedCatalogueService,
  ) {}

  ngOnInit(): void {
    this.loadSlabs(0);
  }

  /** Fetches one 20-slab page straight from the backend (newest first) — never the whole inventory at once. */
  async loadSlabs(page: number): Promise<void> {
    this.isLoading = true;
    await this.catalogueLookup.ensureLoaded();
    try {
      const res = await firstValueFrom(this.productService.getProductsPage('Slab', page, this.pageSize));
      this.totalElements = res.totalElements;
      this.totalPagesFromServer = Math.max(1, res.totalPages);
      this.pageNumber = page;

      const rows = res.content
        .filter(p => {
          const status = p.status?.toLowerCase();
          return status !== 'process' && status !== 'sold' && status !== 'pendingsold';
        })
        .filter(p => this.auth.canAccessLocation(p.godownLocation));

      this.currentPageRows = rows.map(product => this.getOrCreateSelection(product));
    } catch {
      this.toast.showError('Failed to load available slabs.');
    } finally {
      this.isLoading = false;
    }
  }

  /** Reuses the existing SlabSelection (keeping checked/yourRate/pieceChecks) if this product was already loaded before, so selections survive paging back and forth. */
  private getOrCreateSelection(product: Product): SlabSelection {
    const existing = this.selectionById.get(product.id);
    if (existing) {
      existing.product = product;
      return existing;
    }
    const fresh: SlabSelection = {
      product,
      checked: false,
      hasPieces: !!product.pieces?.length,
      mode: 'full',
      pieceChecks: (product.pieces || []).map(() => true),
      yourRate: null,
    };
    this.selectionById.set(product.id, fresh);
    return fresh;
  }

  // ── Role / location scoping ─────────────────────────────────────────────

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  get locationOptions() {
    if (this.isAdmin) return this.goDownLocations;
    const mine = this.auth.getCurrentLocations().map(l => l.toLowerCase());
    return this.goDownLocations.filter(g => mine.includes(g.label.toLowerCase()));
  }

  // ── Derived filter option lists (what's actually present in stock) ─────

  /** Reflects only what's been paged through so far — not the whole inventory, since that's never fully loaded. */
  get thicknessOptions(): string[] {
    const values = Array.from(this.selectionById.values()).map(s => String(s.product.productThickness || '')).filter(Boolean);
    return Array.from(new Set(values)).sort((a, b) => Number(a) - Number(b));
  }

  get qualityOptions(): string[] {
    const values = Array.from(this.selectionById.values()).map(s => s.product.productQuality).filter((v): v is string => !!v);
    return Array.from(new Set(values)).sort();
  }

  // ── Filtering (applies within the currently-loaded page only — see loadSlabs) ──

  applyFilters(): void {
    this.appliedFilters = { ...this.filters };
  }

  resetFilters(): void {
    this.filters = defaultFilters();
    this.appliedFilters = defaultFilters();
  }

  /**
   * Narrows the current server page's own rows — filtering can't reach
   * across pages that haven't been fetched yet, since the backend doesn't
   * support querying by these fields and the whole inventory is
   * deliberately never loaded at once (see loadSlabs).
   */
  get pageItems(): SlabSelection[] {
    const f = this.appliedFilters;
    return this.currentPageRows.filter(sel => {
      const p = sel.product;
      if (f.material && this.catalogueLookup.stoneFamily(p) !== f.material) return false;
      if (f.collection && this.catalogueLookup.collectionName(p) !== f.collection) return false;
      if (f.location && p.godownLocation?.toLowerCase() !== f.location.toLowerCase()) return false;
      const rate = this.rateFor(sel);
      if (f.minPrice != null && rate < f.minPrice) return false;
      if (f.maxPrice != null && rate > f.maxPrice) return false;
      if (f.thickness && String(p.productThickness || '') !== f.thickness) return false;
      if (f.quality && (p.productQuality || '') !== f.quality) return false;
      if (f.availability === 'Available Only' && p.status?.toLowerCase() !== 'available') return false;
      return true;
    });
  }

  get totalPages(): number {
    return this.totalPagesFromServer;
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages || page === this.pageNumber || this.isLoading) return;
    this.loadSlabs(page);
  }

  prevPage(): void { this.goToPage(this.pageNumber - 1); }
  nextPage(): void { this.goToPage(this.pageNumber + 1); }

  // ── Selection + pricing ─────────────────────────────────────────────────

  toggleSlab(sel: SlabSelection): void {
    sel.checked = !sel.checked;
  }

  /** Every slab selected so far, across every page visited this session — not just the current page. */
  get selectedSelections(): SlabSelection[] {
    return Array.from(this.selectionById.values()).filter(s => s.checked);
  }

  get selectedCount(): number {
    return this.selectedSelections.length;
  }

  get allPageSelected(): boolean {
    return this.pageItems.length > 0 && this.pageItems.every(s => s.checked);
  }

  toggleSelectAllOnPage(): void {
    const next = !this.allPageSelected;
    this.pageItems.forEach(s => s.checked = next);
  }

  clearSelection(): void {
    this.selectionById.forEach(s => s.checked = false);
  }

  currentRate(p: Product): number {
    return Number(p.sellingCost) || 0;
  }

  /** The rate this catalogue will actually quote: the typed "Your Rate" when set, the product's own sellingCost otherwise. */
  rateFor(sel: SlabSelection): number {
    return sel.yourRate ?? this.currentRate(sel.product);
  }

  applyBulkRate(): void {
    if (this.bulkRate == null || this.bulkRate <= 0) {
      this.toast.showError('Enter a valid rate first.');
      return;
    }
    if (!this.selectedCount) {
      this.toast.showError('Select at least one slab first.');
      return;
    }
    this.selectedSelections.forEach(sel => sel.yourRate = this.bulkRate);
    this.toast.showSuccess(`Rate applied to ${this.selectedCount} slab(s).`);
  }

  /** Quantity + sqft actually included for a slab, given its full/partial piece selection. */
  pieceSummary(sel: SlabSelection): { qty: number; sqft: number } {
    const p = sel.product;
    if (!sel.hasPieces) {
      return { qty: p.quantity || 0, sqft: Number(p.size) || Number(p.sqft) || 0 };
    }
    const pieces = sel.mode === 'full'
      ? p.pieces
      : p.pieces.filter((_, i) => sel.pieceChecks[i]);
    const sqft = pieces.reduce((s, pc) => s + (Number(pc.recheckedTotalArea) || Number(pc.totalArea) || 0), 0);
    return { qty: pieces.length, sqft };
  }

  get totalSqftSelected(): number {
    return this.selectedSelections.reduce((s, sel) => s + this.pieceSummary(sel).sqft, 0);
  }

  get avgRateSelected(): number {
    if (!this.selectedCount) return 0;
    const total = this.selectedSelections.reduce((s, sel) => s + this.rateFor(sel), 0);
    return total / this.selectedCount;
  }

  // ── Piece-level selection popup ──────────────────────────────────────────

  openDetails(sel: SlabSelection): void {
    if (!sel.hasPieces) return;
    this.activeDetail = sel;
  }

  closeDetails(): void {
    this.activeDetail = null;
  }

  setMode(sel: SlabSelection, mode: 'full' | 'partial'): void {
    sel.mode = mode;
    if (mode === 'full') sel.pieceChecks = sel.pieceChecks.map(() => true);
  }

  togglePiece(sel: SlabSelection, index: number): void {
    sel.pieceChecks[index] = !sel.pieceChecks[index];
  }

  selectAllPieces(sel: SlabSelection): void {
    sel.pieceChecks = sel.pieceChecks.map(() => true);
  }

  clearAllPieces(sel: SlabSelection): void {
    sel.pieceChecks = sel.pieceChecks.map(() => false);
  }

  checkedPieceCount(sel: SlabSelection): number {
    return sel.pieceChecks.filter(Boolean).length;
  }

  // ── Display helpers ───────────────────────────────────────────────────

  slabCode(p: Product): string {
    return p.slabNumber || p.productCode || '—';
  }

  stoneType(p: Product): string {
    return this.catalogueLookup.stoneType(p);
  }

  rowThumb(p: Product): string {
    const withImg = p.pieces?.find(pc => pc.imageUrl || pc.imageBase64);
    if (withImg) return withImg.imageUrl || withImg.imageBase64;
    if (p.imageUrls?.length) return p.imageUrls[0];
    return p.imageUrl || '';
  }

  goBack(): void {
    this.router.navigate(['/search']);
  }

  // ── Info / Company field toggles ─────────────────────────────────────────

  isInfoOn(key: InfoKey): boolean {
    return !!this.infoFields.find(f => f.key === key)?.checked;
  }

  toggleInfo(field: InfoOption): void {
    field.checked = !field.checked;
  }

  isCompanyOn(key: CompanyKey): boolean {
    return !!this.companyFields.find(f => f.key === key)?.checked;
  }

  toggleCompany(field: CompanyOption): void {
    field.checked = !field.checked;
  }

  setLayout(format: LayoutFormat): void {
    this.layoutFormat = format;
  }

  // ── Saved Catalogues ───────────────────────────────────────────────────

  async openSavedList(): Promise<void> {
    this.showSavedList = true;
    this.isLoadingSaved = true;
    try {
      this.savedCatalogues = await firstValueFrom(this.savedCatalogueService.getAll());
      this.savedCatalogues.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch {
      this.toast.showError('Failed to load saved catalogues.');
    } finally {
      this.isLoadingSaved = false;
    }
  }

  closeSavedList(): void {
    this.showSavedList = false;
  }

  async loadSavedCatalogue(c: SavedCatalogue): Promise<void> {
    this.currentSavedId = c.id || null;
    this.currentStatus = c.status === 'final' ? 'final' : 'draft';
    this.customerName = c.customerName || '';
    this.catalogueName = c.catalogueName || '';

    this.filters = {
      material: c.material || '',
      collection: c.collection || '',
      location: c.location || '',
      minPrice: c.minPrice ?? null,
      maxPrice: c.maxPrice ?? null,
      thickness: c.thickness || '',
      quality: c.quality || '',
      availability: c.availability || 'Available Only',
    };
    this.appliedFilters = { ...this.filters };

    this.layoutFormat = (c.layoutFormat as LayoutFormat) || 'premium';
    if (c.infoFields) this.infoFields.forEach(f => f.checked = c.infoFields!.includes(f.key));
    if (c.companyFields) this.companyFields.forEach(f => f.checked = c.companyFields!.includes(f.key));
    this.validityDays = c.validity || '7';

    // Clear whatever was selected before, then fetch (individually, since
    // these may be scattered across pages never browsed this session) any
    // referenced slab not already loaded, so the saved selection/rates are
    // correct in the summaries even though only one page is ever shown at once.
    this.selectionById.forEach(sel => { sel.checked = false; sel.yourRate = null; });

    const ids = c.selectedSlabIds || [];
    await Promise.all(ids.map(async id => {
      if (this.selectionById.has(id)) return;
      try {
        const product = await firstValueFrom(this.productService.getProduct(id));
        this.getOrCreateSelection(product);
      } catch {
        // The slab may have been deleted since this catalogue was saved — just skip it.
      }
    }));

    const rateMap = c.customRates || {};
    const idSet = new Set(ids);
    this.selectionById.forEach((sel, id) => {
      if (!idSet.has(id)) return;
      sel.checked = true;
      sel.yourRate = rateMap[id] ?? null;
    });

    await this.loadSlabs(0);
    this.showSavedList = false;
    this.toast.showSuccess('Catalogue loaded.');
  }

  async deleteSavedCatalogue(c: SavedCatalogue, event: Event): Promise<void> {
    event.stopPropagation();
    if (!c.id) return;
    try {
      await firstValueFrom(this.savedCatalogueService.delete(c.id));
      this.savedCatalogues = this.savedCatalogues.filter(x => x.id !== c.id);
      this.toast.showSuccess('Deleted.');
    } catch {
      this.toast.showError('Failed to delete.');
    }
  }

  newCatalogue(): void {
    this.currentSavedId = null;
    this.currentStatus = 'draft';
    this.customerName = '';
    this.catalogueName = '';
    this.filters = defaultFilters();
    this.appliedFilters = defaultFilters();
    this.selectionById.forEach(sel => { sel.checked = false; sel.yourRate = null; });
    this.bulkRate = null;
    this.showSavedList = false;
    if (this.pageNumber !== 0) this.loadSlabs(0);
  }

  private customRatesMap(): Record<string, number> {
    const map: Record<string, number> = {};
    this.selectedSelections.forEach(sel => { if (sel.yourRate != null) map[sel.product.id] = sel.yourRate; });
    return map;
  }

  async saveDraft(): Promise<void> {
    if (this.isSavingDraft) return;
    if (!this.catalogueName.trim()) {
      this.toast.showError('Enter a Catalogue Name before saving.');
      return;
    }
    this.isSavingDraft = true;
    try {
      const payload: SavedCatalogue = {
        id: this.currentSavedId || undefined,
        customerName: this.customerName,
        catalogueName: this.catalogueName,
        status: 'draft',
        material: this.appliedFilters.material,
        collection: this.appliedFilters.collection,
        location: this.appliedFilters.location,
        minPrice: this.appliedFilters.minPrice,
        maxPrice: this.appliedFilters.maxPrice,
        thickness: this.appliedFilters.thickness,
        quality: this.appliedFilters.quality,
        availability: this.appliedFilters.availability,
        selectedSlabIds: this.selectedSelections.map(s => s.product.id),
        customRates: this.customRatesMap(),
        layoutFormat: this.layoutFormat,
        infoFields: this.infoFields.filter(f => f.checked).map(f => f.key),
        companyFields: this.companyFields.filter(f => f.checked).map(f => f.key),
        validity: this.validityDays,
      };
      const saved = await firstValueFrom(this.savedCatalogueService.save(payload));
      this.currentSavedId = saved.id || this.currentSavedId;
      this.toast.showSuccess('Draft saved.');
    } catch {
      this.toast.showError('Failed to save draft.');
    } finally {
      this.isSavingDraft = false;
    }
  }

  // ── PDF generation ────────────────────────────────────────────────────

  private checkedInfoKeys(): InfoKey[] {
    return this.infoFields.filter(f => f.checked && f.key !== 'slabImage').map(f => f.key);
  }

  private infoValue(sel: SlabSelection, key: InfoKey): string | null {
    const p = sel.product;
    switch (key) {
      case 'stoneName':    return this.stoneType(p);
      case 'slabNumber':   return this.slabCode(p);
      case 'materialType': return this.catalogueLookup.stoneFamily(p) || '—';
      case 'collection':   return this.catalogueLookup.collectionName(p) || '—';
      case 'lotQuality':   return p.productQuality || '—';
      case 'thickness':    return p.productThickness ? `${p.productThickness} mm` : '—';
      case 'size':         return `${p.productLength || '—'} x ${p.productWidth || '—'}`;
      case 'totalSqft':    return this.pieceSummary(sel).sqft.toFixed(2);
      case 'rate':         return `Rs. ${this.rateFor(sel).toFixed(2)}`;
      case 'location':     return p.godownLocation || '—';
      case 'blockNumber':  return p.productCode || '—';
      case 'finish':       return p.productFinished || '—';
      case 'remarks':      return p.description || '—';
      default:              return null;
    }
  }

  private async loadImageMap(selections: SlabSelection[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    await Promise.all(selections.map(async sel => {
      const url = this.rowThumb(sel.product);
      if (!url) return;
      try {
        const dataUrl = url.startsWith('data:')
          ? url
          : await firstValueFrom(this.productService.downloadImage(url));
        map.set(sel.product.id, dataUrl);
      } catch {
        // Skip this slab's image — the catalogue still proceeds without it.
      }
    }));
    return map;
  }

  private dataUrlFormat(dataUrl: string): string {
    return (dataUrl.match(/^data:image\/(\w+);/)?.[1] || 'JPEG').toUpperCase();
  }

  private filenameFor(): string {
    const safeName = (this.catalogueName || 'Catalogue').replace(/[^a-z0-9]+/gi, '_');
    return `${safeName}_${Date.now()}.pdf`;
  }

  private drawHeader(doc: any, pageWidth: number, margin: number): number {
    let y = margin;
    if (this.isCompanyOn('logo')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('SETU MARBLE & HANDICRAFTS', margin, y);
      y += 7;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    if (this.catalogueName) { doc.text(this.catalogueName, margin, y); y += 5.5; }
    if (this.customerName) { doc.text(`For: ${this.customerName}`, margin, y); y += 5.5; }

    const bits: string[] = [];
    if (this.isCompanyOn('contact')) bits.push('Contact: +91-9222222637');
    if (this.isCompanyOn('showrooms')) bits.push('Showrooms: Banswara | Kishangarh | Moradabad');
    if (this.isCompanyOn('website')) bits.push('www.setumarble.com');
    if (bits.length) {
      doc.setFontSize(8);
      doc.text(bits.join('    |    '), margin, y, { maxWidth: pageWidth - margin * 2 });
      y += 5;
    }

    if (this.isCompanyOn('salesperson')) {
      doc.setFontSize(8);
      doc.text('Salesperson: —', margin, y);
      y += 4.5;
    }

    if (this.isCompanyOn('validity')) {
      doc.setFontSize(8);
      const validUntil = new Date(Date.now() + Number(this.validityDays || 7) * 86400000).toLocaleDateString();
      doc.text(`Date: ${new Date().toLocaleDateString()}    Valid until: ${validUntil}`, margin, y);
      y += 4.5;
    }

    if (this.isCompanyOn('terms')) {
      doc.setFontSize(7);
      doc.text('Prices are indicative and subject to confirmation at the time of booking.', margin, y);
      y += 4;
    }

    y += 2;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    return y + 6;
  }

  private drawCard(doc: any, sel: SlabSelection, box: { x: number; y: number; w: number; h: number }, imageMap: Map<string, string>, fontSize: number): void {
    const p = sel.product;
    doc.setDrawColor(215);
    doc.rect(box.x, box.y, box.w, box.h);

    const showImage = this.isInfoOn('slabImage');
    const imgSize = showImage ? Math.max(0, Math.min(box.w * 0.35, box.h - 8)) : 0;
    const textX = box.x + (showImage ? imgSize + 8 : 4);
    const textW = box.w - (showImage ? imgSize + 12 : 8);

    if (showImage) {
      const dataUrl = imageMap.get(p.id);
      if (dataUrl) {
        try {
          doc.addImage(dataUrl, this.dataUrlFormat(dataUrl), box.x + 4, box.y + 4, imgSize, imgSize);
        } catch {
          // Skip a broken image rather than failing the whole card.
        }
      }
    }

    let ty = box.y + fontSize * 0.5 + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize + 2);
    doc.text(this.slabCode(p), textX, ty, { maxWidth: textW });
    ty += fontSize * 0.7 + 3;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    const lineGap = fontSize * 0.55 + 2.2;

    for (const key of this.checkedInfoKeys()) {
      if (ty > box.y + box.h - 3) break;
      const value = this.infoValue(sel, key);
      if (value == null) continue;
      doc.text(`${INFO_LABELS[key]}: ${value}`, textX, ty, { maxWidth: textW });
      ty += lineGap;
    }
  }

  private renderPremium(doc: any, selected: SlabSelection[], imageMap: Map<string, string>, margin: number, pageWidth: number, pageHeight: number, startY: number): void {
    selected.forEach((sel, i) => {
      const top = i === 0 ? startY : margin;
      if (i > 0) doc.addPage();
      this.drawCard(doc, sel, { x: margin, y: top, w: pageWidth - margin * 2, h: pageHeight - top - margin }, imageMap, 11);
    });
  }

  private renderStandard(doc: any, selected: SlabSelection[], imageMap: Map<string, string>, margin: number, pageWidth: number, pageHeight: number, startY: number): void {
    const gap = 6;
    selected.forEach((sel, i) => {
      const pageIndex = Math.floor(i / 2);
      const slot = i % 2;
      if (i > 0 && slot === 0) doc.addPage();
      const top = pageIndex === 0 ? startY : margin;
      const available = pageHeight - margin - top;
      const cardH = (available - gap) / 2;
      const y = top + slot * (cardH + gap);
      this.drawCard(doc, sel, { x: margin, y, w: pageWidth - margin * 2, h: cardH }, imageMap, 9.5);
    });
  }

  private renderQuick(doc: any, selected: SlabSelection[], imageMap: Map<string, string>, margin: number, pageWidth: number, pageHeight: number, startY: number): void {
    const gap = 5, cols = 2, rows = 2, perPage = cols * rows;
    selected.forEach((sel, i) => {
      const pageIndex = Math.floor(i / perPage);
      const posInPage = i % perPage;
      if (i > 0 && posInPage === 0) doc.addPage();
      const top = pageIndex === 0 ? startY : margin;
      const available = pageHeight - margin - top;
      const cardW = (pageWidth - margin * 2 - gap) / cols;
      const cardH = (available - gap) / rows;
      const col = posInPage % cols;
      const row = Math.floor(posInPage / cols);
      const x = margin + col * (cardW + gap);
      const y = top + row * (cardH + gap);
      this.drawCard(doc, sel, { x, y, w: cardW, h: cardH }, imageMap, 7.5);
    });
  }

  private renderPriceList(doc: any, autoTable: any, selected: SlabSelection[], margin: number, startY: number): void {
    const keys = this.checkedInfoKeys();
    autoTable(doc, {
      head: [keys.map(k => INFO_LABELS[k])],
      body: selected.map(sel => keys.map(k => this.infoValue(sel, k) ?? '—')),
      startY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [28, 28, 30] },
      margin: { left: margin, right: margin },
    });
  }

  /** Builds the jsPDF document for the current selection + settings. Shared by preview and direct download. */
  private async buildDocument(selected: SlabSelection[]): Promise<any> {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;

    const startY = this.drawHeader(doc, pageWidth, margin);
    const imageMap = this.isInfoOn('slabImage') ? await this.loadImageMap(selected) : new Map<string, string>();

    switch (this.layoutFormat) {
      case 'standard':  this.renderStandard(doc, selected, imageMap, margin, pageWidth, pageHeight, startY); break;
      case 'quick':     this.renderQuick(doc, selected, imageMap, margin, pageWidth, pageHeight, startY); break;
      case 'pricelist': this.renderPriceList(doc, autoTable, selected, margin, startY); break;
      default:          this.renderPremium(doc, selected, imageMap, margin, pageWidth, pageHeight, startY); break;
    }

    return doc;
  }

  /** Builds the catalogue PDF and opens it in an in-page preview — nothing is downloaded yet. */
  async previewPdf(): Promise<void> {
    if (this.isGenerating) return;
    const selected = this.selectedSelections;
    if (!selected.length) {
      this.toast.showError('Select at least one slab to generate the catalogue.');
      return;
    }

    this.isGenerating = true;
    try {
      const doc = await this.buildDocument(selected);
      const blob = doc.output('blob');
      this.clearPreviewUrl();
      this.previewBlobUrl = URL.createObjectURL(blob);
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewBlobUrl);
      this.previewDoc = doc;
      this.showPreview = true;
    } catch {
      this.toast.showError('Failed to generate the catalogue PDF.');
    } finally {
      this.isGenerating = false;
    }
  }

  /** "Generate PDF Catalogue" — builds and downloads immediately, no preview gate. */
  async generateAndDownload(): Promise<void> {
    if (this.isGenerating) return;
    const selected = this.selectedSelections;
    if (!selected.length) {
      this.toast.showError('Select at least one slab to generate the catalogue.');
      return;
    }

    this.isGenerating = true;
    try {
      const doc = await this.buildDocument(selected);
      doc.save(this.filenameFor());
      this.toast.showSuccess('Catalogue downloaded.');
    } catch {
      this.toast.showError('Failed to generate the catalogue PDF.');
    } finally {
      this.isGenerating = false;
    }
  }

  /** User approved the preview — actually save the file. */
  confirmDownload(): void {
    if (!this.previewDoc) return;
    this.previewDoc.save(this.filenameFor());
    this.closePreview();
    this.toast.showSuccess('Catalogue downloaded.');
  }

  closePreview(): void {
    this.showPreview = false;
    this.previewDoc = null;
    this.clearPreviewUrl();
  }

  private clearPreviewUrl(): void {
    if (this.previewBlobUrl) {
      URL.revokeObjectURL(this.previewBlobUrl);
      this.previewBlobUrl = null;
    }
    this.previewUrl = null;
  }
}

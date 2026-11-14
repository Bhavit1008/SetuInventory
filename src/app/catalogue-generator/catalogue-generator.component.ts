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

/** One selectable slab in the generator, plus its piece-level selection state (only meaningful when hasPieces). */
interface SlabSelection {
  product: Product;
  checked: boolean;
  hasPieces: boolean;
  /** 'full' includes every piece/the whole quantity; 'partial' only the pieces flagged true in pieceChecks. */
  mode: 'full' | 'partial';
  pieceChecks: boolean[];
  /** Which details this SPECIFIC slab prints with in the PDF — set independently per slab via its detail popup. */
  fields: FieldOption[];
}

type FieldKey = 'images' | 'location' | 'quality' | 'size' | 'quantity' | 'sqft' | 'pieceBreakdown';

interface FieldOption {
  key: FieldKey;
  label: string;
  checked: boolean;
}

function defaultFieldOptions(): FieldOption[] {
  return [
    { key: 'images',         label: 'Images',               checked: true },
    { key: 'location',       label: 'Godown Location',      checked: true },
    { key: 'quality',        label: 'Quality',               checked: true },
    { key: 'size',           label: 'Size (L x W)',          checked: true },
    { key: 'quantity',       label: 'Quantity',               checked: true },
    { key: 'sqft',           label: 'Sqft',                   checked: true },
    { key: 'pieceBreakdown', label: 'Per-piece breakdown',    checked: true },
  ];
}

/**
 * Lets an employee build a PDF catalogue from a hand-picked set of slabs
 * currently in stock — selecting whole slabs, or (for slabs entered with a
 * piece grid) just a subset of individual pieces — choosing which details
 * appear in the PDF, with a free-text description to accompany them, and
 * previewing the result before it's actually downloaded.
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
  description = '';

  selections: SlabSelection[] = [];

  goDownLocations = [
    { id: 1, label: 'Kishangarh' },
    { id: 2, label: 'Moradabad' },
    { id: 3, label: 'Banswara' },
  ];
  selectedLocation = '';

  pageNumber = 0;
  pageSize = 24;

  /** The slab currently open in the details popup — null when no popup is showing. */
  activeDetail: SlabSelection | null = null;

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
  ) {}

  ngOnInit(): void {
    this.loadSlabs();
  }

  async loadSlabs(): Promise<void> {
    this.isLoading = true;
    try {
      const res = await firstValueFrom(this.productService.getProductsPage('Slab', 0, 5000));
      const available = res.content
        .filter(p => {
          const status = p.status?.toLowerCase();
          return status !== 'process' && status !== 'sold' && status !== 'pendingsold';
        })
        .filter(p => this.auth.canAccessLocation(p.godownLocation));

      this.selections = available.map(product => ({
        product,
        checked: false,
        hasPieces: !!product.pieces?.length,
        mode: 'full',
        pieceChecks: (product.pieces || []).map(() => true),
        fields: defaultFieldOptions(),
      }));
    } catch {
      this.toast.showError('Failed to load available slabs.');
    } finally {
      this.isLoading = false;
    }
  }

  // ── Slab selection ─────────────────────────────────────────────────────

  toggleSlab(sel: SlabSelection): void {
    sel.checked = !sel.checked;
  }

  openDetails(sel: SlabSelection): void {
    this.activeDetail = sel;
  }

  closeDetails(): void {
    this.activeDetail = null;
  }

  setMode(sel: SlabSelection, mode: 'full' | 'partial'): void {
    sel.mode = mode;
    if (mode === 'full') {
      sel.pieceChecks = sel.pieceChecks.map(() => true);
    }
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

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  /** Admin can filter by every godown; a store manager only by their own assigned ones (Ankit's two-godown exception is just his storeLocations array having both entries). */
  get locationOptions() {
    if (this.isAdmin) return this.goDownLocations;
    const mine = this.auth.getCurrentLocations().map(l => l.toLowerCase());
    return this.goDownLocations.filter(g => mine.includes(g.label.toLowerCase()));
  }

  /** The full in-stock set (already location-scoped to what this user may see) narrowed by the on-screen location filter. */
  get filteredSelections(): SlabSelection[] {
    if (!this.selectedLocation) return this.selections;
    return this.selections.filter(s => s.product.godownLocation?.toLowerCase() === this.selectedLocation.toLowerCase());
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredSelections.length / this.pageSize));
  }

  /** Only this page's slabs are rendered — keeps the image/piece-grid DOM (and thumbnail loads) small instead of all in-stock slabs at once. */
  get pageItems(): SlabSelection[] {
    const start = this.pageNumber * this.pageSize;
    return this.filteredSelections.slice(start, start + this.pageSize);
  }

  onLocationChange(): void {
    this.pageNumber = 0;
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.pageNumber = page;
  }

  prevPage(): void { this.goToPage(this.pageNumber - 1); }
  nextPage(): void { this.goToPage(this.pageNumber + 1); }

  get selectedSelections(): SlabSelection[] {
    return this.selections.filter(s => s.checked);
  }

  get selectedCount(): number {
    return this.selectedSelections.length;
  }

  /** "Select all" covers every slab matching the current location filter, not just the visible page. */
  get allSelected(): boolean {
    return this.filteredSelections.length > 0 && this.filteredSelections.every(s => s.checked);
  }

  toggleSelectAll(): void {
    const next = !this.allSelected;
    this.filteredSelections.forEach(s => s.checked = next);
  }

  /** Quantity + sqft actually included for a slab, given its full/partial selection. */
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

  slabCode(p: Product): string {
    return p.slabNumber || p.productCode || '—';
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

  // ── Field options (what shows up in the PDF — isolated per slab) ──────

  isFieldOn(sel: SlabSelection, key: FieldKey): boolean {
    return !!sel.fields.find(f => f.key === key)?.checked;
  }

  toggleField(field: FieldOption): void {
    field.checked = !field.checked;
  }

  // ── PDF generation ────────────────────────────────────────────────────

  private async loadImageMap(selections: SlabSelection[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    await Promise.all(selections.filter(sel => this.isFieldOn(sel, 'images')).map(async sel => {
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

  private selectedPieceRows(sel: SlabSelection): SlabPieces[] {
    return sel.product.pieces.filter((_, i) => sel.pieceChecks[i]);
  }

  private filenameFor(): string {
    return `Catalogue_${Date.now()}.pdf`;
  }

  /** Builds the jsPDF document for the current selection + field options. Shared by preview and download. */
  private async buildDocument(selected: SlabSelection[]): Promise<any> {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Stone Catalogue', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(new Date().toLocaleDateString(), margin, y);
    y += 8;

    if (this.description.trim()) {
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(this.description.trim(), pageWidth - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 6;
    }

    const imageMap = await this.loadImageMap(selected);
    const IMAGE_SIZE = 38;

    for (const sel of selected) {
      const p = sel.product;
      const includeImages = this.isFieldOn(sel, 'images');
      const dataUrl = includeImages ? imageMap.get(p.id) : undefined;
      const textX = includeImages ? margin + IMAGE_SIZE + 8 : margin;

      const summary = this.pieceSummary(sel);
      const textLines: string[] = [];
      if (this.isFieldOn(sel, 'location') || this.isFieldOn(sel, 'quality')) {
        const parts: string[] = [];
        if (this.isFieldOn(sel, 'location')) parts.push(`Location: ${p.godownLocation || '—'}`);
        if (this.isFieldOn(sel, 'quality')) parts.push(`Quality: ${p.productQuality || '—'}`);
        textLines.push(parts.join('    '));
      }
      if (this.isFieldOn(sel, 'size')) {
        textLines.push(`Size: ${p.productLength || '—'} x ${p.productWidth || '—'}`);
      }
      if (this.isFieldOn(sel, 'quantity') || this.isFieldOn(sel, 'sqft')) {
        const parts: string[] = [];
        if (this.isFieldOn(sel, 'quantity')) parts.push(`Quantity: ${summary.qty}${sel.hasPieces && sel.mode === 'partial' ? ` of ${p.pieces.length}` : ''}`);
        if (this.isFieldOn(sel, 'sqft')) parts.push(`Sqft: ${summary.sqft.toFixed(2)}`);
        textLines.push(parts.join('    '));
      }

      const textBlockHeight = 6 + textLines.length * 5;
      const blockHeight = includeImages ? Math.max(IMAGE_SIZE + 4, textBlockHeight) : textBlockHeight;

      if (y + blockHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      if (dataUrl) {
        try {
          doc.addImage(dataUrl, this.dataUrlFormat(dataUrl), margin, y, IMAGE_SIZE, IMAGE_SIZE);
        } catch {
          // Skip a broken image rather than failing the whole export.
        }
      }

      let ty = y + 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(this.slabCode(p), textX, ty);
      ty += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      for (const line of textLines) {
        doc.text(line, textX, ty);
        ty += 5;
      }

      y += blockHeight;

      if (sel.hasPieces && sel.mode === 'partial' && this.isFieldOn(sel, 'pieceBreakdown')) {
        const rows = this.selectedPieceRows(sel).map((pc, i) => [
          String(i + 1),
          `${pc.length} x ${pc.width}`,
          (Number(pc.recheckedTotalArea) || Number(pc.totalArea) || 0).toFixed(2),
        ]);

        if (rows.length) {
          const neededHeight = rows.length * 6 + 12;
          if (y + neededHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          autoTable(doc, {
            head: [['Piece', 'Size (in)', 'Sqft']],
            body: rows,
            startY: y,
            margin: { left: textX, right: margin },
            styles: { fontSize: 8 },
            headStyles: { fillColor: [28, 28, 30] },
            tableWidth: pageWidth - textX - margin,
          });
          y = (doc as any).lastAutoTable.finalY + 8;
        }
      }

      doc.setDrawColor(220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
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

  /** User approved the preview — actually save the file. */
  confirmDownload(): void {
    if (!this.previewDoc) return;
    this.previewDoc.save(this.filenameFor());
    this.closePreview();
    this.toast.showSuccess('Catalogue downloaded.');
  }

  /** User wants to tweak the selection/fields instead — discard the preview without downloading. */
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

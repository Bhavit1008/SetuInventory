import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Product } from '../model/product';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ProductService } from '../services/product.service';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { ApprovalService, ApprovalRequest } from '../services/approval.service';

const CATALOGUE_BASE = 'https://setu-crm.onrender.com/catalogue';

@Component({
  selector: 'app-view-product',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './view-product.component.html',
  styleUrl: './view-product.component.css'
})
export class ViewProductComponent implements OnInit {
  product: Product;

  zoomImgSrc: string | null = null;
  zoomSlabId: number | null = null;
  activeImgIdx = 0;

  /**
   * Blocks show their own block-level photo(s). Slabs show each piece's own
   * photo instead — a block-level image (e.g. inherited from the source
   * block on conversion) is only used as a fallback when no piece has one,
   * since a standalone slab never has a block image to begin with.
   */
  get productImages(): string[] {
    if (this.product?.category?.toLowerCase() === 'slab') {
      const pieceImages = (this.product.pieces || [])
        .map(p => p.imageUrl || p.imageBase64)
        .filter((src): src is string => !!src);
      if (pieceImages.length) return pieceImages;
    }
    if (this.product?.imageUrls?.length) return this.product.imageUrls;
    if (this.product?.imageUrl) return [this.product.imageUrl];
    return [];
  }

  /**
   * A slab's own identity is its slab number, not the (possibly inherited)
   * block code it was converted from — so slabs display slabNumber when set,
   * falling back to productCode only for legacy slabs without one. Blocks
   * are unaffected and always show their own productCode.
   */
  get displayCode(): string {
    if (this.product?.category?.toLowerCase() === 'slab' && this.product.slabNumber) {
      return this.product.slabNumber;
    }
    return this.product?.productCode || '';
  }

  // Admin: delete confirmation
  showDeleteConfirm = false;
  isDeleting = false;

  // Manager: request confirmation (delete only — sell now goes through the Sold-details popup)
  showRequestPopup = false;
  pendingRequestAction: 'delete' | null = null;
  isSubmittingRequest = false;

  // Marble (catalogue) details popup — Blocks only
  showMarblePopup = false;
  isLoadingMarble = false;
  marbleNotFound = false;
  marble: Record<string, any> | null = null;

  // Source block details popup — Slabs converted from a Block only
  showBlockDetailsPopup = false;
  blockPopupImgIdx = 0;

  // PDF export
  isExportingPdf = false;

  // Sold details popup — Slabs capture quantity + running sqft, Blocks capture weight sold instead.
  // soldDate is common to both and defaults to today.
  showSoldPopup = false;
  isSubmittingSold = false;
  soldForm: { partyName: string; soldQuantity: number | null; soldSqft: number | null; weightSold: number | null; soldDate: string } =
    { partyName: '', soldQuantity: null, soldSqft: null, weightSold: null, soldDate: '' };

  constructor(
    private router: Router,
    private http: HttpClient,
    private productService: ProductService,
    private toastService: ToastService,
    public auth: AuthService,
    private approvalService: ApprovalService
  ) {
    const nav = this.router.getCurrentNavigation();
    this.product = nav?.extras?.state?.['product'];
  }

  async ngOnInit(): Promise<void> {
    if (this.product?.id) {
      await this.approvalService.refresh();
    }
  }

  // ── Role helpers ────────────────────────────────────────────────────────

  get isAdmin(): boolean { return this.auth.isAdmin(); }

  goToDashboard(): void {
    this.router.navigate(['/search']);
  }

  get isBlock(): boolean {
    return this.product?.category?.toLowerCase() === 'block';
  }

  get isSlab(): boolean {
    return this.product?.category?.toLowerCase() === 'slab';
  }

  /** True only for a slab that was actually converted from a block — never for a standalone slab. */
  get hasSourceBlock(): boolean {
    return this.isSlab && !!this.product?.sourceBlock;
  }

  get sourceBlockImages(): string[] {
    const block = this.product?.sourceBlock;
    if (!block) return [];
    if (block.imageUrls?.length) return block.imageUrls;
    if (block.imageUrl) return [block.imageUrl];
    return [];
  }

  // ── Source block details popup ──────────────────────────────────────────

  openBlockDetailsPopup(): void {
    if (!this.hasSourceBlock) return;
    this.blockPopupImgIdx = 0;
    this.showBlockDetailsPopup = true;
  }

  closeBlockDetailsPopup(): void {
    this.showBlockDetailsPopup = false;
  }

  // ── Marble (catalogue) details popup ──────────────────────────────────

  async openMarbleDetails(): Promise<void> {
    this.showMarblePopup = true;
    if (this.marble || this.marbleNotFound) return; // already resolved, don't refetch

    this.isLoadingMarble = true;
    try {
      if (this.product.catalogueItemId) {
        this.marble = await firstValueFrom(
          this.http.get<Record<string, any>>(`${CATALOGUE_BASE}/${this.product.catalogueItemId}`)
        );
      } else if (this.product.productQuality) {
        // Blocks saved before catalogueItemId existed — best-effort match by name.
        const all = await firstValueFrom(this.http.get<Record<string, any>[]>(`${CATALOGUE_BASE}/all`));
        this.marble = all.find(
          m => m['marbleName']?.toLowerCase() === this.product.productQuality.toLowerCase()
        ) ?? null;
      }
      if (!this.marble) this.marbleNotFound = true;
    } catch {
      this.marbleNotFound = true;
    } finally {
      this.isLoadingMarble = false;
    }
  }

  closeMarblePopup(): void {
    this.showMarblePopup = false;
  }

  marbleVal(key: string): string {
    const v = this.marble?.[key];
    if (v === null || v === undefined || v === '') return '—';
    return String(v);
  }

  marbleList(key: string): string {
    const v = this.marble?.[key];
    return Array.isArray(v) && v.length ? v.join(', ') : '—';
  }

  get existingPendingRequest(): ApprovalRequest | null {
    if (!this.product?.id) return null;
    return this.approvalService.hasPendingForProduct(this.product.id);
  }

  // ── PDF Export helpers ──────────────────────────────────────────────────

  get exportGridItems(): { src: string; label: string }[] {
    if (this.product?.pieces?.length) {
      return this.product.pieces
        .filter(p => p.imageUrl || p.imageBase64)
        .map(p => ({ src: p.imageUrl || p.imageBase64, label: '#' + p.id }));
    }
    return this.productImages.map((src, i) => ({ src, label: '#' + (i + 1) }));
  }

  get exportDimensions(): string {
    if (!this.product) return '—';
    if (this.isBlock) {
      return `${this.product.productLength}" × ${this.product.productWidth}" × ${this.product.productHeight}"`;
    }
    return `${this.product.productLength}" × ${this.product.productWidth}"`;
  }

  get exportStat3Label(): string {
    return this.isBlock ? 'Weight' : 'Thickness';
  }

  get exportStat3Value(): string {
    if (this.isBlock) {
      return this.product?.productWeight ? `${this.product.productWeight} TONS` : '—';
    }
    return this.product?.productThickness ? `${this.product.productThickness} MM` : '—';
  }

  async exportAsPdf(): Promise<void> {
    if (this.isExportingPdf || !this.product) return;
    this.isExportingPdf = true;
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const el = document.getElementById('pdf-export-template');
      if (!el) return;

      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${this.displayCode || 'product'}-details.pdf`);
    } catch {
      this.toastService.showError('Failed to export PDF.');
    } finally {
      this.isExportingPdf = false;
    }
  }

  // ── Image Zoom ──────────────────────────────────────────────────────────

  get totalSqft(): string {
    if (this.product?.pieces?.length) {
      const sum = this.product.pieces.reduce(
        (acc, piece) => acc + (Number(piece.totalArea) || 0), 0
      );
      return sum % 1 === 0 ? sum.toString() : sum.toFixed(2);
    }
    return this.product?.size?.toString() || '—';
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'available': return 'status-available';
      case 'sold':      return 'status-sold';
      case 'hold':      return 'status-hold';
      default:          return 'status-default';
    }
  }

  openZoom(imgSrc: string, slabId: number): void {
    this.zoomImgSrc = imgSrc;
    this.zoomSlabId = slabId;
  }

  openZoomImg(src: string): void {
    this.zoomImgSrc = src;
    this.zoomSlabId = null;
  }

  closeZoom(): void {
    this.zoomImgSrc = null;
    this.zoomSlabId = null;
  }

  // ── Navigation Actions ──────────────────────────────────────────────────

  editProduct(): void {
    if (this.product.category.toLowerCase() === 'slab') {
      this.router.navigate(['/slab'], { state: { formData: this.product } });
    } else {
      this.router.navigate(['/blocks'], { state: { formData: this.product } });
    }
  }

  addIntransit(): void {
    this.router.navigate(['/intransit'], { state: { product: this.product } });
  }

  convertToSlab(): void {
    this.router.navigate(['/slab'], { state: { formData: this.product } });
  }

  // ── Admin: direct Status / Delete actions ───────────────────────────────

  /**
   * Opens the Sold-details popup instead of updating status immediately —
   * party name, quantity and sqft must be captured first. Used by both the
   * admin's direct "Sold" button and the store manager's "Request Sell"
   * button; the confirm button in the popup branches by role (see template).
   */
  openSoldPopup(): void {
    this.soldForm = {
      partyName: '', soldQuantity: null, soldSqft: null, weightSold: null,
      soldDate: new Date().toISOString().slice(0, 10),
    };
    this.showSoldPopup = true;
  }
  onProcess(): void { this.updateStatus('Process'); }
  /** Reverses a block sent to Process back to Available — moves it back out of Process Inventory. */
  onReverseProcess(): void { this.updateStatus('Available'); }

  private updateStatus(newStatus: string, extra: Partial<Product> = {}): void {
    if (!this.product?.id) return;
    this.productService.updateProductStatus(this.product, newStatus, extra).subscribe({
      next: () => {
        Object.assign(this.product, extra, { status: newStatus });
        this.toastService.showSuccess(`Status updated to "${newStatus}".`);
      },
      error: () => this.toastService.showError('Failed to update status.')
    });
  }

  // ── Admin: confirm Sold directly ────────────────────────────────────────

  cancelSoldPopup(): void {
    this.showSoldPopup = false;
  }

  /**
   * Validates the Sold-details form and builds the extra fields to persist.
   * Blocks are sold as a whole by weight (tons); Slabs are sold by quantity
   * + running sqft — different units, so different fields are required.
   * Returns null (and shows a toast) if validation fails.
   */
  private buildSoldExtra(): Partial<Product> | null {
    const partyName = this.soldForm.partyName?.trim();
    if (!partyName) {
      this.toastService.showError('Party name is required.');
      return null;
    }

    if (!this.soldForm.soldDate) {
      this.toastService.showError('Date sold is required.');
      return null;
    }
    const soldDate = new Date(this.soldForm.soldDate).getTime();
    if (isNaN(soldDate)) {
      this.toastService.showError('Enter a valid date sold.');
      return null;
    }

    if (this.isBlock) {
      if (!this.soldForm.weightSold || this.soldForm.weightSold <= 0) {
        this.toastService.showError('Enter the weight sold.');
        return null;
      }
      return { partyName, weightSold: this.soldForm.weightSold, soldDate };
    }

    if (!this.soldForm.soldQuantity || this.soldForm.soldQuantity <= 0) {
      this.toastService.showError('Enter the number of slabs sold.');
      return null;
    }
    if (!this.soldForm.soldSqft || this.soldForm.soldSqft <= 0) {
      this.toastService.showError('Enter the running sqft.');
      return null;
    }
    return { partyName, soldQuantity: this.soldForm.soldQuantity, soldSqft: this.soldForm.soldSqft, soldDate };
  }

  confirmSold(): void {
    if (!this.product?.id || this.isSubmittingSold) return;

    const extra = this.buildSoldExtra();
    if (!extra) return;

    this.isSubmittingSold = true;
    this.productService.updateProductStatus(this.product, 'Sold', extra).subscribe({
      next: () => {
        Object.assign(this.product, extra, { status: 'Sold' });
        this.toastService.showSuccess('Marked as Sold.');
        this.showSoldPopup = false;
        this.isSubmittingSold = false;
      },
      error: () => {
        this.toastService.showError('Failed to update status.');
        this.isSubmittingSold = false;
      }
    });
  }

  confirmDelete(): void { this.showDeleteConfirm = true; }
  cancelDelete(): void  { this.showDeleteConfirm = false; }

  deleteProduct(): void {
    if (!this.product?.id || this.isDeleting) return;
    this.isDeleting = true;
    this.productService.deleteProduct(this.product.id).subscribe({
      next: () => {
        this.toastService.showSuccess('Product deleted successfully.');
        this.isDeleting = false;
        this.showDeleteConfirm = false;
        this.router.navigate(['/search']);
      },
      error: () => {
        this.toastService.showError('Failed to delete product.');
        this.isDeleting = false;
        this.showDeleteConfirm = false;
      }
    });
  }

  // ── Manager: delete request flow ────────────────────────────────────────

  openRequestPopup(action: 'delete'): void {
    this.pendingRequestAction = action;
    this.showRequestPopup = true;
  }

  cancelRequest(): void {
    this.showRequestPopup = false;
    this.pendingRequestAction = null;
  }

  async submitRequest(): Promise<void> {
    if (!this.pendingRequestAction || !this.product?.id || this.isSubmittingRequest) return;
    this.isSubmittingRequest = true;

    try {
      await this.approvalService.submit({
        type: this.pendingRequestAction,
        productId: this.product.id,
        productCode: this.product.productCode,
        productCategory: this.product.category,
        productSnapshot: { ...this.product },
        requestedBy: this.auth.getCurrentUser() ?? 'store_manager',
      });
      this.toastService.showSuccess('Deletion request submitted for admin approval.');
    } catch {
      this.toastService.showError('Failed to submit request. Please try again.');
    } finally {
      this.isSubmittingRequest = false;
      this.showRequestPopup = false;
      this.pendingRequestAction = null;
    }
  }

  // ── Sell: shared Sold-details popup ─────────────────────────────────────
  // Admin uses it to mark Sold directly (confirmSold); the store manager
  // uses the same popup to capture the same details up front, but submits
  // an approval request instead (submitSellRequest) — the admin then sees
  // those details on the request card and applies them on approval.

  async submitSellRequest(): Promise<void> {
    if (!this.product?.id || this.isSubmittingSold) return;

    const extra = this.buildSoldExtra();
    if (!extra) return;

    this.isSubmittingSold = true;
    try {
      await this.approvalService.submit({
        type: 'sell',
        productId: this.product.id,
        productCode: this.product.productCode,
        productCategory: this.product.category,
        productSnapshot: { ...this.product, ...extra },
        requestedBy: this.auth.getCurrentUser() ?? 'store_manager',
      });
      this.toastService.showSuccess('Sale request submitted for admin approval.');
      this.showSoldPopup = false;
    } catch {
      this.toastService.showError('Failed to submit request. Please try again.');
    } finally {
      this.isSubmittingSold = false;
    }
  }
}

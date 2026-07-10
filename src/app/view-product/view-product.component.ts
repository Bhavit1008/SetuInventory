import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Product } from '../model/product';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, RouterLink],
  templateUrl: './view-product.component.html',
  styleUrl: './view-product.component.css'
})
export class ViewProductComponent implements OnInit {
  product: Product;

  zoomImgSrc: string | null = null;
  zoomSlabId: number | null = null;
  activeImgIdx = 0;

  get productImages(): string[] {
    if (this.product?.imageUrls?.length) return this.product.imageUrls;
    if (this.product?.imageUrl) return [this.product.imageUrl];
    return [];
  }

  // Admin: delete confirmation
  showDeleteConfirm = false;
  isDeleting = false;

  // Manager: request confirmation
  showRequestPopup = false;
  pendingRequestAction: 'delete' | 'sell' | null = null;
  isSubmittingRequest = false;

  // Marble (catalogue) details popup — Blocks only
  showMarblePopup = false;
  isLoadingMarble = false;
  marbleNotFound = false;
  marble: Record<string, any> | null = null;

  // PDF export
  isExportingPdf = false;

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

  get isBlock(): boolean {
    return this.product?.category?.toLowerCase() === 'block';
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

      pdf.save(`${this.product.productCode || 'product'}-details.pdf`);
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

  onSold(): void { this.updateStatus('Sold'); }
  onProcess(): void { this.updateStatus('Process'); }

  private updateStatus(newStatus: string): void {
    if (!this.product?.id) return;
    this.productService.updateProductStatus(this.product, newStatus).subscribe({
      next: () => {
        this.product.status = newStatus;
        this.toastService.showSuccess(`Status updated to "${newStatus}".`);
      },
      error: () => this.toastService.showError('Failed to update status.')
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

  // ── Manager: request flow ───────────────────────────────────────────────

  openRequestPopup(action: 'delete' | 'sell'): void {
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
      this.toastService.showSuccess(
        `${this.pendingRequestAction === 'delete' ? 'Deletion' : 'Sale'} request submitted for admin approval.`
      );
    } catch {
      this.toastService.showError('Failed to submit request. Please try again.');
    } finally {
      this.isSubmittingRequest = false;
      this.showRequestPopup = false;
      this.pendingRequestAction = null;
    }
  }
}

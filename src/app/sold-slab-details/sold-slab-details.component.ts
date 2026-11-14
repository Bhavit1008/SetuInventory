import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Product } from '../model/product';
import { SlabPieces } from '../model/slab-pieces';
import { ProductService } from '../services/product.service';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { ApprovalService } from '../services/approval.service';

interface RecheckRow {
  piece: SlabPieces;
  sold: boolean;
  recheckedLength: number | null;
  recheckedWidth: number | null;
}

/**
 * Opened instead of the simple Sold-details popup for any Slab product that
 * has grid pieces — lets whoever is recording the sale (admin directly, or a
 * store manager via a staged request) recheck each physical piece's
 * measurements and choose, piece by piece, whether it actually sold.
 *
 * On submit the pieces are split: checked ("sold") pieces are committed as a
 * Sold (admin) or PendingSold (store manager, awaiting approval) record — the
 * original record itself, if every piece sold, otherwise a new record, since
 * the original id must keep living in Slab Inventory for the leftover stock.
 * Unchecked pieces stay on the original id/status, so they keep showing up
 * in Slab Inventory untouched.
 *
 * Also doubles as a read-only review screen: the Sold Staging page opens
 * this same component with `{ product: <the staged product>, reviewMode:
 * true }` instead of a live editable product, so the admin can see the full
 * per-piece recheck breakdown — not just a one-line summary — before
 * approving or rejecting.
 */
@Component({
  selector: 'app-sold-slab-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sold-slab-details.component.html',
  styleUrl: './sold-slab-details.component.css',
})
export class SoldSlabDetailsComponent implements OnInit {
  product: Product;
  rows: RecheckRow[] = [];

  partyName = '';
  soldDate = new Date().toISOString().slice(0, 10);

  // Used only when the slab has no grid pieces to recheck (e.g. entered via
  // Slab Details' Quantity alone) — same two fields the old simple popup
  // captured, kept on this same page so slabs have one consistent Sold flow.
  simpleQuantity: number | null = null;
  simpleSqft: number | null = null;

  isSubmitting = false;

  /** True when opened from Approvals to review a pending request — everything is read-only and there's no submit action. */
  reviewMode = false;
  constructor(
    private router: Router,
    private productService: ProductService,
    private toastService: ToastService,
    public auth: AuthService,
    private approvalService: ApprovalService,
  ) {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as { product?: Product; reviewMode?: boolean } | undefined;

    this.product = state?.product as Product;
    this.reviewMode = !!state?.reviewMode;
  }

  ngOnInit(): void {
    if (!this.product) {
      this.router.navigate(['/search']);
      return;
    }

    // Every piece defaults to "sold" with the recheck fields pre-filled —
    // from the piece's own recheck values if it already has them (review
    // mode: these pieces were already rechecked when staged), otherwise
    // from its original grid measurements (live edit: the common case is
    // the whole lot sells as-is, so this keeps data entry to "uncheck the
    // odd leftover piece / nudge a measurement that came out different at
    // delivery").
    this.rows = (this.product.pieces || []).map(piece => ({
      piece,
      sold: true,
      recheckedLength: piece.recheckedLength || piece.length || null,
      recheckedWidth: piece.recheckedWidth || piece.width || null,
    }));

    if (this.reviewMode) {
      this.partyName = this.product.partyName || '';
      this.soldDate = this.product.soldDate ? new Date(this.product.soldDate).toISOString().slice(0, 10) : '';
    }

    if (!this.rows.length) {
      this.simpleQuantity = (this.reviewMode ? this.product.soldQuantity : this.product.quantity) || null;
      this.simpleSqft = (this.reviewMode ? this.product.soldSqft : this.product.size) || null;
    }
  }

  // ── Simple quantity/sqft path: live remaining-stock preview ──
  get simpleRemainingQuantity(): number {
    return Math.max(0, (this.product?.quantity || 0) - (Number(this.simpleQuantity) || 0));
  }

  get simpleRemainingSqft(): number {
    return Math.round(Math.max(0, (this.product?.size || 0) - (Number(this.simpleSqft) || 0)) * 100) / 100;
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  /** False for a slab entered without ever using the SLAB ENTRY GRID — falls back to a simple quantity/sqft form instead of the per-piece recheck table. */
  get hasPieces(): boolean {
    return this.rows.length > 0;
  }

  get displayCode(): string {
    return this.product?.slabNumber || this.product?.productCode || '';
  }

  goBack(): void {
    if (this.reviewMode) {
      this.router.navigate(['/sold-staging']);
      return;
    }
    this.router.navigate(['/view-product'], { state: { product: this.product }, queryParams: { id: this.product.id } });
  }

  // ── Per-row sqft (recheck conversion — same inch→sqft rule as the slab entry grid: (L × W) / 144) ──
  rowRecheckedSqft(row: RecheckRow): number {
    const l = Number(row.recheckedLength) || 0;
    const w = Number(row.recheckedWidth) || 0;
    return Math.round((l * w / 144) * 100) / 100;
  }

  rowDifference(row: RecheckRow): number {
    return Math.round((this.rowRecheckedSqft(row) - (Number(row.piece.totalArea) || 0)) * 100) / 100;
  }

  rowRecoveryPct(row: RecheckRow): number | null {
    const expected = Number(row.piece.totalArea) || 0;
    if (!expected) return null;
    return Math.round((this.rowRecheckedSqft(row) / expected) * 10000) / 100;
  }

  toggleSold(row: RecheckRow): void {
    row.sold = !row.sold;
  }

  // ── Checked-rows-only stats — recalculate live as pieces are checked/unchecked, so an unchecked piece drops out of both totals immediately ──
  get expectedTotalSqft(): number {
    return this.soldRows.reduce((s, r) => s + (Number(r.piece.totalArea) || 0), 0);
  }

  get recheckedTotalSqft(): number {
    return this.soldRows.reduce((s, r) => s + this.rowRecheckedSqft(r), 0);
  }

  get totalDifference(): number {
    return Math.round((this.recheckedTotalSqft - this.expectedTotalSqft) * 100) / 100;
  }

  get recoveryPct(): number | null {
    if (!this.expectedTotalSqft) return null;
    return Math.round((this.recheckedTotalSqft / this.expectedTotalSqft) * 10000) / 100;
  }

  // ── Sold vs. remaining split preview ──
  get soldRows(): RecheckRow[] {
    return this.rows.filter(r => r.sold);
  }

  get unsoldRows(): RecheckRow[] {
    return this.rows.filter(r => !r.sold);
  }

  get soldCount(): number {
    return this.soldRows.length;
  }

  get soldSqftPreview(): number {
    return this.soldRows.reduce((s, r) => s + this.rowRecheckedSqft(r), 0);
  }

  get unsoldCount(): number {
    return this.unsoldRows.length;
  }

  get unsoldSqftPreview(): number {
    return this.unsoldRows.reduce((s, r) => s + (Number(r.piece.totalArea) || 0), 0);
  }

  // ── Validation + payload split ──────────────────────────────────────────────
  /**
   * `soldStatus` is 'Sold' for the admin's direct commit, or 'PendingSold'
   * for a store manager's request — staged immediately (hidden from normal
   * inventory, see inventory-list's exclusion filter) and flipped to 'Sold'
   * only once an admin approves it on the Sold Staging page.
   */
  private buildPayloads(soldStatus: string): { sold: Product; remaining: Product | null } | null {
    const partyName = this.partyName.trim();
    if (!partyName) {
      this.toastService.showError('Party name is required.');
      return null;
    }
    if (!this.soldDate) {
      this.toastService.showError('Date sold is required.');
      return null;
    }
    const soldDateMs = new Date(this.soldDate).getTime();
    if (isNaN(soldDateMs)) {
      this.toastService.showError('Enter a valid date sold.');
      return null;
    }

    if (!this.hasPieces) {
      if (!this.simpleQuantity || this.simpleQuantity <= 0) {
        this.toastService.showError('Enter the number of slabs sold.');
        return null;
      }
      if (!this.simpleSqft || this.simpleSqft <= 0) {
        this.toastService.showError('Enter the running sqft.');
        return null;
      }

      const totalQuantity = this.product.quantity || 0;
      const totalSqft = this.product.size || 0;
      if (this.simpleQuantity > totalQuantity) {
        this.toastService.showError(`Only ${totalQuantity} slab(s) available — can't sell ${this.simpleQuantity}.`);
        return null;
      }

      // Same split as the per-piece grid below, just without individual
      // pieces to divide: the sold quantity/sqft go on the sold record, and
      // whatever's left over (if any) stays on the original id so it keeps
      // showing up in Slab Inventory as open stock.
      const splitting = this.simpleQuantity < totalQuantity;

      const soldProduct: Product = {
        ...this.product,
        id: splitting ? `${this.product.id}-SOLD-${Date.now()}` : this.product.id,
        slabNumber: splitting && this.product.slabNumber ? `${this.product.slabNumber}-SOLD` : this.product.slabNumber,
        status: soldStatus,
        quantity: this.simpleQuantity,
        size: this.simpleSqft,
        soldQuantity: this.simpleQuantity,
        soldSqft: this.simpleSqft,
        partyName,
        soldDate: soldDateMs,
      };

      let remainingProduct: Product | null = null;
      if (splitting) {
        remainingProduct = {
          ...this.product,
          quantity: totalQuantity - this.simpleQuantity,
          size: Math.round((totalSqft - this.simpleSqft) * 100) / 100,
        };
      }

      return { sold: soldProduct, remaining: remainingProduct };
    }

    const soldRows = this.soldRows;
    if (!soldRows.length) {
      this.toastService.showError('Mark at least one slab as sold.');
      return null;
    }
    for (const row of soldRows) {
      if (!row.recheckedLength || !row.recheckedWidth) {
        this.toastService.showError(`Enter rechecked size for Slab #${row.piece.id}.`);
        return null;
      }
    }

    // totalArea is deliberately left untouched here — it's the original
    // "expected" grid measurement, kept for the admin's expected-vs-rechecked
    // comparison on review. recheckedTotalArea carries the actual figure the
    // sale is recorded against (see productSqft() call sites, which prefer it).
    const soldPieces: SlabPieces[] = soldRows.map(row => ({
      ...row.piece,
      sold: true,
      recheckedLength: row.recheckedLength!,
      recheckedWidth: row.recheckedWidth!,
      recheckedTotalArea: this.rowRecheckedSqft(row),
    }));
    const soldTotalSqft = soldPieces.reduce((s, p) => s + (p.recheckedTotalArea || 0), 0);

    const unsoldRows = this.unsoldRows;
    const splitting = unsoldRows.length > 0;

    const soldProduct: Product = {
      ...this.product,
      id: splitting ? `${this.product.id}-SOLD-${Date.now()}` : this.product.id,
      slabNumber: splitting && this.product.slabNumber ? `${this.product.slabNumber}-SOLD` : this.product.slabNumber,
      status: soldStatus,
      pieces: soldPieces,
      quantity: soldPieces.length,
      gridQuantity: soldPieces.length,
      size: soldTotalSqft,
      gridSqft: soldTotalSqft,
      soldQuantity: soldPieces.length,
      soldSqft: soldTotalSqft,
      partyName,
      soldDate: soldDateMs,
    };

    let remainingProduct: Product | null = null;
    if (splitting) {
      const remainingPieces = unsoldRows.map(r => r.piece);
      const remainingTotalSqft = remainingPieces.reduce((s, p) => s + (Number(p.totalArea) || 0), 0);
      remainingProduct = {
        ...this.product,
        pieces: remainingPieces,
        quantity: remainingPieces.length,
        gridQuantity: remainingPieces.length,
        size: remainingTotalSqft,
        gridSqft: remainingTotalSqft,
      };
    }

    return { sold: soldProduct, remaining: remainingProduct };
  }

  // ── Admin: commit both records immediately ──────────────────────────────────
  async confirmSold(): Promise<void> {
    if (this.isSubmitting) return;
    const payloads = this.buildPayloads('Sold');
    if (!payloads) return;

    this.isSubmitting = true;
    try {
      await firstValueFrom(this.productService.postApiCall(payloads.sold));
      if (payloads.remaining) {
        await firstValueFrom(this.productService.postApiCall(payloads.remaining));
      }
      this.toastService.showSuccess('Marked as Sold.');
      this.router.navigate(['/sold-inventory']);
    } catch (err: any) {
      const duplicateMsg = err?.status === 409 && typeof err.error === 'string' ? err.error : null;
      this.toastService.showError(duplicateMsg || 'Failed to save sold details.');
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Store manager: stage the sale immediately (hidden from normal inventory
   * right away — see inventory-list's exclusion filter) and submit it for
   * admin approval. Both the sold (PendingSold) and remaining (unsold
   * pieces, status untouched) records are posted now, same as the admin's
   * direct commit — only the final status flip to 'Sold' waits on approval.
   */
  async submitSellRequest(): Promise<void> {
    if (this.isSubmitting) return;
    const previousStatus = this.product.status || 'Available';
    const payloads = this.buildPayloads('PendingSold');
    if (!payloads) return;

    this.isSubmitting = true;
    try {
      await firstValueFrom(this.productService.postApiCall(payloads.sold));
      if (payloads.remaining) {
        await firstValueFrom(this.productService.postApiCall(payloads.remaining));
      }
      await this.approvalService.submit({
        type: 'sell',
        productId: payloads.sold.id,
        productCode: this.displayCode,
        productCategory: this.product.category,
        productSnapshot: payloads.sold,
        previousStatus,
        requestedBy: this.auth.getCurrentUser() ?? 'store_manager',
      });
      this.toastService.showSuccess('Sale staged — waiting for admin approval.');
      this.router.navigate(['/search']);
    } catch {
      this.toastService.showError('Failed to submit request. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }
}

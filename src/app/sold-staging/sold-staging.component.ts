import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApprovalRequest, ApprovalService } from '../services/approval.service';
import { ProductService } from '../services/product.service';
import { ToastService } from '../services/toast.service';
import { LayoutService } from '../services/layout.service';
import { Product } from '../model/product';
import { SlabPieces } from '../model/slab-pieces';
import { AuthService } from '../services/auth.service';

type FilterTab = 'pending' | 'all';

/**
 * Review queue for "sell" requests. A store manager's sale is staged
 * immediately on submit (status → 'PendingSold', hidden from normal
 * inventory — see inventory-list's exclusion filter). An admin sees every
 * staged request here and can turn it into a final 'Sold' record, or
 * reject it and get the stock back into inventory. A store manager can
 * open this same page to track their own submissions, but read-only — the
 * Approve/Reject actions are admin-only (see the template's *ngIf="isAdmin"
 * guard around them), since self-approval would defeat the point of
 * requiring admin approval.
 *
 * Handles two snapshot shapes for backward compatibility with any request
 * submitted before this staging flow existed: the current flat shape
 * (`productSnapshot` is the staged product itself), and the legacy
 * `{ __split: true, sold, remaining }` shape, whose product was never
 * touched at submit time.
 */
@Component({
  selector: 'app-sold-staging',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sold-staging.component.html',
  styleUrl: './sold-staging.component.css'
})
export class SoldStagingComponent implements OnInit {
  activeTab: FilterTab = 'pending';
  requests: ApprovalRequest[] = [];
  processingId: string | null = null;
  isLoading = false;

  /** Same canonical godown list used across the app (Add Employee, Inventory filters). */
  goDownLocations = [
    { id: 1, label: 'Kishangarh' },
    { id: 2, label: 'Moradabad' },
    { id: 3, label: 'Banswara' },
  ];
  selectedLocation = '';

  private readonly SPLIT_MARKER = '-SOLD-';

  constructor(
    public layout: LayoutService,
    private router: Router,
    private approvalService: ApprovalService,
    private productService: ProductService,
    private toastService: ToastService,
    private auth: AuthService
  ) {}

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  goToDashboard(): void {
    this.router.navigate(['/search']);
  }

  async ngOnInit(): Promise<void> {
    this.isLoading = true;
    await this.approvalService.refresh();
    this.load();
    this.isLoading = false;
  }

  /** Admin sees every sell request; a store manager sees only the ones they submitted. */
  private scoped(all: ApprovalRequest[]): ApprovalRequest[] {
    if (this.isAdmin) return all;
    const me = this.auth.getCurrentUser();
    return all.filter(r => r.requestedBy === me);
  }

  /** The godown a request's staged product belongs to — handles the legacy __split shape too. */
  requestLocation(req: ApprovalRequest): string {
    const snap = req.productSnapshot;
    const source = snap?.__split ? snap.sold : snap;
    return source?.godownLocation || '';
  }

  /** Admin can filter by every godown; a store manager only by their own assigned ones. */
  get locationOptions() {
    if (this.isAdmin) return this.goDownLocations;
    const mine = this.auth.getCurrentLocations().map(l => l.toLowerCase());
    return this.goDownLocations.filter(g => mine.includes(g.label.toLowerCase()));
  }

  load(): void {
    const all = this.withLocation(this.approvalService.getAll().filter(r => r.type === 'sell'));
    this.requests = this.activeTab === 'pending'
      ? all.filter(r => r.status === 'pending')
      : all;
  }

  onLocationChange(): void {
    this.selectedIds.clear();
    this.load();
  }

  setTab(tab: FilterTab): void {
    this.activeTab = tab;
    this.selectedIds.clear();
    this.load();
  }

  /** Applies the location filter on top of role-scoping, shared by both tab counts. */
  private withLocation(all: ApprovalRequest[]): ApprovalRequest[] {
    const scoped = this.scoped(all);
    if (!this.selectedLocation) return scoped;
    return scoped.filter(r => this.requestLocation(r).toLowerCase() === this.selectedLocation.toLowerCase());
  }

  get pendingCount(): number {
    return this.withLocation(this.approvalService.getPendingByType('sell')).length;
  }

  get allCount(): number {
    return this.withLocation(this.approvalService.getAll().filter(r => r.type === 'sell')).length;
  }

  isProcessing(id: string): boolean {
    return this.processingId === id;
  }

  /** The product the sale details should be read from — handles the legacy __split shape too. */
  sellSource(req: ApprovalRequest): any {
    const snap = req.productSnapshot;
    const source = snap?.__split ? snap.sold : snap;
    return source?.partyName ? source : null;
  }

  hasPieceDetails(req: ApprovalRequest): boolean {
    const source = this.sellSource(req);
    return !!(source?.pieces?.length);
  }

  viewPieceDetails(req: ApprovalRequest): void {
    const product = this.sellSource(req);
    if (!product) return;
    this.router.navigate(['/sold-slab-details'], { state: { product, reviewMode: true } });
  }

  displayProductCode(req: ApprovalRequest): string {
    if (req.productCode) return req.productCode;
    const source = this.sellSource(req) || req.productSnapshot;
    return source?.slabNumber || source?.productCode || '—';
  }

  formatDate(ts: number): string {
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  // ── Approve: flip the already-staged product's status to Sold ────────────
  async approve(req: ApprovalRequest): Promise<void> {
    if (!this.isAdmin || this.processingId || this.isBulkProcessing) return;
    this.processingId = req.id;

    const ok = await this.commitApprove(req);
    this.processingId = null;

    if (ok) this.toastService.showSuccess(`"${req.productCode}" marked as Sold.`);
    else this.toastService.showError('Action failed. Please try again.');
    this.load();
  }

  /** The actual approve mutation, shared by the single-row action and the bulk "Approve Selected" action. */
  private async commitApprove(req: ApprovalRequest): Promise<boolean> {
    try {
      if (req.productSnapshot?.__split) {
        // Legacy request from before staging existed — the product was
        // never touched at submit time, so commit both payloads now.
        await firstValueFrom(this.productService.postApiCall(req.productSnapshot.sold));
        if (req.productSnapshot.remaining) {
          await firstValueFrom(this.productService.postApiCall(req.productSnapshot.remaining));
        }
      } else {
        const live = await firstValueFrom(this.productService.getProduct(req.productId));
        await firstValueFrom(this.productService.updateProductStatus(live, 'Sold'));
      }
      await this.approvalService.approve(req.id);
      return true;
    } catch {
      return false;
    }
  }

  // ── Multi-select: approve several pending requests in one go ─────────────
  selectedIds = new Set<string>();
  isBulkProcessing = false;

  get pendingVisible(): ApprovalRequest[] {
    return this.requests.filter(r => r.status === 'pending');
  }

  isSelected(req: ApprovalRequest): boolean {
    return this.selectedIds.has(req.id);
  }

  toggleSelect(req: ApprovalRequest): void {
    if (this.selectedIds.has(req.id)) this.selectedIds.delete(req.id);
    else this.selectedIds.add(req.id);
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  get allPendingSelected(): boolean {
    const pending = this.pendingVisible;
    return pending.length > 0 && pending.every(r => this.selectedIds.has(r.id));
  }

  toggleSelectAll(): void {
    const pending = this.pendingVisible;
    if (this.allPendingSelected) {
      pending.forEach(r => this.selectedIds.delete(r.id));
    } else {
      pending.forEach(r => this.selectedIds.add(r.id));
    }
  }

  async approveSelected(): Promise<void> {
    if (!this.isAdmin || this.isBulkProcessing || this.processingId || this.selectedIds.size === 0) return;

    const targets = this.pendingVisible.filter(r => this.selectedIds.has(r.id));
    this.isBulkProcessing = true;
    this.selectedIds.clear();

    let succeeded = 0;
    for (const req of targets) {
      this.processingId = req.id;
      if (await this.commitApprove(req)) succeeded++;
    }
    this.processingId = null;
    this.isBulkProcessing = false;

    if (succeeded === targets.length) {
      this.toastService.showSuccess(`${succeeded} sale${succeeded === 1 ? '' : 's'} approved.`);
    } else {
      this.toastService.showError(`${succeeded} of ${targets.length} approved — the rest failed, please retry them.`);
    }
    this.load();
  }

  // ── Reject: undo the staging ──────────────────────────────────────────────
  // A split clone (partial piece sale) merges its pieces back into the
  // original record and is deleted; a non-split record just reverts to
  // whatever status it had before being staged.
  async reject(req: ApprovalRequest): Promise<void> {
    if (!this.isAdmin || this.processingId || this.isBulkProcessing) return;
    this.processingId = req.id;

    try {
      if (!req.productSnapshot?.__split) {
        if (req.productId.includes(this.SPLIT_MARKER)) {
          await this.restoreSplitPieces(req);
        } else {
          const live = await firstValueFrom(this.productService.getProduct(req.productId));
          await firstValueFrom(this.productService.updateProductStatus(live, req.previousStatus || 'Available'));
        }
      }
      // Legacy __split requests never touched the real product at submit
      // time, so there's nothing to restore — just mark it rejected.
      await this.approvalService.reject(req.id);
      this.toastService.showSuccess(`Sale request for "${req.productCode}" rejected — stock restored.`);
    } catch {
      this.toastService.showError('Failed to reject request.');
    } finally {
      this.processingId = null;
      this.load();
    }
  }

  private async restoreSplitPieces(req: ApprovalRequest): Promise<void> {
    const originalId = req.productId.split(this.SPLIT_MARKER)[0];
    const [stagedClone, remaining] = await Promise.all([
      firstValueFrom(this.productService.getProduct(req.productId)),
      firstValueFrom(this.productService.getProduct(originalId)),
    ]);

    // Grid-based slabs carry real pieces to merge back; a slab entered via
    // Quantity/Sqft alone (no grid) has none — restore by adding the staged
    // quantity/sqft back onto the remaining record instead.
    const hasGridPieces = !!(stagedClone.pieces?.length || remaining.pieces?.length);

    let updatedRemaining: Product;
    if (hasGridPieces) {
      const restoredPieces: SlabPieces[] = [
        ...(remaining.pieces || []),
        ...(stagedClone.pieces || []).map(p => ({
          ...p,
          sold: false,
          recheckedLength: 0,
          recheckedWidth: 0,
          recheckedTotalArea: 0,
        })),
      ];
      const totalSqft = restoredPieces.reduce((s, p) => s + (Number(p.totalArea) || 0), 0);
      updatedRemaining = {
        ...remaining,
        pieces: restoredPieces,
        quantity: restoredPieces.length,
        gridQuantity: restoredPieces.length,
        size: totalSqft,
        gridSqft: totalSqft,
      };
    } else {
      updatedRemaining = {
        ...remaining,
        quantity: (remaining.quantity || 0) + (stagedClone.quantity || 0),
        size: Math.round(((remaining.size || 0) + (stagedClone.size || 0)) * 100) / 100,
      };
    }

    await firstValueFrom(this.productService.postApiCall(updatedRemaining));
    await firstValueFrom(this.productService.deleteProduct(req.productId));
  }
}

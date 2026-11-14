import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApprovalRequest, ApprovalService } from '../services/approval.service';
import { ProductService } from '../services/product.service';
import { ToastService } from '../services/toast.service';
import { LayoutService } from '../services/layout.service';

type FilterTab = 'pending' | 'all';

/**
 * Handles "delete" requests only — "sell" requests (store manager staging a
 * sale for approval) have their own dedicated page, Sold Staging, since
 * they need piece-level detail and a different reject behavior (restore to
 * inventory) that doesn't make sense mixed into a generic request list.
 */
@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approvals.component.html',
  styleUrl: './approvals.component.css'
})
export class ApprovalsComponent implements OnInit {
  activeTab: FilterTab = 'pending';
  requests: ApprovalRequest[] = [];
  processingId: string | null = null;
  isLoading = false;

  constructor(
    public layout: LayoutService,
    private router: Router,
    private approvalService: ApprovalService,
    private productService: ProductService,
    private toastService: ToastService
  ) {}

  goToDashboard(): void {
    this.router.navigate(['/search']);
  }

  async ngOnInit(): Promise<void> {
    this.isLoading = true;
    await this.approvalService.refresh();
    this.load();
    this.isLoading = false;
  }

  load(): void {
    const all = this.approvalService.getAll().filter(r => r.type === 'delete');
    this.requests = this.activeTab === 'pending'
      ? all.filter(r => r.status === 'pending')
      : all;
  }

  setTab(tab: FilterTab): void {
    this.activeTab = tab;
    this.load();
  }

  get pendingCount(): number {
    return this.approvalService.getPendingByType('delete').length;
  }

  get allCount(): number {
    return this.approvalService.getAll().filter(r => r.type === 'delete').length;
  }

  async approve(req: ApprovalRequest): Promise<void> {
    if (this.processingId) return;
    this.processingId = req.id;

    try {
      await this.executeDelete(req);
      await this.approvalService.approve(req.id);
      this.toastService.showSuccess(`"${req.productCode}" deleted successfully.`);
    } catch {
      this.toastService.showError('Action failed. Please try again.');
    } finally {
      this.processingId = null;
      this.load();
    }
  }

  async reject(req: ApprovalRequest): Promise<void> {
    try {
      await this.approvalService.reject(req.id);
      this.toastService.showSuccess(`Request for "${req.productCode}" rejected.`);
      this.load();
    } catch {
      this.toastService.showError('Failed to reject request.');
    }
  }

  private executeDelete(req: ApprovalRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      this.productService.deleteProduct(req.productId).subscribe({
        next: () => resolve(),
        error: () => reject()
      });
    });
  }

  formatDate(ts: number): string {
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  isProcessing(id: string): boolean {
    return this.processingId === id;
  }
}

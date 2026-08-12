import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuditLog } from '../model/audit-log';
import { AuditLogService } from '../services/audit-log.service';
import { ToastService } from '../services/toast.service';

/**
 * Admin-only audit trail: every Block/Slab create, edit and delete is
 * recorded server-side (ProductService.saveProduct/deleteProduct) with who
 * did it, when, and — for edits — exactly which fields changed.
 */
@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-log.component.html',
  styleUrl: './audit-log.component.css'
})
export class AuditLogComponent implements OnInit {
  logs: AuditLog[] = [];
  isLoading = false;

  pageNumber = 0;
  pageSize = 50;
  totalPages = 0;
  totalElements = 0;

  expandedId: string | null = null;

  actionFilter: 'ALL' | 'CREATE' | 'UPDATE' | 'DELETE' = 'ALL';

  deleteTarget: AuditLog | null = null;
  isDeleting = false;

  constructor(
    private router: Router,
    private auditLogService: AuditLogService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  goToDashboard(): void {
    this.router.navigate(['/search']);
  }

  get filteredLogs(): AuditLog[] {
    return this.actionFilter === 'ALL' ? this.logs : this.logs.filter(l => l.action === this.actionFilter);
  }

  async load(): Promise<void> {
    this.isLoading = true;
    try {
      const res = await firstValueFrom(this.auditLogService.getAll(this.pageNumber, this.pageSize));
      this.logs = res.content;
      this.totalPages = res.totalPages;
      this.totalElements = res.totalElements;
    } catch {
      this.toastService.showError('Failed to load audit log.');
    } finally {
      this.isLoading = false;
    }
  }

  setFilter(action: 'ALL' | 'CREATE' | 'UPDATE' | 'DELETE'): void {
    this.actionFilter = action;
  }

  toggleExpand(log: AuditLog): void {
    this.expandedId = this.expandedId === log.id ? null : log.id;
  }

  itemLabel(log: AuditLog): string {
    if (log.category?.toLowerCase() === 'slab' && log.slabNumber) return log.slabNumber;
    return log.productCode || log.entityId;
  }

  actionClass(action: string): string {
    switch (action) {
      case 'CREATE': return 'action-create';
      case 'UPDATE': return 'action-update';
      case 'DELETE': return 'action-delete';
      default: return '';
    }
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.pageNumber = page;
    this.load();
  }

  prevPage(): void { this.goToPage(this.pageNumber - 1); }
  nextPage(): void { this.goToPage(this.pageNumber + 1); }

  confirmDelete(log: AuditLog, event: Event): void {
    event.stopPropagation(); // don't trigger the row's expand toggle
    this.deleteTarget = log;
  }

  cancelDelete(): void {
    this.deleteTarget = null;
  }

  async deleteLog(): Promise<void> {
    if (!this.deleteTarget || this.isDeleting) return;
    this.isDeleting = true;
    try {
      await firstValueFrom(this.auditLogService.delete(this.deleteTarget.id));
      this.logs = this.logs.filter(l => l.id !== this.deleteTarget!.id);
      this.totalElements = Math.max(0, this.totalElements - 1);
      this.toastService.showSuccess('Audit log entry deleted.');
      this.deleteTarget = null;
    } catch {
      this.toastService.showError('Failed to delete audit log entry.');
    } finally {
      this.isDeleting = false;
    }
  }
}

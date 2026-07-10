import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ArchitectBusinessRecord } from '../../model/architect-business';
import { ArchitectService } from '../../services/architect.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-architect-business',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './architect-business.component.html',
  styleUrl: './architect-business.component.css'
})
export class ArchitectBusinessComponent implements OnInit {
  isLoading = true;
  all: ArchitectBusinessRecord[] = [];
  filtered: ArchitectBusinessRecord[] = [];
  filterForm: FormGroup;
  statuses = ['Under Discussion', 'Quotation Sent', 'Won', 'Lost'];

  constructor(
    private architectService: ArchitectService,
    private router: Router,
    private toast: ToastService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({ search: [''], status: [''] });
  }

  ngOnInit(): void {
    this.isLoading = true;
    this.architectService.getAllBusinessRecords().subscribe({
      next: list => {
        this.all = list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => { this.toast.showError('Failed to load business records.'); this.isLoading = false; }
    });
    this.filterForm.valueChanges.subscribe(() => this.applyFilters());
  }

  applyFilters(): void {
    const { search, status } = this.filterForm.value;
    const q = (search || '').toLowerCase();
    this.filtered = this.all.filter(b =>
      (!q || b.projectName?.toLowerCase().includes(q) || b.architectName?.toLowerCase().includes(q) || b.enquiryNumber?.toLowerCase().includes(q)) &&
      (!status || b.status === status)
    );
  }

  get totalValue(): number {
    return this.filtered.reduce((sum, b) => sum + (b.value || 0), 0);
  }

  statusPillClass(status: string): string {
    return 'pill-' + (status || 'default').toLowerCase().replace(/\s+/g, '');
  }

  remove(item: ArchitectBusinessRecord): void {
    this.architectService.deleteBusinessRecord(item.id).subscribe(() => {
      this.all = this.all.filter(b => b.id !== item.id);
      this.applyFilters();
    });
  }

  openArchitect(id: string): void { this.router.navigate(['/architects/profile', id]); }
  goBack(): void { this.router.navigate(['/architects/dashboard']); }
}

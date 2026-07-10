import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Architect } from '../../model/architect';
import { ArchitectService } from '../../services/architect.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-architect-directory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './architect-directory.component.html',
  styleUrl: './architect-directory.component.css'
})
export class ArchitectDirectoryComponent implements OnInit {
  isLoading = true;
  allArchitects: Architect[] = [];
  filteredArchitects: Architect[] = [];

  filterPanelVisible = false;
  filterForm: FormGroup;

  cities: string[] = [];
  types = ['Architecture Firm', 'Interior Designer', 'Both'];
  statuses = ['Research', 'Not Contacted', 'Contacted', 'Visited', 'Onboarded'];

  constructor(
    private architectService: ArchitectService,
    private router: Router,
    private toast: ToastService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      city: [''],
      type: [''],
      status: ['']
    });
  }

  ngOnInit(): void {
    this.load();
    this.filterForm.valueChanges.subscribe(() => this.applyFilters());
  }

  load(): void {
    this.isLoading = true;
    this.architectService.getAll().subscribe({
      next: list => {
        this.allArchitects = list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        this.cities = [...new Set(list.map(a => a.city).filter(Boolean))].sort();
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.toast.showError('Failed to load architects.');
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    const { search, city, type, status } = this.filterForm.value;
    const q = (search || '').toLowerCase();
    this.filteredArchitects = this.allArchitects.filter(a =>
      (!q || a.companyName?.toLowerCase().includes(q) || a.contactPerson?.toLowerCase().includes(q)) &&
      (!city || a.city === city) &&
      (!type || a.type === type) &&
      (!status || a.status === status)
    );
  }

  resetFilters(): void {
    this.filterForm.reset({ search: '', city: '', type: '', status: '' });
  }

  toggleFilterPanel(): void { this.filterPanelVisible = !this.filterPanelVisible; }
  closeFilterPanel(): void { this.filterPanelVisible = false; }

  statusPillClass(status: string): string {
    return 'pill-' + (status || 'default').toLowerCase().replace(/\s+/g, '');
  }

  openProfile(architect: Architect): void {
    this.router.navigate(['/architects/profile', architect.id]);
  }

  addArchitect(): void {
    this.router.navigate(['/architects/new']);
  }

  goBack(): void {
    this.router.navigate(['/architects/dashboard']);
  }
}

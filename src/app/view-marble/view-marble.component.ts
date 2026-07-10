import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { LayoutService } from '../services/layout.service';

const BASE = 'https://setu-crm.onrender.com/catalogue';

@Component({
  selector: 'app-view-marble',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-marble.component.html',
  styleUrl: './view-marble.component.css',
})
export class ViewMarbleComponent implements OnInit {
  marble: Record<string, any> | null = null;
  isLoading = true;
  notFound = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private toast: ToastService,
    public layout: LayoutService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound = true;
      this.isLoading = false;
      return;
    }
    this.load(id);
  }

  private async load(id: string): Promise<void> {
    this.isLoading = true;
    try {
      this.marble = await firstValueFrom(this.http.get<Record<string, any>>(`${BASE}/${id}`));
    } catch {
      this.notFound = true;
    } finally {
      this.isLoading = false;
    }
  }

  /** Renders a value for display, falling back to an em-dash for empty/blank fields. */
  val(key: string): string {
    const v = this.marble?.[key];
    if (v === null || v === undefined || v === '') return '—';
    return String(v);
  }

  list(key: string): string {
    const v = this.marble?.[key];
    return Array.isArray(v) && v.length ? v.join(', ') : '—';
  }

  edit(): void {
    if (this.marble?.['id']) this.router.navigate(['/catalogue/edit', this.marble['id']]);
  }

  async remove(): Promise<void> {
    if (!this.marble?.['id']) return;
    if (!confirm(`Delete "${this.marble['marbleName']}"? This cannot be undone.`)) return;
    try {
      await firstValueFrom(this.http.delete(`${BASE}/${this.marble['id']}`, { responseType: 'text' }));
      this.toast.showSuccess('Marble deleted.');
      this.goToList();
    } catch {
      this.toast.showError('Failed to delete.');
    }
  }

  goToList(): void {
    this.router.navigate(['/catalogue'], { queryParams: { tab: 'saved' } });
  }
}

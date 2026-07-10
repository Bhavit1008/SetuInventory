import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ArchitectFollowUp } from '../../model/architect-followup';
import { ArchitectService } from '../../services/architect.service';
import { ToastService } from '../../services/toast.service';

type Bucket = 'upcoming' | 'overdue' | 'completed';

@Component({
  selector: 'app-architect-followups',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './architect-followups.component.html',
  styleUrl: './architect-followups.component.css'
})
export class ArchitectFollowupsComponent implements OnInit {
  isLoading = true;
  all: ArchitectFollowUp[] = [];
  activeBucket: Bucket = 'upcoming';

  constructor(
    private architectService: ArchitectService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.architectService.getAllFollowUps().subscribe({
      next: list => { this.all = list; this.isLoading = false; },
      error: () => { this.toast.showError('Failed to load follow-ups.'); this.isLoading = false; }
    });
  }

  private today(): string { return new Date().toISOString().slice(0, 10); }

  get upcoming(): ArchitectFollowUp[] {
    return this.all.filter(f => f.status !== 'Completed' && f.dueDate >= this.today())
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }
  get overdue(): ArchitectFollowUp[] {
    return this.all.filter(f => f.status !== 'Completed' && f.dueDate < this.today())
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }
  get completed(): ArchitectFollowUp[] {
    return this.all.filter(f => f.status === 'Completed')
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  }

  get visibleList(): ArchitectFollowUp[] {
    if (this.activeBucket === 'upcoming') return this.upcoming;
    if (this.activeBucket === 'overdue') return this.overdue;
    return this.completed;
  }

  setBucket(b: Bucket): void { this.activeBucket = b; }

  complete(item: ArchitectFollowUp): void {
    this.architectService.updateFollowUp(item.id, { ...item, status: 'Completed' }).subscribe(() => this.load());
  }

  remove(item: ArchitectFollowUp): void {
    this.architectService.deleteFollowUp(item.id).subscribe(() => this.load());
  }

  openArchitect(id: string): void { this.router.navigate(['/architects/profile', id]); }
  goBack(): void { this.router.navigate(['/architects/dashboard']); }

  priorityClass(p: string): string {
    return 'pill-' + (p || 'medium').toLowerCase();
  }
}

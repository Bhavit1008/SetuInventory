import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Architect } from '../../model/architect';
import { ArchitectFollowUp } from '../../model/architect-followup';
import { ArchitectService } from '../../services/architect.service';
import { LayoutService } from '../../services/layout.service';

@Component({
  selector: 'app-architect-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './architect-dashboard.component.html',
  styleUrl: './architect-dashboard.component.css'
})
export class ArchitectDashboardComponent implements OnInit {
  isLoading = true;
  architects: Architect[] = [];
  followUps: ArchitectFollowUp[] = [];

  constructor(
    private architectService: ArchitectService,
    private router: Router,
    public layout: LayoutService
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.architectService.getAll().subscribe(list => {
      this.architects = list;
      this.isLoading = false;
    });
    this.architectService.getAllFollowUps().subscribe(list => {
      this.followUps = list.filter(f => f.status !== 'Completed')
        .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    });
  }

  get totalArchitects(): number { return this.architects.length; }
  get onboardedCount(): number { return this.architects.filter(a => a.status === 'Onboarded').length; }
  get leadsCount(): number { return this.architects.filter(a => a.status && a.status !== 'Onboarded').length; }

  get upcomingFollowUps(): ArchitectFollowUp[] {
    return this.followUps.filter(f => f.dueDate >= this.today()).slice(0, 5);
  }

  get overdueCount(): number {
    return this.followUps.filter(f => f.dueDate < this.today()).length;
  }

  isOverdue(f: ArchitectFollowUp): boolean {
    return f.dueDate < this.today();
  }

  private today(): string { return new Date().toISOString().slice(0, 10); }

  get recentArchitects(): Architect[] {
    return [...this.architects].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6);
  }

  statusPillClass(status: string | undefined): string {
    return 'pill-' + (status || 'default').toLowerCase().replace(/\s+/g, '');
  }

  openArchitect(id: string): void { this.router.navigate(['/architects/profile', id]); }
  goToDirectory(): void { this.router.navigate(['/architects/directory']); }
  goToFollowUps(): void { this.router.navigate(['/architects/followups']); }
  addArchitect(): void { this.router.navigate(['/architects/new']); }
}

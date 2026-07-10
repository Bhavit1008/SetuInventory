import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ArchitectInteraction } from '../../model/architect-interaction';
import { ArchitectService } from '../../services/architect.service';
import { ToastService } from '../../services/toast.service';

type VisitType = 'Office Visit' | 'Showroom Visit';

@Component({
  selector: 'app-architect-visits',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './architect-visits.component.html',
  styleUrl: './architect-visits.component.css'
})
export class ArchitectVisitsComponent implements OnInit {
  isLoading = true;
  all: ArchitectInteraction[] = [];
  activeType: VisitType = 'Office Visit';

  constructor(
    private architectService: ArchitectService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.architectService.getAllInteractions().subscribe({
      next: list => {
        this.all = list.filter(i => i.type === 'Office Visit' || i.type === 'Showroom Visit')
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        this.isLoading = false;
      },
      error: () => { this.toast.showError('Failed to load visits.'); this.isLoading = false; }
    });
  }

  setType(t: VisitType): void { this.activeType = t; }

  get visibleVisits(): ArchitectInteraction[] {
    return this.all.filter(i => i.type === this.activeType);
  }

  get officeCount(): number { return this.all.filter(i => i.type === 'Office Visit').length; }
  get showroomCount(): number { return this.all.filter(i => i.type === 'Showroom Visit').length; }

  remove(item: ArchitectInteraction): void {
    this.architectService.deleteInteraction(item.id).subscribe(() => {
      this.all = this.all.filter(i => i.id !== item.id);
    });
  }

  openArchitect(id: string): void { this.router.navigate(['/architects/profile', id]); }
  goBack(): void { this.router.navigate(['/architects/dashboard']); }
}

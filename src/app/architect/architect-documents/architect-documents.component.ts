import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ArchitectDocument } from '../../model/architect-document';
import { ArchitectService } from '../../services/architect.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-architect-documents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './architect-documents.component.html',
  styleUrl: './architect-documents.component.css'
})
export class ArchitectDocumentsComponent implements OnInit {
  isLoading = true;
  isUploading = false;
  documents: ArchitectDocument[] = [];

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
    this.architectService.getAllDocuments().subscribe({
      next: list => {
        this.documents = list.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));
        this.isLoading = false;
      },
      error: () => { this.toast.showError('Failed to load documents.'); this.isLoading = false; }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.isUploading = true;
    this.architectService.uploadDocumentFile(file).subscribe({
      next: url => {
        this.architectService.addDocument({
          fileName: file.name,
          fileUrl: url,
          fileType: file.name.split('.').pop() || '',
          fileSizeBytes: file.size,
          category: 'Company'
        }).subscribe({
          next: doc => {
            this.documents = [doc, ...this.documents];
            this.isUploading = false;
            this.toast.showSuccess('File uploaded.');
          },
          error: () => { this.isUploading = false; this.toast.showError('Failed to save file.'); }
        });
      },
      error: () => { this.isUploading = false; this.toast.showError('Upload failed.'); }
    });
    input.value = '';
  }

  remove(item: ArchitectDocument): void {
    this.architectService.deleteDocument(item.id).subscribe(() => {
      this.documents = this.documents.filter(d => d.id !== item.id);
    });
  }

  formatSize(bytes: number): string {
    if (!bytes) return '—';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  }

  openArchitect(id: string): void {
    if (id) this.router.navigate(['/architects/profile', id]);
  }

  goBack(): void { this.router.navigate(['/architects/dashboard']); }
}

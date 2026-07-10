import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Architect, ARCHITECT_STAGES } from '../../model/architect';
import { ArchitectInteraction } from '../../model/architect-interaction';
import { ArchitectFollowUp } from '../../model/architect-followup';
import { ArchitectSample } from '../../model/architect-sample';
import { ArchitectBusinessRecord } from '../../model/architect-business';
import { ArchitectDocument } from '../../model/architect-document';
import { ArchitectNote } from '../../model/architect-note';
import { ArchitectService } from '../../services/architect.service';
import { ToastService } from '../../services/toast.service';

type Tab = 'overview' | 'details' | 'status' | 'interactions' | 'samples' | 'business' | 'documents' | 'notes';

@Component({
  selector: 'app-architect-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './architect-profile.component.html',
  styleUrl: './architect-profile.component.css'
})
export class ArchitectProfileComponent implements OnInit {
  architectId = '';
  architect: Architect | null = null;
  isLoading = true;
  activeTab: Tab = 'overview';
  stages = ARCHITECT_STAGES;

  interactions: ArchitectInteraction[] = [];
  followUps: ArchitectFollowUp[] = [];
  samples: ArchitectSample[] = [];
  businessRecords: ArchitectBusinessRecord[] = [];
  documents: ArchitectDocument[] = [];
  notes: ArchitectNote[] = [];

  // ── Inline add-form toggles ──────────────────────────────────────────
  showInteractionForm = false;
  showFollowUpForm = false;
  showSampleForm = false;
  showBusinessForm = false;
  showNoteForm = false;
  isUploadingDoc = false;

  interactionForm: FormGroup;
  followUpForm: FormGroup;
  sampleForm: FormGroup;
  businessForm: FormGroup;
  noteForm: FormGroup;

  interactionTypes = ['Call', 'Meeting', 'Office Visit', 'Showroom Visit'];
  sampleCategories = ['Sample', 'Material'];
  businessTypes = ['Enquiry', 'Quotation', 'Order'];
  businessStatuses = ['Under Discussion', 'Quotation Sent', 'Won', 'Lost'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private architectService: ArchitectService,
    private toast: ToastService,
    private fb: FormBuilder
  ) {
    this.interactionForm = this.fb.group({
      type: ['Call', Validators.required],
      date: [this.today(), Validators.required],
      time: [''],
      team: [''],
      notes: ['']
    });

    this.followUpForm = this.fb.group({
      title: ['', Validators.required],
      type: [''],
      dueDate: [this.today(), Validators.required],
      priority: ['Medium'],
      notes: ['']
    });

    this.sampleForm = this.fb.group({
      materialName: ['', Validators.required],
      category: ['Sample'],
      piecesCount: [''],
      dateGiven: [this.today()]
    });

    this.businessForm = this.fb.group({
      projectName: ['', Validators.required],
      city: [''],
      recordType: ['Enquiry'],
      status: ['Under Discussion'],
      date: [this.today()],
      value: ['']
    });

    this.noteForm = this.fb.group({
      text: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.architectId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.architectId) { this.router.navigate(['/architects/directory']); return; }
    this.loadAll();
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  loadAll(): void {
    this.isLoading = true;
    this.architectService.getById(this.architectId).subscribe({
      next: a => { this.architect = a; this.isLoading = false; },
      error: () => { this.toast.showError('Architect not found.'); this.isLoading = false; }
    });
    this.architectService.getInteractionsByArchitect(this.architectId).subscribe(list => this.interactions = list);
    this.architectService.getFollowUpsByArchitect(this.architectId).subscribe(list => this.followUps = list);
    this.architectService.getSamplesByArchitect(this.architectId).subscribe(list => this.samples = list);
    this.architectService.getBusinessRecordsByArchitect(this.architectId).subscribe(list => this.businessRecords = list);
    this.architectService.getDocumentsByArchitect(this.architectId).subscribe(list => this.documents = list);
    this.architectService.getNotesByArchitect(this.architectId).subscribe(list => this.notes = list);
  }

  setTab(tab: Tab): void { this.activeTab = tab; }

  // ── Status & Stage ────────────────────────────────────────────────────
  stageIndex(status: string | undefined): number {
    return this.stages.indexOf(status || 'Research');
  }

  setStatus(status: string): void {
    if (!this.architect) return;
    this.architectService.updateStatus(this.architectId, status).subscribe({
      next: a => { this.architect = a; this.toast.showSuccess(`Status set to "${status}".`); },
      error: () => this.toast.showError('Failed to update status.')
    });
  }

  statusPillClass(status: string | undefined): string {
    return 'pill-' + (status || 'default').toLowerCase().replace(/\s+/g, '');
  }

  // ── Interactions ──────────────────────────────────────────────────────
  saveInteraction(): void {
    if (this.interactionForm.invalid || !this.architect) return;
    const v = this.interactionForm.value;
    this.architectService.addInteraction({
      architectId: this.architectId,
      architectName: this.architect.companyName,
      type: v.type, date: v.date, time: v.time, notes: v.notes,
      team: (v.team || '').split(',').map((s: string) => s.trim()).filter(Boolean)
    }).subscribe({
      next: item => {
        this.interactions = [item, ...this.interactions];
        this.interactionForm.reset({ type: 'Call', date: this.today(), time: '', team: '', notes: '' });
        this.showInteractionForm = false;
        this.toast.showSuccess('Interaction logged.');
      },
      error: () => this.toast.showError('Failed to log interaction.')
    });
  }

  deleteInteraction(id: string): void {
    this.architectService.deleteInteraction(id).subscribe(() => {
      this.interactions = this.interactions.filter(i => i.id !== id);
    });
  }

  // ── Follow-ups ────────────────────────────────────────────────────────
  saveFollowUp(): void {
    if (this.followUpForm.invalid || !this.architect) return;
    const v = this.followUpForm.value;
    this.architectService.addFollowUp({
      architectId: this.architectId, architectName: this.architect.companyName, ...v
    }).subscribe({
      next: item => {
        this.followUps = [item, ...this.followUps];
        this.followUpForm.reset({ title: '', type: '', dueDate: this.today(), priority: 'Medium', notes: '' });
        this.showFollowUpForm = false;
        this.toast.showSuccess('Follow-up added.');
      },
      error: () => this.toast.showError('Failed to add follow-up.')
    });
  }

  completeFollowUp(item: ArchitectFollowUp): void {
    this.architectService.updateFollowUp(item.id, { ...item, status: 'Completed' }).subscribe(updated => {
      this.followUps = this.followUps.map(f => f.id === updated.id ? updated : f);
    });
  }

  deleteFollowUp(id: string): void {
    this.architectService.deleteFollowUp(id).subscribe(() => {
      this.followUps = this.followUps.filter(f => f.id !== id);
    });
  }

  // ── Samples ───────────────────────────────────────────────────────────
  saveSample(): void {
    if (this.sampleForm.invalid || !this.architect) return;
    const v = this.sampleForm.value;
    this.architectService.addSample({
      architectId: this.architectId, architectName: this.architect.companyName, ...v
    }).subscribe({
      next: item => {
        this.samples = [item, ...this.samples];
        this.sampleForm.reset({ materialName: '', category: 'Sample', piecesCount: '', dateGiven: this.today() });
        this.showSampleForm = false;
        this.toast.showSuccess('Sample logged.');
      },
      error: () => this.toast.showError('Failed to log sample.')
    });
  }

  toggleReturned(item: ArchitectSample): void {
    const returned = !item.returned;
    this.architectService.updateSample(item.id, { ...item, returned, returnedDate: returned ? this.today() : '' })
      .subscribe(updated => { this.samples = this.samples.map(s => s.id === updated.id ? updated : s); });
  }

  deleteSample(id: string): void {
    this.architectService.deleteSample(id).subscribe(() => {
      this.samples = this.samples.filter(s => s.id !== id);
    });
  }

  get samplesGiven(): ArchitectSample[] { return this.samples.filter(s => s.category === 'Sample'); }
  get materialsShown(): ArchitectSample[] { return this.samples.filter(s => s.category === 'Material'); }

  // ── Business & Orders ─────────────────────────────────────────────────
  saveBusinessRecord(): void {
    if (this.businessForm.invalid || !this.architect) return;
    const v = this.businessForm.value;
    this.architectService.addBusinessRecord({
      architectId: this.architectId, architectName: this.architect.companyName,
      ...v, value: v.value ? parseFloat(v.value) : null
    }).subscribe({
      next: item => {
        this.businessRecords = [item, ...this.businessRecords];
        this.businessForm.reset({ projectName: '', city: '', recordType: 'Enquiry', status: 'Under Discussion', date: this.today(), value: '' });
        this.showBusinessForm = false;
        this.toast.showSuccess('Business record added.');
      },
      error: () => this.toast.showError('Failed to add record.')
    });
  }

  deleteBusinessRecord(id: string): void {
    this.architectService.deleteBusinessRecord(id).subscribe(() => {
      this.businessRecords = this.businessRecords.filter(b => b.id !== id);
    });
  }

  businessPillClass(status: string): string {
    return 'pill-' + (status || 'default').toLowerCase().replace(/\s+/g, '');
  }

  // ── Documents ─────────────────────────────────────────────────────────
  onDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.architect) return;
    this.isUploadingDoc = true;
    this.architectService.uploadDocumentFile(file).subscribe({
      next: url => {
        this.architectService.addDocument({
          architectId: this.architectId,
          architectName: this.architect!.companyName,
          fileName: file.name,
          fileUrl: url,
          fileType: file.name.split('.').pop() || '',
          fileSizeBytes: file.size,
          category: 'Project'
        }).subscribe({
          next: doc => {
            this.documents = [doc, ...this.documents];
            this.isUploadingDoc = false;
            this.toast.showSuccess('File uploaded.');
          },
          error: () => { this.isUploadingDoc = false; this.toast.showError('Failed to save file.'); }
        });
      },
      error: () => { this.isUploadingDoc = false; this.toast.showError('Upload failed.'); }
    });
    input.value = '';
  }

  deleteDocument(id: string): void {
    this.architectService.deleteDocument(id).subscribe(() => {
      this.documents = this.documents.filter(d => d.id !== id);
    });
  }

  formatSize(bytes: number): string {
    if (!bytes) return '—';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  }

  // ── Notes ─────────────────────────────────────────────────────────────
  saveNote(): void {
    if (this.noteForm.invalid || !this.architect) return;
    this.architectService.addNote({
      architectId: this.architectId,
      architectName: this.architect.companyName,
      text: this.noteForm.value.text
    }).subscribe({
      next: note => {
        this.notes = [note, ...this.notes];
        this.noteForm.reset({ text: '' });
        this.showNoteForm = false;
      },
      error: () => this.toast.showError('Failed to add note.')
    });
  }

  deleteNote(id: string): void {
    this.architectService.deleteNote(id).subscribe(() => {
      this.notes = this.notes.filter(n => n.id !== id);
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────
  goBack(): void { this.router.navigate(['/architects/directory']); }
  editArchitect(): void { this.router.navigate(['/architects/edit', this.architectId]); }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Architect } from '../../model/architect';
import { ArchitectService } from '../../services/architect.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-architect-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './architect-form.component.html',
  styleUrl: './architect-form.component.css'
})
export class ArchitectFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  architectId: string | null = null;
  submitted = false;
  isSaving = false;
  isUploadingPhoto = false;
  photoPreview = '';

  types = ['Architecture Firm', 'Interior Designer', 'Both'];
  priorities = ['A', 'B', 'C'];
  sources = ['Google', 'Website', 'Referral', 'Exhibition', 'Cold Call', 'Other'];
  specializationOptions = ['Residential', 'Commercial', 'Hospitality', 'Institutional', 'Retail', 'Luxury'];

  constructor(
    private fb: FormBuilder,
    private architectService: ArchitectService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      companyName: ['', Validators.required],
      type: ['', Validators.required],
      logoUrl: [''],
      photoUrl: [''],
      contactPerson: [''],
      designation: [''],
      phone: [''],
      whatsapp: [''],
      email: [''],
      officeAddress: [''],
      city: ['', Validators.required],
      state: [''],
      pincode: [''],
      mapLink: [''],
      website: [''],
      instagram: [''],
      linkedin: [''],
      about: [''],
      yearEstablished: [''],
      teamSize: [''],
      projectType: [''],
      specializations: [[] as string[]],
      serviceAreas: [''],
      tags: [''],
      priority: [''],
      source: [''],
      leadOwner: ['']
    });
  }

  ngOnInit(): void {
    this.architectId = this.route.snapshot.paramMap.get('id');
    if (this.architectId) {
      this.isEdit = true;
      this.architectService.getById(this.architectId).subscribe(a => {
        this.form.patchValue({
          ...a,
          serviceAreas: (a.serviceAreas || []).join(', '),
          tags: (a.tags || []).join(', ')
        });
        this.photoPreview = a.photoUrl || '';
      });
    }
  }

  toggleSpecialization(spec: string): void {
    const current: string[] = this.form.get('specializations')?.value || [];
    const next = current.includes(spec) ? current.filter(s => s !== spec) : [...current, spec];
    this.form.get('specializations')?.setValue(next);
  }

  isSpecSelected(spec: string): boolean {
    return (this.form.get('specializations')?.value || []).includes(spec);
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.isUploadingPhoto = true;
    const reader = new FileReader();
    reader.onload = () => { this.photoPreview = reader.result as string; };
    reader.readAsDataURL(file);

    this.architectService.uploadImage(file).subscribe({
      next: url => {
        this.form.get('photoUrl')?.setValue(url);
        this.isUploadingPhoto = false;
      },
      error: () => {
        this.toast.showError('Photo upload failed.');
        this.isUploadingPhoto = false;
      }
    });
  }

  save(): void {
    this.submitted = true;
    if (this.form.invalid) return;

    this.isSaving = true;
    const value = this.form.value;
    const payload: Partial<Architect> = {
      ...value,
      serviceAreas: this.splitList(value.serviceAreas),
      tags: this.splitList(value.tags)
    };

    const req = this.isEdit && this.architectId
      ? this.architectService.update(this.architectId, payload)
      : this.architectService.add(payload);

    req.subscribe({
      next: saved => {
        this.isSaving = false;
        this.toast.showSuccess(this.isEdit ? 'Architect updated.' : 'Architect added.');
        this.router.navigate(['/architects/profile', saved.id]);
      },
      error: () => {
        this.isSaving = false;
        this.toast.showError('Failed to save architect.');
      }
    });
  }

  private splitList(value: string): string[] {
    return (value || '').split(',').map(s => s.trim()).filter(Boolean);
  }

  cancel(): void {
    if (this.isEdit && this.architectId) {
      this.router.navigate(['/architects/profile', this.architectId]);
    } else {
      this.router.navigate(['/architects/directory']);
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Employee } from '../model/employee';
import { EmployeeService } from '../services/employee.service';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';

/**
 * Admin-only employee management: add / edit / delete the accounts that can
 * log in, and pick their role + home store. Replaces the old hardcoded
 * STATIC_USERS list in auth.service.ts — credentials now live only in the
 * Employee collection on the backend.
 */
@Component({
  selector: 'app-add-employee',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-employee.component.html',
  styleUrl: './add-employee.component.css'
})
export class AddEmployeeComponent implements OnInit {
  activeTab: 'add' | 'manage' = 'manage';
  submitted = false;
  isSaving = false;
  isLoading = false;
  editId: string | null = null;

  employees: Employee[] = [];

  deleteTarget: Employee | null = null;
  isDeleting = false;

  readonly roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'store_manager', label: 'Store Manager' },
  ];

  readonly storeLocations = ['Kishangarh', 'Banswara', 'Moradabad'];

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private employeeService: EmployeeService,
    private toastService: ToastService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadEmployees();
  }

  get currentUserName(): string | null {
    return this.auth.getCurrentUser();
  }

  goToDashboard(): void {
    this.router.navigate(['/search']);
  }

  private buildForm(): void {
    this.form = this.fb.group({
      employeeName:   ['', Validators.required],
      employeeNumber: [''],
      employeeEmail:  ['', Validators.email],
      storeLocation:  ['', Validators.required],
      role:           ['', Validators.required],
      password:       [''],
    });
  }

  switchTab(tab: 'add' | 'manage'): void {
    this.activeTab = tab;
  }

  async loadEmployees(): Promise<void> {
    this.isLoading = true;
    try {
      this.employees = await firstValueFrom(this.employeeService.getAll());
    } catch {
      this.toastService.showError('Failed to load employees.');
    } finally {
      this.isLoading = false;
    }
  }

  startAdd(): void {
    this.editId = null;
    this.submitted = false;
    this.buildForm();
    this.activeTab = 'add';
  }

  startEdit(emp: Employee): void {
    this.editId = emp.id;
    this.submitted = false;
    this.form = this.fb.group({
      employeeName:   [emp.employeeName, Validators.required],
      employeeNumber: [emp.employeeNumber || ''],
      employeeEmail:  [emp.employeeEmail || '', Validators.email],
      storeLocation:  [emp.storeLocation || '', Validators.required],
      role:           [emp.role || '', Validators.required],
      password:       [''], // blank = keep the existing password
    });
    this.activeTab = 'add';
  }

  cancelEdit(): void {
    this.editId = null;
    this.submitted = false;
    this.buildForm();
    this.activeTab = 'manage';
  }

  async save(): Promise<void> {
    this.submitted = true;
    if (this.form.invalid) return;

    const value = this.form.value;
    if (!this.editId && !value.password?.trim()) {
      this.toastService.showError('Password is required.');
      return;
    }

    this.isSaving = true;
    const payload: Partial<Employee> = {
      employeeName:   value.employeeName.trim(),
      employeeNumber: value.employeeNumber?.trim() || '',
      employeeEmail:  value.employeeEmail?.trim() || '',
      storeLocation:  value.storeLocation,
      role:           value.role,
    };
    if (value.password?.trim()) {
      payload.password = value.password.trim();
    }

    try {
      if (this.editId) {
        await firstValueFrom(this.employeeService.update(this.editId, payload));
        this.toastService.showSuccess('Employee updated successfully.');
      } else {
        await firstValueFrom(this.employeeService.add(payload));
        this.toastService.showSuccess('Employee added successfully.');
      }
      this.cancelEdit();
      await this.loadEmployees();
    } catch (err: any) {
      const msg = typeof err?.error === 'string' ? err.error : 'Failed to save employee.';
      this.toastService.showError(msg);
    } finally {
      this.isSaving = false;
    }
  }

  confirmDelete(emp: Employee): void {
    if (emp.employeeName === this.currentUserName) {
      this.toastService.showError("You can't delete the account you're currently logged in as.");
      return;
    }
    this.deleteTarget = emp;
  }

  cancelDelete(): void {
    this.deleteTarget = null;
  }

  async deleteEmployee(): Promise<void> {
    if (!this.deleteTarget || this.isDeleting) return;
    this.isDeleting = true;
    try {
      await firstValueFrom(this.employeeService.delete(this.deleteTarget.id, this.currentUserName));
      this.toastService.showSuccess('Employee deleted.');
      this.deleteTarget = null;
      await this.loadEmployees();
    } catch (err: any) {
      const msg = typeof err?.error === 'string' ? err.error : 'Failed to delete employee.';
      this.toastService.showError(msg);
    } finally {
      this.isDeleting = false;
    }
  }
}

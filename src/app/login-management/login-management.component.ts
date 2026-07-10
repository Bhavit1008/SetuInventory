import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SecurityService } from '../services/security.service';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-login-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login-management.component.html',
  styleUrl: './login-management.component.css'
})
export class LoginManagementComponent implements OnInit {

  loginFormGroup!: FormGroup;
  isMobile = false;

  constructor(
    private router: Router,
    private sessionService: SecurityService,
    private authService: AuthService,
    private toastService: ToastService
  ) {
    this.isMobile = window.innerWidth <= 768;
  }

  ngOnInit(): void {
    this.loginFormGroup = new FormGroup({
      loginId: new FormControl(''),
      password: new FormControl('')
    });
  }

  async saveLoginDetails(): Promise<void> {
    const { loginId, password } = this.loginFormGroup.value;

    if (!loginId?.trim() || !password?.trim()) {
      this.toastService.showError('Please fill in both fields.');
      return;
    }

    const user = this.authService.validateUser(loginId.trim(), password.trim());

    if (!user) {
      this.toastService.showError('Invalid login ID or password.');
      return;
    }

    const token = await this.sessionService.createEncPayload();
    localStorage.setItem('sessionId', token);
    this.authService.setCurrentUser(user);
    this.router.navigate(['/search']);
  }
}

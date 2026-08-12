import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, RouterOutlet } from '@angular/router';
import { Router, NavigationEnd } from '@angular/router';
import { ToastService } from './services/toast.service';
import { LayoutService } from './services/layout.service';
import { AuthService } from './services/auth.service';
import { ApprovalService } from './services/approval.service';
import { PushNotificationService } from './services/push-notification.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Inventory';
  toastColor: string = '#000000';
  loginError: string | null = null;
  showAlert = false;
  closing = false;
  isLoginPage = true;
  pendingApprovalCount = 0;
  directorySubmenuOpen = false;

  private routerSub?: Subscription;

  constructor(
    private router: Router,
    private toastService: ToastService,
    public layout: LayoutService,
    public auth: AuthService,
    public approvalService: ApprovalService,
    private push: PushNotificationService
  ) {}

  ngOnInit(): void {
    this.toastService.registerApp(this);

    this.approvalService.pendingCount.subscribe(count => {
      this.pendingApprovalCount = this.isAdmin ? count : 0;
    });

    // Init push subscriptions once the user is authenticated
    const user = this.auth.getCurrentUser();
    const role = this.auth.getCurrentRole();
    if (user && role) {
      this.push.init(user, role);
    }

    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.isLoginPage = e.urlAfterRedirects.startsWith('/login');

        if (e.urlAfterRedirects.startsWith('/architects')) {
          this.directorySubmenuOpen = true;
        }

        // Force re-login if a session exists but no role is stored (pre-RBAC session)
        if (!e.urlAfterRedirects.startsWith('/login') &&
            localStorage.getItem('sessionId') &&
            !this.auth.getCurrentRole()) {
          this.logout();
          return;
        }

        // Init push when navigating away from login (post-login landing)
        if (e.urlAfterRedirects === '/search') {
          const u = this.auth.getCurrentUser();
          const r = this.auth.getCurrentRole();
          if (u && r) this.push.init(u, r);
        }
      });

    if (this.router.url !== '/') {
      this.isLoginPage = this.router.url.startsWith('/login');
    }
    this.directorySubmenuOpen = this.router.url.startsWith('/architects');

    // Same check for initial load
    if (localStorage.getItem('sessionId') && !this.auth.getCurrentRole()) {
      this.logout();
    }
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  get isDirectoryActive(): boolean {
    return this.router.url.startsWith('/architects');
  }

  get currentUser(): string {
    return this.auth.getCurrentUser() ?? '';
  }

  get currentRole(): string {
    const role = this.auth.getCurrentRole();
    return role === 'admin' ? 'Administrator' : role === 'store_manager' ? 'Store Manager' : '';
  }


  openApprovals(): void {
    this.router.navigate(['/approvals']);
    this.layout.closeNav();
  }

  toggleDirectorySubmenu(event: Event): void {
    event.preventDefault();
    this.directorySubmenuOpen = !this.directorySubmenuOpen;
  }

  logout(): void {
    localStorage.removeItem('sessionId');
    this.auth.clearSession();
    this.router.navigate(['/login']);
  }

  triggerToast(message: string, color: string): void {
    this.loginError = message;
    this.closing = false;
    this.showAlert = true;
    this.toastColor = color;

    setTimeout(() => {
      this.closing = true;
      setTimeout(() => {
        this.showAlert = false;
        this.loginError = null;
        this.closing = false;
      }, 750);
    }, 6000);
  }
}

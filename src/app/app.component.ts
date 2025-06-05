import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { Platform } from '@angular/cdk/platform';
import { HttpClientModule } from '@angular/common/http';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, FormsModule,ReactiveFormsModule, CommonModule ,HttpClientModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'setuInventory';
  collapsed = true;
  toastColor: string = '#000000';

  loginError: string | null = null;
  showAlert = false;
  closing = false;
  isMobile ;

  constructor(private router: Router,private toastService: ToastService,private platform: Platform) {
    this.isMobile = this.platform.ANDROID || this.platform.IOS;
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
  }

  ngOnInit(){
    this.toastService.registerApp(this);
  }

  logout() {
    localStorage.removeItem('sessionId');
    this.router.navigate(['/login']);
  }

  triggerToast(message: string,color: string): void {
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



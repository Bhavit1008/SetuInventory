import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  navOpen = false;
  isMobile = false;
  darkMode = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.darkMode = localStorage.getItem('setu-theme') === 'dark';
      this.isMobile = window.innerWidth <= 900;
      window.addEventListener('resize', () => {
        this.isMobile = window.innerWidth <= 900;
        if (!this.isMobile) this.navOpen = false;
      });
    }
  }

  toggleNav(): void { this.navOpen = !this.navOpen; }
  closeNav(): void { this.navOpen = false; }

  toggleTheme(): void {
    this.darkMode = !this.darkMode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('setu-theme', this.darkMode ? 'dark' : 'light');
    }
  }
}

import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EmployeeService } from './employee.service';

export type UserRole = 'admin' | 'store_manager';

export interface AppUser {
  loginId: string;
  role: UserRole;
}

const ROLE_KEY = 'setu-user-role';
const USER_KEY = 'setu-user-id';

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private employeeService: EmployeeService) {}

  /** Validates credentials against the Employee collection — no credentials are hardcoded in the app. */
  async validateUser(loginId: string, password: string): Promise<AppUser | null> {
    try {
      const employee = await firstValueFrom(this.employeeService.login(loginId.trim(), password));
      if (!employee?.role) return null;
      return { loginId: employee.employeeName, role: employee.role as UserRole };
    } catch {
      return null;
    }
  }

  setCurrentUser(user: AppUser): void {
    localStorage.setItem(USER_KEY, user.loginId);
    localStorage.setItem(ROLE_KEY, user.role);
  }

  getCurrentUser(): string | null {
    return localStorage.getItem(USER_KEY);
  }

  getCurrentRole(): UserRole | null {
    return localStorage.getItem(ROLE_KEY) as UserRole | null;
  }

  isAdmin(): boolean {
    return this.getCurrentRole() === 'admin';
  }

  isStoreManager(): boolean {
    return this.getCurrentRole() === 'store_manager';
  }

  clearSession(): void {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
  }
}

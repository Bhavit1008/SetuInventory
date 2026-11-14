import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EmployeeService } from './employee.service';

export type UserRole = 'admin' | 'store_manager';

export interface AppUser {
  loginId: string;
  role: UserRole;
  storeLocations: string[];
}

const ROLE_KEY = 'setu-user-role';
const USER_KEY = 'setu-user-id';
const LOCATIONS_KEY = 'setu-user-locations';

/**
 * Marble Master (catalogue) is admin-only, with a one-off exception granted
 * by business request to specific store managers. Add more employeeNames
 * here as further exceptions are granted — replace with a per-employee
 * permission flag if this list grows past a handful of names.
 */
const CATALOGUE_ACCESS_EXCEPTIONS = ['ankit'];

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private employeeService: EmployeeService) {}

  /** Validates credentials against the Employee collection — no credentials are hardcoded in the app. */
  async validateUser(loginId: string, password: string): Promise<AppUser | null> {
    try {
      const employee = await firstValueFrom(this.employeeService.login(loginId.trim(), password));
      if (!employee?.role) return null;
      return { loginId: employee.employeeName, role: employee.role as UserRole, storeLocations: employee.storeLocations || [] };
    } catch {
      return null;
    }
  }

  setCurrentUser(user: AppUser): void {
    localStorage.setItem(USER_KEY, user.loginId);
    localStorage.setItem(ROLE_KEY, user.role);
    localStorage.setItem(LOCATIONS_KEY, JSON.stringify(user.storeLocations || []));
  }

  getCurrentUser(): string | null {
    return localStorage.getItem(USER_KEY);
  }

  getCurrentRole(): UserRole | null {
    return localStorage.getItem(ROLE_KEY) as UserRole | null;
  }

  /** The logged-in store manager's assigned godowns. Empty for an admin (who isn't restricted by location anyway). */
  getCurrentLocations(): string[] {
    try {
      const raw = localStorage.getItem(LOCATIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  isAdmin(): boolean {
    return this.getCurrentRole() === 'admin';
  }

  isStoreManager(): boolean {
    return this.getCurrentRole() === 'store_manager';
  }

  /** Admins can access every location; a store manager only their assigned ones. */
  canAccessLocation(location?: string | null): boolean {
    if (this.isAdmin()) return true;
    if (!location) return false;
    const locations = this.getCurrentLocations();
    return locations.some(l => l.toLowerCase() === location.toLowerCase());
  }

  /** Admins always get Marble Master; everyone else needs to be on the exception list. */
  canAccessCatalogue(): boolean {
    if (this.isAdmin()) return true;
    const user = this.getCurrentUser();
    return !!user && CATALOGUE_ACCESS_EXCEPTIONS.includes(user.toLowerCase());
  }

  clearSession(): void {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(LOCATIONS_KEY);
  }
}

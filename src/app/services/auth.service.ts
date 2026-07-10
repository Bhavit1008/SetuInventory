import { Injectable } from '@angular/core';

export type UserRole = 'admin' | 'store_manager';

export interface AppUser {
  loginId: string;
  role: UserRole;
}

const STATIC_USERS: Array<{ loginId: string; password: string; role: UserRole }> = [
  { loginId: 'setu',          password: 'password',  role: 'admin' },
  { loginId: 'bhavit',        password: 'password',  role: 'admin' },
  { loginId: 'meet',          password: 'password',  role: 'admin' },
  { loginId: 'store_manager', password: 'password1', role: 'store_manager' },
];

const ROLE_KEY = 'setu-user-role';
const USER_KEY = 'setu-user-id';

@Injectable({ providedIn: 'root' })
export class AuthService {

  validateUser(loginId: string, password: string): AppUser | null {
    const match = STATIC_USERS.find(
      u => u.loginId.toLowerCase() === loginId.toLowerCase() && u.password === password
    );
    return match ? { loginId: match.loginId, role: match.role } : null;
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

import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

/**
 * Stamps every outgoing request with the logged-in employee's name so the
 * backend can attribute audit-log entries (who added/edited/deleted a
 * product) without every service call having to thread it through manually.
 *
 * SSR-safe: AuthService.getCurrentUser() reads localStorage, which doesn't
 * exist during server-side prerendering. Skipping there (rather than
 * catching a thrown error) keeps this interceptor from disrupting every
 * other route's data-fetch during the build's prerender pass.
 */
export const employeeHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return next(req);

  const employeeName = inject(AuthService).getCurrentUser();
  if (!employeeName) return next(req);

  return next(req.clone({ setHeaders: { 'X-Employee-Name': employeeName } }));
};

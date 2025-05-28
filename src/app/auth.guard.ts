import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import {SecurityService} from "./services/security.service";

export const AuthGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const sessionService = inject(SecurityService);

  const sessionId = localStorage.getItem('sessionId');

  if (sessionId && await sessionService.isSessionValid(sessionId)) {
    return true;
  }
  else {
    router.navigate(['/login']);
    return false;
  }
};
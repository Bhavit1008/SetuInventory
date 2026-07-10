import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const VAPID_PUBLIC_KEY = 'BK1ftcp44rv2lzwwdP7YOoxU2e8qvMJA9TBu_5Zp5t24PxXPIjnfBdOvZDhgWGoZr_k2URQgw6y7tKKfjJ7ltug';
const BASE = 'https://setu-crm.onrender.com/push';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor(private http: HttpClient) {}

  get isSupported(): boolean {
    return typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'PushManager' in window
      && 'Notification' in window;
  }

  async init(userId: string, role: string): Promise<void> {
    if (!this.isSupported) return;

    try {
      // Register the service worker
      this.swRegistration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // Ask permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      // Subscribe to push
      const existing = await this.swRegistration.pushManager.getSubscription();
      const subscription = existing ?? await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send subscription to backend
      const subJson = subscription.toJSON();
      await firstValueFrom(
        this.http.post(`${BASE}/subscribe`, {
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.['p256dh'],
          auth: subJson.keys?.['auth'],
          userId,
          role,
        })
      );
    } catch (err) {
      console.warn('[Push] Subscription failed:', err);
    }
  }

  async unsubscribe(): Promise<void> {
    if (!this.swRegistration) return;
    try {
      const sub = await this.swRegistration.pushManager.getSubscription();
      if (sub) {
        await firstValueFrom(this.http.delete(`${BASE}/unsubscribe`, { body: { endpoint: sub.endpoint } }));
        await sub.unsubscribe();
      }
    } catch (err) {
      console.warn('[Push] Unsubscribe failed:', err);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  }
}

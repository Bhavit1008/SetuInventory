import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

export type RequestType = 'delete' | 'sell';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  type: RequestType;
  productId: string;
  productCode: string;
  productCategory: string;
  productSnapshot: any;
  requestedBy: string;
  requestedAt: number;
  status: RequestStatus;
  resolvedAt?: number;
}

const BASE = 'https://setu-crm.onrender.com/notification';

@Injectable({ providedIn: 'root' })
export class ApprovalService {
  private _requests: ApprovalRequest[] = [];
  private _pendingCount$ = new BehaviorSubject<number>(0);
  pendingCount = this._pendingCount$.asObservable();

  constructor(private http: HttpClient) {
    this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      const all = await firstValueFrom(this.http.get<ApprovalRequest[]>(`${BASE}/all`));
      this._requests = all ?? [];
      this._pendingCount$.next(this._requests.filter(r => r.status === 'pending').length);
    } catch {
      // keep existing cache on network error
    }
  }

  // ── Synchronous reads from in-memory cache ────────────────────────────────

  getAll(): ApprovalRequest[] {
    return [...this._requests].sort((a, b) => (b.requestedAt ?? 0) - (a.requestedAt ?? 0));
  }

  getPending(): ApprovalRequest[] {
    return this._requests.filter(r => r.status === 'pending');
  }

  getPendingCount(): number {
    return this._pendingCount$.getValue();
  }

  hasPendingForProduct(productId: string): ApprovalRequest | null {
    return this.getPending().find(r => r.productId === productId) ?? null;
  }

  // ── Mutations (async — hit backend then refresh cache) ────────────────────

  async submit(req: Omit<ApprovalRequest, 'id' | 'requestedAt' | 'status'>): Promise<ApprovalRequest> {
    const saved = await firstValueFrom(
      this.http.post<ApprovalRequest>(`${BASE}/submit`, req)
    );
    await this.refresh();
    return saved;
  }

  async approve(id: string): Promise<void> {
    await firstValueFrom(this.http.put(`${BASE}/${id}/approve`, {}));
    await this.refresh();
  }

  async reject(id: string): Promise<void> {
    await firstValueFrom(this.http.put(`${BASE}/${id}/reject`, {}));
    await this.refresh();
  }

  // ── Filtered retrieval from server ────────────────────────────────────────

  async fetchFiltered(params: { status?: string; type?: string; requestedBy?: string }): Promise<ApprovalRequest[]> {
    const query = new URLSearchParams();
    if (params.status)      query.set('status', params.status);
    if (params.type)        query.set('type', params.type);
    if (params.requestedBy) query.set('requestedBy', params.requestedBy);
    return firstValueFrom(
      this.http.get<ApprovalRequest[]>(`${BASE}/filter?${query.toString()}`)
    );
  }
}

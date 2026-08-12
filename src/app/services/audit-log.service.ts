import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuditLog } from '../model/audit-log';
import { PageResponse } from './product.service';

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  static backendHost = 'https://setu-crm.onrender.com/';

  constructor(private httpClient: HttpClient) {}

  getAll(page: number, size: number): Observable<PageResponse<AuditLog>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.httpClient.get<PageResponse<AuditLog>>(AuditLogService.backendHost + 'audit-logs', { params });
  }

  delete(id: string): Observable<void> {
    return this.httpClient.delete<void>(AuditLogService.backendHost + 'audit-logs/' + id);
  }
}

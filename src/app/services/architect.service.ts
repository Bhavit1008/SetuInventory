import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Architect } from '../model/architect';
import { ArchitectInteraction } from '../model/architect-interaction';
import { ArchitectFollowUp } from '../model/architect-followup';
import { ArchitectSample } from '../model/architect-sample';
import { ArchitectBusinessRecord } from '../model/architect-business';
import { ArchitectDocument } from '../model/architect-document';
import { ArchitectNote } from '../model/architect-note';

@Injectable({ providedIn: 'root' })
export class ArchitectService {
  static backendHost = 'https://setu-crm.onrender.com/architects';

  constructor(private http: HttpClient) {}

  // ── Architects ─────────────────────────────────────────────────────────
  getAll(): Observable<Architect[]> {
    return this.http.get<Architect[]>(`${ArchitectService.backendHost}/all`);
  }

  getById(id: string): Observable<Architect> {
    return this.http.get<Architect>(`${ArchitectService.backendHost}/${id}`);
  }

  add(architect: Partial<Architect>): Observable<Architect> {
    return this.http.post<Architect>(`${ArchitectService.backendHost}/add`, architect);
  }

  update(id: string, architect: Partial<Architect>): Observable<Architect> {
    return this.http.put<Architect>(`${ArchitectService.backendHost}/${id}`, architect);
  }

  updateStatus(id: string, status: string): Observable<Architect> {
    return this.http.put<Architect>(`${ArchitectService.backendHost}/${id}/status`, { status });
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${ArchitectService.backendHost}/${id}`);
  }

  filter(params: { city?: string; type?: string; status?: string; priority?: string; search?: string }): Observable<Architect[]> {
    let query = Object.entries(params)
      .filter(([, v]) => !!v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
      .join('&');
    return this.http.get<Architect[]>(`${ArchitectService.backendHost}/filter?${query}`);
  }

  // ── Interactions ───────────────────────────────────────────────────────
  addInteraction(item: Partial<ArchitectInteraction>): Observable<ArchitectInteraction> {
    return this.http.post<ArchitectInteraction>(`${ArchitectService.backendHost}/interactions/add`, item);
  }

  getAllInteractions(): Observable<ArchitectInteraction[]> {
    return this.http.get<ArchitectInteraction[]>(`${ArchitectService.backendHost}/interactions/all`);
  }

  getInteractionsByArchitect(architectId: string): Observable<ArchitectInteraction[]> {
    return this.http.get<ArchitectInteraction[]>(`${ArchitectService.backendHost}/interactions/architect/${architectId}`);
  }

  deleteInteraction(id: string): Observable<any> {
    return this.http.delete(`${ArchitectService.backendHost}/interactions/${id}`);
  }

  // ── Follow-ups / Tasks ─────────────────────────────────────────────────
  addFollowUp(item: Partial<ArchitectFollowUp>): Observable<ArchitectFollowUp> {
    return this.http.post<ArchitectFollowUp>(`${ArchitectService.backendHost}/followups/add`, item);
  }

  updateFollowUp(id: string, item: Partial<ArchitectFollowUp>): Observable<ArchitectFollowUp> {
    return this.http.put<ArchitectFollowUp>(`${ArchitectService.backendHost}/followups/${id}`, item);
  }

  getAllFollowUps(): Observable<ArchitectFollowUp[]> {
    return this.http.get<ArchitectFollowUp[]>(`${ArchitectService.backendHost}/followups/all`);
  }

  getFollowUpsByArchitect(architectId: string): Observable<ArchitectFollowUp[]> {
    return this.http.get<ArchitectFollowUp[]>(`${ArchitectService.backendHost}/followups/architect/${architectId}`);
  }

  deleteFollowUp(id: string): Observable<any> {
    return this.http.delete(`${ArchitectService.backendHost}/followups/${id}`);
  }

  // ── Samples & Materials ────────────────────────────────────────────────
  addSample(item: Partial<ArchitectSample>): Observable<ArchitectSample> {
    return this.http.post<ArchitectSample>(`${ArchitectService.backendHost}/samples/add`, item);
  }

  updateSample(id: string, item: Partial<ArchitectSample>): Observable<ArchitectSample> {
    return this.http.put<ArchitectSample>(`${ArchitectService.backendHost}/samples/${id}`, item);
  }

  getAllSamples(): Observable<ArchitectSample[]> {
    return this.http.get<ArchitectSample[]>(`${ArchitectService.backendHost}/samples/all`);
  }

  getSamplesByArchitect(architectId: string): Observable<ArchitectSample[]> {
    return this.http.get<ArchitectSample[]>(`${ArchitectService.backendHost}/samples/architect/${architectId}`);
  }

  deleteSample(id: string): Observable<any> {
    return this.http.delete(`${ArchitectService.backendHost}/samples/${id}`);
  }

  // ── Business & Orders ──────────────────────────────────────────────────
  addBusinessRecord(item: Partial<ArchitectBusinessRecord>): Observable<ArchitectBusinessRecord> {
    return this.http.post<ArchitectBusinessRecord>(`${ArchitectService.backendHost}/business/add`, item);
  }

  updateBusinessRecord(id: string, item: Partial<ArchitectBusinessRecord>): Observable<ArchitectBusinessRecord> {
    return this.http.put<ArchitectBusinessRecord>(`${ArchitectService.backendHost}/business/${id}`, item);
  }

  getAllBusinessRecords(): Observable<ArchitectBusinessRecord[]> {
    return this.http.get<ArchitectBusinessRecord[]>(`${ArchitectService.backendHost}/business/all`);
  }

  getBusinessRecordsByArchitect(architectId: string): Observable<ArchitectBusinessRecord[]> {
    return this.http.get<ArchitectBusinessRecord[]>(`${ArchitectService.backendHost}/business/architect/${architectId}`);
  }

  deleteBusinessRecord(id: string): Observable<any> {
    return this.http.delete(`${ArchitectService.backendHost}/business/${id}`);
  }

  // ── Documents & Files ──────────────────────────────────────────────────
  uploadDocumentFile(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${ArchitectService.backendHost}/documents/upload`, formData, { responseType: 'text' });
  }

  /** Generic Cloudinary passthrough (also used for architect logo/photo uploads). */
  uploadImage(file: File): Observable<string> {
    return this.uploadDocumentFile(file);
  }

  addDocument(item: Partial<ArchitectDocument>): Observable<ArchitectDocument> {
    return this.http.post<ArchitectDocument>(`${ArchitectService.backendHost}/documents/add`, item);
  }

  getAllDocuments(): Observable<ArchitectDocument[]> {
    return this.http.get<ArchitectDocument[]>(`${ArchitectService.backendHost}/documents/all`);
  }

  getDocumentsByArchitect(architectId: string): Observable<ArchitectDocument[]> {
    return this.http.get<ArchitectDocument[]>(`${ArchitectService.backendHost}/documents/architect/${architectId}`);
  }

  deleteDocument(id: string): Observable<any> {
    return this.http.delete(`${ArchitectService.backendHost}/documents/${id}`);
  }

  // ── Notes ──────────────────────────────────────────────────────────────
  addNote(item: Partial<ArchitectNote>): Observable<ArchitectNote> {
    return this.http.post<ArchitectNote>(`${ArchitectService.backendHost}/notes/add`, item);
  }

  getAllNotes(): Observable<ArchitectNote[]> {
    return this.http.get<ArchitectNote[]>(`${ArchitectService.backendHost}/notes/all`);
  }

  getNotesByArchitect(architectId: string): Observable<ArchitectNote[]> {
    return this.http.get<ArchitectNote[]>(`${ArchitectService.backendHost}/notes/architect/${architectId}`);
  }

  deleteNote(id: string): Observable<any> {
    return this.http.delete(`${ArchitectService.backendHost}/notes/${id}`);
  }
}

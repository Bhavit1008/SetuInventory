import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SavedCatalogue {
  id?: string;
  customerName?: string;
  catalogueName?: string;
  status?: 'draft' | 'final';

  material?: string;
  collection?: string;
  location?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  thickness?: string;
  quality?: string;
  availability?: string;

  selectedSlabIds?: string[];
  customRates?: Record<string, number>;

  layoutFormat?: string;
  infoFields?: string[];
  companyFields?: string[];
  validity?: string;

  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
}

@Injectable({ providedIn: 'root' })
export class SavedCatalogueService {
  private static base = 'https://setu-crm.onrender.com/saved-catalogues';

  constructor(private http: HttpClient) {}

  getAll(): Observable<SavedCatalogue[]> {
    return this.http.get<SavedCatalogue[]>(`${SavedCatalogueService.base}/all`);
  }

  save(catalogue: SavedCatalogue): Observable<SavedCatalogue> {
    return this.http.post<SavedCatalogue>(`${SavedCatalogueService.base}/add`, catalogue);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${SavedCatalogueService.base}/${id}`, { responseType: 'text' });
  }
}

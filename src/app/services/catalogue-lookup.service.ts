import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Product } from '../model/product';

export interface CatalogueMarbleRef {
  id: string;
  alternateTradeName?: string;
  stoneFamily?: string;
  collectionName?: string;
  country?: string;
}

/** Shared, app-wide resolver for "what should this product's Stone Type show as", plus general Marble Master lookups (stone family, collection, …) by catalogueItemId. */
@Injectable({ providedIn: 'root' })
export class CatalogueLookupService {
  private itemById = new Map<string, CatalogueMarbleRef>();
  private loadPromise: Promise<void> | null = null;

  constructor(private http: HttpClient) {}

  /** Fetches Marble Master once per app session (cached in this singleton) and reuses it for every caller. */
  async ensureLoaded(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = this.fetchAll();
    }
    await this.loadPromise;
  }

  private async fetchAll(): Promise<void> {
    try {
      const items = await firstValueFrom(this.http.get<CatalogueMarbleRef[]>('https://setu-crm.onrender.com/catalogue/all'));
      this.itemById = new Map(items.map(i => [i.id, i]));
    } catch {
      this.itemById = new Map();
    }
  }

  /** The full Marble Master entry a product is linked to, if any. */
  getItem(catalogueItemId: string | null | undefined): CatalogueMarbleRef | undefined {
    return catalogueItemId ? this.itemById.get(catalogueItemId) : undefined;
  }

  /** Trade Name (Marble Master), via catalogueItemId, whenever one's on record; the original Quality value otherwise. */
  stoneType(p: Product): string {
    const tradeName = this.getItem(p.catalogueItemId)?.alternateTradeName;
    if (tradeName) return tradeName.toUpperCase();
    return p.productQuality || '—';
  }

  /** Stone family (e.g. "Marble", "Granite") from the linked Marble Master entry, when there is one. */
  stoneFamily(p: Product): string {
    return this.getItem(p.catalogueItemId)?.stoneFamily || '';
  }

  /** Collection name from the linked Marble Master entry, when there is one. */
  collectionName(p: Product): string {
    return this.getItem(p.catalogueItemId)?.collectionName || '';
  }
}

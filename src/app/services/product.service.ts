import { Injectable } from '@angular/core';
import { Product } from '../model/product';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs/internal/Observable';
import { switchMap } from 'rxjs/internal/operators/switchMap';
import { map } from 'rxjs/internal/operators/map';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;   // current page index (0-based)
  size: number;
  first: boolean;
  last: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  static backendHost = 'https://setu-crm.onrender.com/';

  constructor(private httpClient: HttpClient) {}

  /**
   * Newest-first paginated product listing, optionally scoped to a category
   * ("Block" / "Slab"). Backs the Block Inventory / Slab Inventory pages.
   */
  getProductsPage(category: string | null, page: number, size: number): Observable<PageResponse<Product>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (category) params = params.set('category', category);
    return this.httpClient.get<PageResponse<Product>>(ProductService.backendHost + 'products', { params }).pipe(
      map(res => ({ ...res, content: res.content.map(raw => this.normalizeProduct(raw)) }))
    );
  }

  async fetchAllsProducts(): Promise<Product[]> {
    const response = await fetch(ProductService.backendHost + 'getAllProducts');
    if (!response.ok) {
      throw new Error('Failed to fetch data: ' + response.status);
    }

    const data: any[] = await response.json();
    return data.map(raw => this.normalizeProduct(raw));
  }

  /**
   * Mongo documents can legitimately have null/missing fields (e.g. status,
   * imageUrls on older records) since the backend model has no non-null
   * defaults. Fill those in with the Product class's defaults here, once,
   * so every consumer downstream (filters, cards, sorting) can trust the
   * non-nullable types Product already declares instead of null-checking
   * everywhere.
   */
  private normalizeProduct(raw: any): Product {
    const product = new Product();
    for (const key of Object.keys(product) as (keyof Product)[]) {
      const value = raw?.[key];
      if (value !== null && value !== undefined) {
        (product as any)[key] = value;
      }
    }
    return product;
  }

  postApiCall(data: any) {
    const headers = { 'content-type': 'application/json' };
    const body = JSON.stringify(data);
    return this.httpClient.post(ProductService.backendHost + 'addProduct', body, { 'headers': headers });
  }

  /**
   * Update only the status of a product (optionally merging extra fields,
   * e.g. the party name / sold quantity / sold sqft captured when marking
   * a product Sold). Sends the full product to the addProduct endpoint
   * (which handles both create and update via upsert).
   */
  updateProductStatus(product: Product, newStatus: string, extra: Partial<Product> = {}): Observable<any> {
    const updated = { ...product, status: newStatus, ...extra };
    const headers = { 'content-type': 'application/json' };
    const body = JSON.stringify(updated);
    return this.httpClient.post(ProductService.backendHost + 'addProduct', body, { 'headers': headers });
  }

  /**
   * Delete a product by ID.
   * Backend handles Cloudinary image cleanup for both block and slab-piece images.
   */
  deleteProduct(productId: string): Observable<any> {
    return this.httpClient.delete(ProductService.backendHost + 'deleteProduct/' + productId, {
      responseType: 'text'
    });
  }

  postIntransitApiCall(data: any) {
    const headers = { 'content-type': 'application/json' };
    const body = JSON.stringify(data);
    return this.httpClient.post(ProductService.backendHost + 'addTransit', body, { 'headers': headers });
  }

  getIntransitApiCall(data: any): Observable<any> {
    const headers = { 'content-type': 'application/json' };
    const body = JSON.stringify(data);
    return this.httpClient.post(ProductService.backendHost + 'getIntansit', body, { 'headers': headers });
  }

  uploadImage(data: any) {
    const blob = this.dataURLtoBlob(data);
    const formData = new FormData();
    formData.append('image', blob);

    return this.httpClient.post(ProductService.backendHost + 'upload-image', formData, {
      responseType: 'text'
    });
  }

  downloadImage(imageUrl: string): Observable<string> {
    return this.httpClient.get(imageUrl, { responseType: 'blob' }).pipe(
      switchMap(blob => {
        return new Observable<string>((observer) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            observer.next(reader.result as string);
            observer.complete();
          };
          reader.readAsDataURL(blob);
        });
      })
    );
  }

  private dataURLtoBlob(dataurl: string): Blob {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || '';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}
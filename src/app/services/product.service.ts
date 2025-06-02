import { Injectable } from '@angular/core';
import { Product } from '../model/product';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/internal/Observable';
import { switchMap } from 'rxjs/internal/operators/switchMap';


@Injectable({
  providedIn: 'root'
})
export class ProductService {

  constructor(private httpClient: HttpClient) {}

  async fetchAllsProducts(): Promise<Product[]> {

    const response = await fetch('https://setu-crm.onrender.com/getAllProducts');
    if (!response.ok) {
      throw new Error('Failed to fetch data: ' + response.status);
    }

    const data: any[] = await response.json();
    console.log('raw map :: ', data);
    const product: Product[] = data.map(raw => {
      const product = raw;
      return product;
    });
    return product;
  }

  postApiCall(data: any){
    const headers = { 'content-type': 'application/json'}  
    const body=JSON.stringify(data);
    var url = 'https://setu-crm.onrender.com/addProduct'
    return this.httpClient.post(url, body,{'headers':headers})
  }

  uploadImage(data: any){
    const blob = this.dataURLtoBlob(data);
    const formData = new FormData();
    formData.append('image', blob);

    return this.httpClient.post(`https://setu-crm.onrender.com/upload-image`, formData, {
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

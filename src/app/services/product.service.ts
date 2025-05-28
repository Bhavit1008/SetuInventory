import { Injectable } from '@angular/core';
import { Product } from '../model/product';
import { HttpClient } from '@angular/common/http';


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
}

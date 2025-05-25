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
      const product = new Product();
      product.id = Number(raw.id);
      product.category = raw.category;
      product.productCode = raw.productCode;
      product.godownLocation = raw.godownLocation;
      product.productQuality = raw.productQuality;
      product.productFinished = raw.productFinished;
      product.productLength = raw.productLength;
      product.productHeight = raw.productHeight;
      product.productThickness = raw.productThickness;
      product.productWidth = raw.productWidth;
      product.productWeight = raw.productWeight;
      product.quantity = raw.quantity;
      product.exFactoryCost = raw.exFactoryCost;
      product.freightCost = raw.freightCost;
      product.miscellaneousCost = raw.miscellaneousCost;
      product.inHouseCost = raw.inHouseCost;
      product.sellingCost = raw.sellingCost;
      product.royaltyCost = raw.royaltyCost;
      product.status = raw.status;
      product.description = raw.description;
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

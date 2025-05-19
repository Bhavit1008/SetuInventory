import { Injectable } from '@angular/core';
import { Product } from '../model/product';
import { Observable, of } from 'rxjs';
import { Block } from '../model/block';
import { Slab } from '../model/slab';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  constructor() {}

  async getBlockProducts(): Promise<Product[]> {

    const response = await fetch('https://setu-crm.onrender.com/getBlocks');
    if (!response.ok) {
      throw new Error('Failed to fetch data: ' + response.status);
    }

    const data: any[] = await response.json();
    const product: Product[] = data.map(raw => {
      const product = new Block();
      product.id = Number(raw.id);
      product.productCode = raw.productCode || '';
      product.productLength = Number(raw.productLength) || 0;
      product.productWidth = Number(raw.productWidth) || 0;
      product.productHeight = Number(raw.productHeight) || 0;
      product.productWeight = Number(raw.productWeight) || 0;
      product.remarks = raw.remarks || '';
      return product;
    });
   
    return product; // Simulates async HTTP call
  }

  async getSlabProducts(): Promise<Product[]> {
    //This needs to be updated
    const response = await fetch('https://setu-crm.onrender.com/getBlocks');  
    if (!response.ok) {
      throw new Error('Failed to fetch data: ' + response.status);
    }

    const data: any[] = await response.json();
    const product: Product[] = data.map(raw => {
      const product = new Slab();
      product.id = Number(raw.id);
      product.productCode = raw.productCode || '';
      product.productLength = Number(raw.productLength) || 0;
      product.productWidth = Number(raw.productWidth) || 0;
      product.remarks = raw.remarks || '';
      return product;
    });
    
    return product; // Simulates async HTTP call
  }
}

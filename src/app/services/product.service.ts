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

    const response = await fetch('https://setu-crm.onrender.com/getAllProducts');
    if (!response.ok) {
      throw new Error('Failed to fetch data: ' + response.status);
    }

    const data: any[] = await response.json();
    console.log('raw map :: ', data);
    const product: Product[] = data.map(raw => {
      const product = new Block();
      product.id = Number(raw.id);
      product.productCode = raw.productCode;
      product.godownLocation = raw.godownLocation;
      product.productLength = raw.productLength;
      product.productWidth = raw.productWidth;
      product.productHeight = raw.productHeight;
      product.productWeight = raw.productWeight;
      product.productThickness = raw.productThickness;
      product.exFactoryCost = raw.exFactoryCost;
      product.inHouseCost = raw.inHouseCost;
      product.freightCost = raw.freightCost;
      product.productFinished = raw.productFinished;
      
      product.remarks = raw.remarks;
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

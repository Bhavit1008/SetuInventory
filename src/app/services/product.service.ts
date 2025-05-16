import { Injectable } from '@angular/core';
import { Product } from '../model/product';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  constructor() {}

  getMockProducts(): Observable<Product[]> {
    
    const mockData: Product[] = [
      { id: 1, category: 'Slab', godonLocations: 'KishanGarh', productQuality: 'Banswara White', productCode: 'SLB-KBW', description: 'White slab from KishanGarh', price: 1200 },
      { id: 2, category: 'Block', godonLocations: 'KishanGarh', productQuality: 'Banswara Purble', productCode: 'BLK-KBP', description: 'Purple block from KishanGarh', price: 2100 },
      { id: 3, category: 'Slab', godonLocations: 'KishanGarh', productQuality: 'Torronto', productCode: 'SLB-KT', description: 'Torronto slab KG', price: 1800 },
      { id: 4, category: 'Block', godonLocations: 'KishanGarh', productQuality: 'Traventine B.', productCode: 'BLK-KTB', description: 'Traventine block KG', price: 1900 },
    
      { id: 5, category: 'Slab', godonLocations: 'Muradabad', productQuality: 'Banswara White', productCode: 'SLB-MBW', description: 'White slab from Muradabad', price: 1250 },
      { id: 6, category: 'Block', godonLocations: 'Muradabad', productQuality: 'Banswara Purble', productCode: 'BLK-MBP', description: 'Purple block Muradabad', price: 2200 },
      { id: 7, category: 'Slab', godonLocations: 'Muradabad', productQuality: 'Torronto', productCode: 'SLB-MT', description: 'Torronto slab Muradabad', price: 1850 },
      { id: 8, category: 'Block', godonLocations: 'Muradabad', productQuality: 'Traventine B.', productCode: 'BLK-MTB', description: 'Traventine block Muradabad', price: 1950 },
    
      { id: 9, category: 'Slab', godonLocations: 'Bangluru', productQuality: 'Banswara White', productCode: 'SLB-BBW', description: 'White slab from Bangluru', price: 1300 },
      { id: 10, category: 'Block', godonLocations: 'Bangluru', productQuality: 'Banswara Purble', productCode: 'BLK-BBP', description: 'Purple block Bangluru', price: 2250 },
      { id: 11, category: 'Slab', godonLocations: 'Bangluru', productQuality: 'Torronto', productCode: 'SLB-BT', description: 'Torronto slab Bangluru', price: 1750 },
      { id: 12, category: 'Block', godonLocations: 'Bangluru', productQuality: 'Traventine B.', productCode: 'BLK-BTB', description: 'Traventine block Bangluru', price: 2000 },
    
      { id: 13, category: 'Slab', godonLocations: 'Other', productQuality: 'Banswara White', productCode: 'SLB-OBW', description: 'White slab from Other', price: 1100 },
      { id: 14, category: 'Block', godonLocations: 'Other', productQuality: 'Banswara Purble', productCode: 'BLK-OBP', description: 'Purple block from Other', price: 2150 },
      { id: 15, category: 'Slab', godonLocations: 'Other', productQuality: 'Torronto', productCode: 'SLB-OT', description: 'Torronto slab Other', price: 1650 },
      { id: 16, category: 'Block', godonLocations: 'Other', productQuality: 'Traventine B.', productCode: 'BLK-OTB', description: 'Traventine block Other', price: 2050 },
    
      // ✅ Extra data for filtering variation
      { id: 17, category: 'Block', godonLocations: 'Muradabad', productQuality: 'Torronto', productCode: 'BLK-MT2', description: 'Duplicate entry for testing', price: 1950 },
      { id: 18, category: 'Slab', godonLocations: 'KishanGarh', productQuality: 'Traventine B.', productCode: 'SLB-KTB2', description: 'Extra Traventine slab', price: 1750 },
      { id: 19, category: 'Block', godonLocations: 'Other', productQuality: 'Banswara White', productCode: 'BLK-OBW2', description: 'Extra white block entry', price: 2300 }
    ];
    return of(mockData); // Simulates async HTTP call
  }
}

import { SlabPieces } from "./slab-pieces";

export class Product {
  id: string = '';
  category: string = '';
  productCode: string = '';
  godownLocation: string = '';
  productQuality: string = '';
  productFinished: string = '';
  productLength:number=0;
  productHeight: number =0;
  productThickness: number=0;
  productWidth:number=0;
  productWeight: number=0;
  quantity: number=0;
  exFactoryCost: number=0;
  freightCost: number = 0;
  miscellaneousCost: number = 0;
  inHouseCost: number=0;
  sellingCost: number =0;
  royaltyCost: number=0;
  status:string ='';
  description: string = '';
  pieces: SlabPieces[] = [];
  imageUrl: string=''; 
  }
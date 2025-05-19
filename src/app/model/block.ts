import { Product } from './product';

export class Block extends Product {
  productHeight:number = 0;
  productWeight:number=0;
  loadingDate:Date  = new Date();

  constructor() {
    super();
    this.category = 'Block';
  }
}
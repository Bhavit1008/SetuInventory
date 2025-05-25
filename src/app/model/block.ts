import { Product } from './product';

export class Block extends Product {
  loadingDate:Date  = new Date();

  constructor() {
    super();
    this.category = 'Block';
  }
}
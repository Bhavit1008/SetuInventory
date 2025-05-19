import { Product } from './product';

export class Slab extends Product {
  numberOfPieces:number = 0;
  manufacturedDate:Date  = new Date();

  constructor() {
    super();
    this.category = 'Slab';
  }
}
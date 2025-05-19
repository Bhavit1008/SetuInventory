import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../model/product';
import { Router } from '@angular/router';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css'
})
export class ProductCardComponent {
  @Input() product!: Product;
  constructor(private router: Router) {}

  editProduct(product: any) {
  this.router.navigate(['/blocks'], {
    state: { formData: product }
  });
  }
}

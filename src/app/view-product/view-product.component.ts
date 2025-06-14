import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Product } from '../model/product';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-view-product',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-product.component.html',
  styleUrl: './view-product.component.css'
})
export class ViewProductComponent {
  product: Product;

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    this.product = nav?.extras?.state?.['product'];
  }

  getStatusClass(status: string): string {
  switch (status?.toLowerCase()) {
    case 'available':
      return 'status-available';
    case 'sold':
      return 'status-sold';
    case 'hold':
      return 'status-hold';
    default:
      return 'status-default';
  }
}
}

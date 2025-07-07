import { Component, Input,  ElementRef, Renderer2, ViewChild, Output, EventEmitter, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../model/product';
import { Router } from '@angular/router';
import { ProductService } from '../services/product.service';
import { ToastService } from '../services/toast.service';


@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css'
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Output() changeStatus = new EventEmitter<Product>();
  @ViewChild('popupInput') popupInput!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('popupContainer') popupContainer!: ElementRef<HTMLElement>;
  constructor(private router: Router) {}

  
  editProduct(product: Product) {
    if(product.category.toLowerCase()==='slab'){
      this.router.navigate(['/slab'], {
        state: { formData: product }
      });
    }
    else{
      this.router.navigate(['/blocks'], {
        state: { formData: product }
      });
    }
  }
  viewProduct(product: Product) {
    this.router.navigate(['/view-product'], {
      state: { product: product }
    });
  }

  addIntransit(product: Product){
    this.router.navigate(['/intransit'], {
      state: { product: product }
    });
  }

  onChangeStatusClick() {
    this.changeStatus.emit(this.product);
  }
}

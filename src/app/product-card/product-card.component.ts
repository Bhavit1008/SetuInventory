import { Component, Input,  ElementRef, Renderer2, ViewChild, } from '@angular/core';
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
  @ViewChild('popupInput') popupInput!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('popupContainer') popupContainer!: ElementRef<HTMLElement>;
  constructor(private router: Router, private renderer: Renderer2, private productService: ProductService, private toastService: ToastService) {}
  isPopupOpen = false;
  popUpOrigin = '';

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

    openPopup(popUpOrigin: any): void {
    this.isPopupOpen = true;
    this.popUpOrigin = popUpOrigin;
    this.renderer.addClass(document.body, 'modal-open');

    setTimeout(() => {
      this.popupInput?.nativeElement?.focus();

      this.popupContainer?.nativeElement?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 0);
    console.log(this.popUpOrigin)
  }

  closePopup(): void {
    this.isPopupOpen = false;
    this.popUpOrigin = '';
    console.log(this.popUpOrigin)
  }

  handleOk(value: string,popUpOrigin: any, product: Product): void {
    product.description = value;
    product.status = popUpOrigin;
    console.log('IN HANDLE OK METHOD',popUpOrigin);
    this.productService.postApiCall(product).subscribe(() => {
        this.toastService.showSuccess("Slab details updated successfully.");
        })
    // Process or store the value as needed
    this.closePopup();
  }
}

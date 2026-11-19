import {
  Component,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../model/product';
import { Router } from '@angular/router';
import { CatalogueLookupService } from '../services/catalogue-lookup.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
})
export class ProductCardComponent {
  @Input() product!: Product;

  constructor(private router: Router, private catalogueLookup: CatalogueLookupService) {
    this.catalogueLookup.ensureLoaded();
  }

  /** Trade Name (Marble Master) for anything created on/after the cutoff; the original Quality value for everything older — see CatalogueLookupService. */
  get stoneType(): string {
    return this.catalogueLookup.stoneType(this.product);
  }

  /**
   * Blocks use their own block-level photo. Slabs use the first piece's own
   * photo instead — falling back to a block-level image only if no piece has
   * one, since a standalone slab never had a block image to inherit.
   */
  get thumb(): string {
    if (this.product.category?.toLowerCase() === 'slab') {
      const withImg = this.product.pieces?.find(pc => pc.imageUrl || pc.imageBase64);
      if (withImg) return withImg.imageUrl || withImg.imageBase64;
    }
    if (this.product.imageUrls?.length) return this.product.imageUrls[0];
    return this.product.imageUrl || '';
  }

  viewProduct(product: Product): void {
    this.router.navigate(['/view-product'], { state: { product }, queryParams: { id: product.id } });
  }
}
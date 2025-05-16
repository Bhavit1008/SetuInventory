import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Product } from '../model/product';
import { Observable } from 'rxjs';
import { ProductService } from '../services/product.service';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [CommonModule, FormsModule ,ReactiveFormsModule , ProductCardComponent ],
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.css'
})
export class SearchPageComponent implements OnInit{
  isMobile = false;
  sidebarVisible = false;
  sortAsc = true;

  searchForm: FormGroup;
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  categories: string[] = ['Slab', 'Block']; 
  ngOnInit() {
    this.checkMobile();
    window.addEventListener('resize', () => this.checkMobile());
  }
  checkMobile() {
    this.isMobile = window.innerWidth <= 768;
  }
  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
  }

  closeSidebar() {
    this.sidebarVisible = false;
  }

  constructor(private fb: FormBuilder, private productService: ProductService) {
    this.searchForm = this.fb.group({
      category: [''],
      godonLocations: [''],
      productQuality: [''],
      productCode: [''],
      minPrice: [''],
      maxPrice: ['']
    });

    this.productService.getMockProducts().subscribe(products => {
      this.allProducts = products;
      this.filteredProducts = [...products];
    });
  }

  // Apply the filter based on input
  applyFilter() {
    const {godonLocations,productQuality, productCode, category, minPrice, maxPrice } = this.searchForm.value;

    this.filteredProducts = this.allProducts.filter(p =>
      (!category || p.category.toLowerCase().includes(category.toLowerCase())) &&
      (!godonLocations || p.godonLocations.toLowerCase().includes(godonLocations.toLowerCase())) &&
      (!productQuality || p.productQuality.toLowerCase().includes(productQuality.toLowerCase())) &&
      (!productCode || p.productCode.toLowerCase().includes(productCode.toLowerCase())) &&
      (!category || p.category.toLowerCase().includes(category.toLowerCase())) &&
      (!minPrice || p.price >= +minPrice) &&
      (!maxPrice || p.price <= +maxPrice)
    );
    this.closeSidebar();
  }

  resetForm() {
    this.searchForm.reset();
    this.filteredProducts = [...this.allProducts];
    this.closeSidebar(); 
  }
  sortData(){
    this.sortAsc ? this.filteredProducts.sort((a, b) => a.price - b.price) : this.filteredProducts.sort((a, b) => b.price - a.price);
    this.sortAsc = !this.sortAsc;
  }
 
}

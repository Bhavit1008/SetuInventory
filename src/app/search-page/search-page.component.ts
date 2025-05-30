import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Product } from '../model/product';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { ProductService } from '../services/product.service';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [CommonModule, FormsModule ,ReactiveFormsModule , ProductCardComponent ,NgxSkeletonLoaderModule  ],
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.css'
})
export class SearchPageComponent implements OnInit{
  isMobile = false;
  sidebarVisible = false;
  sortAsc = true;
  isLoading = true;
  showAvailable = true;

  searchForm: FormGroup;
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  finalProducts: Product[] = [];  
  categories= [
    { id: 1, label: "Slab" },
    { id: 2, label: "Block" },
  ]; 

  goDownLocations = [
    { id: 1, label: "Kishangarh" },
    { id: 2, label: "Moradabad" },
    { id: 3, label: "Banswara"}
  ]

  productQuality = [
    { id: 1, label: "Banswara White"},
    { id: 2, label: "Banswara Purple"},
    { id: 3, label: "Torronto"},
    { id: 4, label: "Traventine B."},
    { id: 5, label: "Kayampura"},
    { id: 6, label: "Morchana Brown"},
    { id: 7, label: "Marine Black"},
    { id: 8, label: "Kesariya Green"},
  ]

  ngOnInit() {
    this.productService.fetchAllsProducts().then(products => {
      this.allProducts = products;
      this.filteredProducts = [...products]
      this.finalProducts = [...products];
      this.isLoading = false;
    });
    if (typeof window !== 'undefined') {
      this.checkMobile();
      window.addEventListener('resize', () => this.checkMobile());
    }
  }
  checkMobile() {
    if (typeof window !== 'undefined') {
    this.isMobile = window.innerWidth <= 768;
  }
  }
  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
    if (this.sidebarVisible && this.isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeSidebar() {
    this.sidebarVisible = false;
    if (this.isMobile) {
      document.body.style.overflow = '';
    }
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
  }

  // Apply the filter based on input
  applyFilter() {
    const {godonLocations,productQuality, productCode, category, minPrice, maxPrice } = this.searchForm.value;

    this.filteredProducts = this.allProducts.filter(p =>
      (!category || p.category.toLowerCase().includes(category.toLowerCase())) &&
      (!godonLocations || p.godownLocation.toLowerCase().includes(godonLocations.toLowerCase())) &&
      (!productQuality || p.productQuality.toLowerCase().includes(productQuality.toLowerCase())) &&
      (!productCode || p.productCode.toLowerCase().includes(productCode.toLowerCase())) &&
      (!category || p.category.toLowerCase().includes(category.toLowerCase())) &&
      (!minPrice || p.sellingCost >= +minPrice) &&
      (!maxPrice || p.sellingCost <= +maxPrice)
    );
    this.finalProducts=[...this.filteredProducts];
    this.closeSidebar();
  }

  resetForm() {
    this.searchForm.reset();
    this.filteredProducts = [...this.allProducts];
    this.closeSidebar(); 
  }
  sortData(){
    this.sortAsc ? this.filteredProducts.sort((a, b) => a.sellingCost - b.sellingCost) : this.filteredProducts.sort((a, b) => b.sellingCost - a.sellingCost);
    this.sortAsc = !this.sortAsc;
  }
  availableProduct() {
    if (this.showAvailable) {
      this.finalProducts = this.filteredProducts.filter(p => p.status.toLowerCase().includes('available'));
    } else {
      this.finalProducts = [...this.filteredProducts];
    }
    this.showAvailable = !this.showAvailable;
  }
 
}

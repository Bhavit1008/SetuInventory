import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Product } from '../model/product';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { ProductService } from '../services/product.service';
import { ProductCardComponent } from '../product-card/product-card.component';
import { ToastService } from '../services/toast.service';

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
  isPopupOpen = false;
  product: Product = new Product();

  searchForm: FormGroup;
  popupForm: FormGroup;
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  finalProducts: Product[] = [];  
  selectedLinkId: string = 'All';

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

  
  statusList = [
    { label: 'Available' },
    { label: 'Processing' },
    { label: 'Hold' },
    { label: 'Sold' },
  ];

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
    this.selectedLinkId = 'All';
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

  constructor(private fb: FormBuilder, private productService: ProductService,private toastService : ToastService) {
    this.searchForm = this.fb.group({
      category: [''],
      godonLocations: [''],
      productQuality: [''],
      status:[''],
      productCode: [''],
      minPrice: [''],
      maxPrice: [''],
      minQuantity: [''],
      maxQuantity: ['']
    });
    this.popupForm = this.fb.group({
      status: [''],
      remark: ['']
    });
  }

  applyFilter() {
    const {godonLocations,productQuality,status, productCode, category, minPrice, maxPrice,minQuantity ,maxQuantity} = this.searchForm.value;

    this.filteredProducts = this.allProducts.filter(p =>
      (!category || p.category.toLowerCase().includes(category.toLowerCase())) &&
      (!godonLocations || p.godownLocation.toLowerCase().includes(godonLocations.toLowerCase())) &&
      (!productQuality || p.productQuality.toLowerCase().includes(productQuality.toLowerCase())) &&
      (!status || p.status.toLowerCase().includes(status.toLowerCase())) &&
      (!productCode || p.productCode.toLowerCase().includes(productCode.toLowerCase())) &&
      (!minPrice || p.sellingCost >= +minPrice) &&
      (!maxPrice || p.sellingCost <= +maxPrice) &&
      (!minQuantity || p.quantity >= +minQuantity) &&
      (!maxQuantity || p.quantity <= +maxQuantity)
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

  highlight(linkId: string, event: Event): void {
    event.preventDefault();
    this.applyStatusFilter(linkId);
    this.selectedLinkId = linkId;
  }

  getLinkStyle(status: string) {
    return {
      backgroundColor: this.selectedLinkId === status ? '#2c7be5' : '#fff',
      color: this.selectedLinkId === status ? '#fff' : '#333',
      border: '1px solid ' + (this.selectedLinkId === status ? '#2c7be5' : '#ddd')
    };
  }

  applyStatusFilter(status: any) {
    this.filteredProducts = this.allProducts.filter(p =>
      (!status || p.status.toLowerCase().includes(status.toLowerCase()))
    );
    this.finalProducts=[...this.filteredProducts];
    if(status=='All'){
      this.finalProducts=this.allProducts;
    }
  }

  openPopup(product: Product) {
    this.product = product;
    this.isPopupOpen = true;
    document.body.style.overflow = 'hidden';

    this.popupForm = this.fb.group({
      status: [''],
      remark: ['']
    });
  }

  closePopup(): void {
    this.isPopupOpen = false;
    this.ngOnInit();
    document.body.style.overflow = '';
  }

  handleOk(): void {
    const status = this.popupForm.value.status;
    const remark = this.popupForm.value.remark;

    const existingRemark = this.product.description ? this.product.description + ' | ' : '';
    const updatedProduct = {
      ...this.product,
      status,
      description: existingRemark + remark
    };

    this.productService.postApiCall(updatedProduct).subscribe(() => {
      this.toastService.showSuccess("Status updated successfully.");
      this.applyStatusFilter('All');
      this.closePopup();
    });
  }

}

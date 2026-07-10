import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { firstValueFrom } from 'rxjs';
import { Product } from '../model/product';
import { ProductService } from '../services/product.service';
import { ToastService } from '../services/toast.service';
import { LayoutService } from '../services/layout.service';

interface StatCard {
  icon: 'cube' | 'scale' | 'layers' | 'check' | 'box';
  colorClass: string;
  label: string;
  value: string;
  sub: string;
}

/**
 * Shared listing page for "Block Inventory", "Slab Inventory" and
 * "Process Inventory" nav items. The page title, plus either a category
 * ("Block" / "Slab") or a status filter ("Process"), come from route data,
 * so one component backs all three routes instead of duplicating
 * near-identical code.
 *
 * The full scoped set (category or status) is fetched once and then
 * filtered/paginated client-side, since the backend doesn't support status
 * or the advanced filter fields as query params. Category-scoped views
 * (Block/Slab Inventory) exclude products whose status is "Process" — those
 * only show up in Process Inventory — so an item disappears from its
 * category list the moment it's marked as being processed.
 */
@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgxSkeletonLoaderModule],
  templateUrl: './inventory-list.component.html',
  styleUrl: './inventory-list.component.css',
})
export class InventoryListComponent implements OnInit {
  category: string | null = null;
  statusFilter: string | null = null;
  pageTitle = '';

  isLoading = true;
  pageItems: Product[] = [];

  pageNumber = 0;
  pageSize = 20;
  totalPages = 0;
  totalElements = 0;

  filterPanelVisible = false;
  filterActive = false;
  filterForm: FormGroup;

  /** Full scoped set: category or status filtered, with in-process items excluded from category views. */
  private baseProducts: Product[] = [];
  /** baseProducts narrowed by the ad-hoc filter panel, when active. */
  private displayProducts: Product[] = [];

  goDownLocations = [
    { id: 1, label: 'Kishangarh' },
    { id: 2, label: 'Moradabad' },
    { id: 3, label: 'Banswara' },
  ];

  productQuality = [
    { id: 1, label: 'Banswara White' },
    { id: 2, label: 'Banswara Purple' },
    { id: 3, label: 'Torronto' },
    { id: 4, label: 'Traventine B.' },
    { id: 5, label: 'Kayampura' },
    { id: 6, label: 'Morchana Brown' },
    { id: 7, label: 'Marine Black' },
    { id: 8, label: 'Kesariya Green' },
  ];

  statusList = [
    { label: 'Available' },
    { label: 'Hold' },
    { label: 'Sold' },
    { label: 'InTransit' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private productService: ProductService,
    private toast: ToastService,
    public layout: LayoutService,
  ) {
    this.filterForm = this.fb.group({
      godonLocations: [''],
      productQuality: [''],
      status: [''],
      productCode: [''],
      minPrice: [''],
      maxPrice: [''],
      minQuantity: [''],
      maxQuantity: [''],
    });
  }

  ngOnInit(): void {
    this.category = this.route.snapshot.data['category'] ?? null;
    this.statusFilter = this.route.snapshot.data['statusFilter'] ?? null;
    this.pageTitle = this.route.snapshot.data['title'];
    this.loadAll();
  }

  get itemLabel(): string {
    if (this.category === 'Block') return 'Blocks';
    if (this.category === 'Slab') return 'Slabs';
    return 'Items';
  }

  get emptyStateLabel(): string {
    return this.category ?? this.pageTitle;
  }

  get statCards(): StatCard[] {
    const items = this.baseProducts;
    const totalWeight = items.reduce((s, p) => s + (Number(p.productWeight) || 0), 0);
    const totalSqft = items.reduce((s, p) => s + this.productSqft(p), 0);

    const cards: StatCard[] = [
      {
        icon: 'cube', colorClass: 'stat-orange',
        label: `Total ${this.itemLabel}`,
        value: items.length.toLocaleString(),
        sub: this.category ? 'All locations' : 'All categories',
      },
    ];

    if (this.category !== 'Slab') {
      cards.push({
        icon: 'scale', colorClass: 'stat-green',
        label: 'Total Weight',
        value: totalWeight.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        sub: 'Tons',
      });
    }
    if (this.category !== 'Block') {
      cards.push({
        icon: 'layers', colorClass: 'stat-blue',
        label: 'Total Sqft',
        value: totalSqft.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        sub: 'sq ft',
      });
    }

    if (this.statusFilter) {
      const blocks = items.filter(p => p.category?.toLowerCase() === 'block').length;
      const slabs = items.filter(p => p.category?.toLowerCase() === 'slab').length;
      cards.push({ icon: 'box', colorClass: 'stat-purple', label: 'Blocks Pending', value: blocks.toLocaleString(), sub: 'In process' });
      cards.push({ icon: 'layers', colorClass: 'stat-purple', label: 'Slabs Pending', value: slabs.toLocaleString(), sub: 'In process' });
    } else {
      const available = items.filter(p => p.status?.toLowerCase() === 'available').length;
      cards.push({
        icon: 'check', colorClass: 'stat-teal',
        label: `Available ${this.itemLabel}`,
        value: available.toLocaleString(),
        sub: 'Ready for sale',
      });
    }

    return cards;
  }

  private productSqft(p: Product): number {
    if (p.pieces?.length) return p.pieces.reduce((s, pc) => s + (Number(pc.totalArea) || 0), 0);
    return Number(p.sqft) || Number(p.size) || 0;
  }

  productSize(p: Product): string {
    if (p.category?.toLowerCase() === 'slab') {
      return `${p.productLength || '—'} × ${p.productWidth || '—'}`;
    }
    return `${p.productLength || '—'} × ${p.productWidth || '—'} × ${p.productHeight || '—'}`;
  }

  productMetric(p: Product): string {
    if (p.category?.toLowerCase() === 'slab') {
      const sqft = this.productSqft(p);
      return sqft ? `${sqft.toLocaleString(undefined, { maximumFractionDigits: 2 })} sqft` : '—';
    }
    return p.productWeight ? `${p.productWeight} Tons` : '—';
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'available':  return 'status-available';
      case 'sold':       return 'status-sold';
      case 'hold':       return 'status-hold';
      case 'process':    return 'status-process';
      case 'intransit':  return 'status-intransit';
      default:           return 'status-default';
    }
  }

  async loadAll(): Promise<void> {
    this.isLoading = true;
    try {
      const res = await firstValueFrom(this.productService.getProductsPage(this.category, 0, 5000));
      this.baseProducts = this.statusFilter
        ? res.content.filter(p => p.status?.toLowerCase() === this.statusFilter!.toLowerCase())
        : res.content.filter(p => p.status?.toLowerCase() !== 'process');

      this.filterForm.reset();
      this.filterActive = false;
      this.displayProducts = this.baseProducts;
      this.pageNumber = 0;
      this.recomputePagination();
    } catch {
      this.toast.showError('Failed to load inventory.');
    } finally {
      this.isLoading = false;
    }
  }

  private recomputePagination(): void {
    this.totalElements = this.displayProducts.length;
    this.totalPages = Math.max(1, Math.ceil(this.displayProducts.length / this.pageSize));
    const start = this.pageNumber * this.pageSize;
    this.pageItems = this.displayProducts.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.pageNumber = page;
    this.recomputePagination();
  }

  prevPage(): void { this.goToPage(this.pageNumber - 1); }
  nextPage(): void { this.goToPage(this.pageNumber + 1); }

  toggleFilterPanel(): void {
    this.filterPanelVisible = !this.filterPanelVisible;
  }

  closeFilterPanel(): void {
    this.filterPanelVisible = false;
  }

  applyFilter(): void {
    const { godonLocations, productQuality, status, productCode, minPrice, maxPrice, minQuantity, maxQuantity } = this.filterForm.value;

    this.displayProducts = this.baseProducts.filter(p =>
      (!godonLocations || p.godownLocation?.toLowerCase().includes(godonLocations.toLowerCase())) &&
      (!productQuality || p.productQuality?.toLowerCase().includes(productQuality.toLowerCase())) &&
      (!status || p.status?.toLowerCase().includes(status.toLowerCase())) &&
      (!productCode || p.productCode?.toLowerCase().includes(productCode.toLowerCase())) &&
      (!minPrice || p.sellingCost >= +minPrice) &&
      (!maxPrice || p.sellingCost <= +maxPrice) &&
      (!minQuantity || p.quantity >= +minQuantity) &&
      (!maxQuantity || p.quantity <= +maxQuantity)
    );

    this.filterActive = true;
    this.pageNumber = 0;
    this.recomputePagination();
    this.closeFilterPanel();
  }

  resetFilter(): void {
    this.filterForm.reset();
    this.filterActive = false;
    this.displayProducts = this.baseProducts;
    this.pageNumber = 0;
    this.recomputePagination();
  }

  viewProduct(product: Product): void {
    this.router.navigate(['/view-product'], { state: { product } });
  }

  goBack(): void {
    this.router.navigate(['/search']);
  }
}

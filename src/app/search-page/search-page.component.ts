import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Product } from '../model/product';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { ProductService } from '../services/product.service';
import { ProductCardComponent } from '../product-card/product-card.component';
import { ToastService } from '../services/toast.service';
import { LayoutService } from '../services/layout.service';
import { AuthService } from '../services/auth.service';
import { ApprovalService } from '../services/approval.service';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

interface StatCard {
  key: string | null;
  icon: 'cube' | 'layers' | 'truck' | 'bag' | 'trend';
  label: string;
  value: number | string;
  sub: string;
}

interface MarbleSqftRow { marble: string; totalSqft: number; lots: number; }
interface MarbleBlockRow { marble: string; totalBlocks: number; lots: number; }
interface StatusBreakdownItem { key: string; label: string; color: string; count: number; percent: number; }
interface AlertItem { type: 'low' | 'warning' | 'info'; message: string; filterKey: string; }

const STATUS_META: Record<string, { label: string; color: string }> = {
  Available:  { label: 'Ready',      color: 'var(--success)' },
  Hold:       { label: 'Reserved',   color: 'var(--warning)' },
  Processing: { label: 'In Process', color: 'var(--info)' },
  Sold:       { label: 'Sold',       color: 'var(--danger)' },
  InTransit:  { label: 'In Transit', color: 'var(--accent)' },
};

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ProductCardComponent, NgxSkeletonLoaderModule],
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.css'
})
export class SearchPageComponent implements OnInit {
  filterPanelVisible = false;
  isLoading = true;
  isPopupOpen = false;
  customFilterActive = false;
  sortAsc = true;

  product: Product = new Product();

  searchForm: FormGroup;
  popupForm: FormGroup;

  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  finalProducts: Product[] = [];
  selectedLinkId: string = 'All';

  // ---------- dashboard stats ----------
  totalBlocksCount = 0;
  totalSlabsCount = 0;
  inTransitCount = 0;
  soldThisMonthCount = 0;
  avgRecovery: number | null = null;

  sqftByMarble: MarbleSqftRow[] = [];
  blocksByMarble: MarbleBlockRow[] = [];
  totalSlabSqftDisplay = 0;
  totalSlabLots = 0;
  totalBlockLots = 0;

  slabStatusBreakdown: StatusBreakdownItem[] = [];
  blockStatusBreakdown: StatusBreakdownItem[] = [];

  inTransitItems: Product[] = [];
  recentSoldItems: Product[] = [];
  alerts: AlertItem[] = [];
  statCards: StatCard[] = [];

  categories = [
    { id: 1, label: "Slab" },
    { id: 2, label: "Block" },
  ];

  goDownLocations = [
    { id: 1, label: "Kishangarh" },
    { id: 2, label: "Moradabad" },
    { id: 3, label: "Banswara" }
  ];

  productQuality = [
    { id: 1, label: "Banswara White" },
    { id: 2, label: "Banswara Purple" },
    { id: 3, label: "Torronto" },
    { id: 4, label: "Traventine B." },
    { id: 5, label: "Kayampura" },
    { id: 6, label: "Morchana Brown" },
    { id: 7, label: "Marine Black" },
    { id: 8, label: "Kesariya Green" },
  ];

  statusList = [
    { label: 'Available' },
    { label: 'Processing' },
    { label: 'Hold' },
    { label: 'Sold' },
    { label: 'Recieve' },
  ];

  get isAdmin(): boolean { return this.auth.isAdmin(); }
  pendingApprovalCount = 0;

  openApprovals(): void {
    if (this.isAdmin) this.router.navigate(['/approvals']);
  }

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private toastService: ToastService,
    public layout: LayoutService,
    private auth: AuthService,
    private approvalService: ApprovalService,
    private router: Router
  ) {
    this.searchForm = this.fb.group({
      category: [''],
      godonLocations: [''],
      productQuality: [''],
      status: [''],
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

  ngOnInit(): void {
    this.approvalService.pendingCount.subscribe(count => {
      this.pendingApprovalCount = this.isAdmin ? count : 0;
    });

    this.isLoading = true;
    this.productService.fetchAllsProducts().then(products => {
      this.allProducts = products;
      this.filteredProducts = [...products];
      this.computeDashboardStats();
      this.applyDashboardFilter(this.selectedLinkId || 'All');
      this.isLoading = false;
    });
  }

  toggleFilterPanel(): void {
    this.filterPanelVisible = !this.filterPanelVisible;
    document.body.style.overflow = this.filterPanelVisible ? 'hidden' : '';
  }

  closeFilterPanel(): void {
    this.filterPanelVisible = false;
    document.body.style.overflow = '';
  }

  // ---------- click-to-filter ----------
  applyDashboardFilter(key: string, event?: Event): void {
    event?.preventDefault();
    this.selectedLinkId = key;
    this.customFilterActive = false;

    if (key === 'All') {
      this.finalProducts = [...this.allProducts];
    } else if (key === 'Block' || key === 'Slab') {
      this.finalProducts = this.allProducts.filter(p => p.category === key);
    } else {
      this.finalProducts = this.allProducts.filter(p => p.status === key);
    }

    this.closeFilterPanel();
  }

  isActiveFilter(key: string | null): boolean {
    return !!key && this.selectedLinkId === key;
  }

  applyFilter(): void {
    const { godonLocations, productQuality, status, productCode, category, minPrice, maxPrice, minQuantity, maxQuantity } = this.searchForm.value;

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

    this.finalProducts = [...this.filteredProducts];
    this.selectedLinkId = '';
    this.customFilterActive = true;
    this.closeFilterPanel();
  }

  resetForm(): void {
    this.searchForm.reset();
    this.filteredProducts = [...this.allProducts];
    this.applyDashboardFilter('All');
  }

  sortData(): void {
    this.finalProducts.sort((a, b) => this.sortAsc ? a.sellingCost - b.sellingCost : b.sellingCost - a.sellingCost);
    this.sortAsc = !this.sortAsc;
  }

  onProductDeleted(productId: string): void {
    this.allProducts      = this.allProducts.filter(p => p.id !== productId);
    this.filteredProducts = this.filteredProducts.filter(p => p.id !== productId);
    this.finalProducts    = this.finalProducts.filter(p => p.id !== productId);
    this.computeDashboardStats();
  }

  // ---------- runtime dashboard calculations ----------
  private computeDashboardStats(): void {
    const blocks = this.allProducts.filter(p => p.category === 'Block');
    const slabs = this.allProducts.filter(p => p.category === 'Slab');

    this.totalBlocksCount = blocks.length;
    this.totalSlabsCount = slabs.length;
    this.inTransitCount = this.allProducts.filter(p => p.status === 'InTransit').length;

    const soldAll = this.allProducts.filter(p => p.status === 'Sold');
    this.soldThisMonthCount = soldAll.filter(p => this.isThisMonth(p.statusUpdatedAt)).length;

    const totalSlabSqft = slabs.reduce((sum, p) => sum + (p.sqft || 0), 0);
    const totalBlockTons = blocks.reduce((sum, p) => sum + (p.weightTons || 0), 0);
    this.avgRecovery = (totalSlabSqft > 0 && totalBlockTons > 0)
      ? +(totalSlabSqft / totalBlockTons).toFixed(1)
      : null;

    this.sqftByMarble = this.buildSqftByMarble(slabs);
    this.blocksByMarble = this.buildBlocksByMarble(blocks);
    this.totalSlabSqftDisplay = +totalSlabSqft.toFixed(0);
    this.totalSlabLots = new Set(slabs.map(p => p.productCode)).size;
    this.totalBlockLots = new Set(blocks.map(p => p.productCode)).size;

    this.slabStatusBreakdown = this.buildStatusBreakdown(slabs);
    this.blockStatusBreakdown = this.buildStatusBreakdown(blocks);

    this.inTransitItems = this.allProducts.filter(p => p.status === 'InTransit').slice(0, 5);
    this.recentSoldItems = [...soldAll].slice(0, 5);

    this.alerts = this.buildAlerts(slabs);

    this.statCards = [
      { key: 'Block', icon: 'cube', label: 'Total Blocks', value: this.totalBlocksCount, sub: 'All Locations' },
      { key: 'Slab', icon: 'layers', label: 'Total Slabs', value: this.totalSlabsCount, sub: 'All Status' },
      { key: 'InTransit', icon: 'truck', label: 'In Transit', value: this.inTransitCount, sub: 'On The Way' },
      { key: 'Sold', icon: 'bag', label: 'Sold (This Month)', value: this.soldThisMonthCount, sub: 'Orders' },
      { key: null, icon: 'trend', label: 'Avg Recovery', value: this.avgRecovery ?? '—', sub: 'sqft/ton' },
    ];
  }

  private buildSqftByMarble(slabs: Product[]): MarbleSqftRow[] {
    const map = new Map<string, { sqft: number; codes: Set<string> }>();
    for (const p of slabs) {
      const key = p.productQuality || 'Unspecified';
      if (!map.has(key)) map.set(key, { sqft: 0, codes: new Set() });
      const entry = map.get(key)!;
      entry.sqft += p.sqft || 0;
      entry.codes.add(p.productCode);
    }
    return Array.from(map.entries())
      .map(([marble, v]) => ({ marble, totalSqft: +v.sqft.toFixed(0), lots: v.codes.size }))
      .sort((a, b) => b.totalSqft - a.totalSqft);
  }

  private buildBlocksByMarble(blocks: Product[]): MarbleBlockRow[] {
    const map = new Map<string, { count: number; codes: Set<string> }>();
    for (const p of blocks) {
      const key = p.productQuality || 'Unspecified';
      if (!map.has(key)) map.set(key, { count: 0, codes: new Set() });
      const entry = map.get(key)!;
      entry.count += 1;
      entry.codes.add(p.productCode);
    }
    return Array.from(map.entries())
      .map(([marble, v]) => ({ marble, totalBlocks: v.count, lots: v.codes.size }))
      .sort((a, b) => b.totalBlocks - a.totalBlocks);
  }

  private buildStatusBreakdown(items: Product[]): StatusBreakdownItem[] {
    const total = items.length;
    const counts = new Map<string, number>();
    for (const p of items) {
      counts.set(p.status, (counts.get(p.status) || 0) + 1);
    }
    return Object.keys(STATUS_META)
      .filter(key => counts.has(key))
      .map(key => {
        const count = counts.get(key)!;
        return {
          key,
          label: STATUS_META[key].label,
          color: STATUS_META[key].color,
          count,
          percent: total > 0 ? Math.round((count / total) * 100) : 0
        };
      });
  }

  private buildAlerts(slabs: Product[]): AlertItem[] {
    const alerts: AlertItem[] = [];

    const lowStockSlabs = slabs.filter(p => p.status === 'Available' && (p.quantity ?? 0) <= 2);
    if (lowStockSlabs.length) {
      alerts.push({ type: 'low', message: `Low stock: ${lowStockSlabs.length} slab lot(s) at 2 or fewer pieces`, filterKey: 'Slab' });
    }

    const onHold = this.allProducts.filter(p => p.status === 'Hold');
    if (onHold.length) {
      alerts.push({ type: 'warning', message: `${onHold.length} item(s) on Hold awaiting decision`, filterKey: 'Hold' });
    }

    const inTransit = this.allProducts.filter(p => p.status === 'InTransit');
    if (inTransit.length) {
      alerts.push({ type: 'info', message: `${inTransit.length} shipment(s) currently in transit`, filterKey: 'InTransit' });
    }

    return alerts;
  }

  private isThisMonth(dateLike: any): boolean {
    if (!dateLike) return false;
    const d = new Date(dateLike);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }

  getDonutGradient(breakdown: StatusBreakdownItem[]): string {
    if (!breakdown.length) return 'var(--border)';
    let cumulative = 0;
    const stops: string[] = [];
    for (const b of breakdown) {
      const start = cumulative;
      cumulative += b.percent;
      stops.push(`${b.color} ${start}% ${cumulative}%`);
    }
    if (cumulative < 100) stops.push(`var(--border) ${cumulative}% 100%`);
    return `conic-gradient(${stops.join(', ')})`;
  }

  // ---------- status update popup ----------
  openPopup(product: Product): void {
    this.product = product;
    this.isPopupOpen = true;
    document.body.style.overflow = 'hidden';
    this.popupForm = this.fb.group({ status: [''], remark: [''] });
  }

  closePopup(): void {
    this.isPopupOpen = false;
    document.body.style.overflow = '';
    this.ngOnInit();
  }

  async handleOk(): Promise<void> {
    const status = this.popupForm.value.status;
    const remark = this.popupForm.value.remark;

    let inTransitObj: any = null;

    if (status === 'Recieve') {
      try {
        inTransitObj = await firstValueFrom(this.productService.getIntransitApiCall(this.product));
      } catch (error) {
        console.error('Error in getIntransitApiCall:', error);
        return;
      }
    }

    const existingRemark = this.product.description ? this.product.description + ' | ' : '';
    const updatedProduct = {
      ...this.product,
      status: inTransitObj?.toLocation ? 'Available' : status,
      description: existingRemark + remark,
      godownLocation: inTransitObj?.toLocation ?? this.product.godownLocation,
      statusUpdatedAt: new Date()
    };

    this.productService.postApiCall(updatedProduct).subscribe({
      next: () => {
        this.toastService.showSuccess("Status updated successfully.");
        this.closePopup();
      },
      error: (err) => {
        console.error('postApiCall error:', err);
      }
    });
  }
}

import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartData, ChartType } from 'chart.js';
import { NgxEchartsModule } from 'ngx-echarts';
import { Product } from '../model/product';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  imports: [NgxEchartsModule,CommonModule],
  templateUrl: './inventory-dashboard.component.html',
  styleUrl: './inventory-dashboard.component.css'
})
export class InventoryDashboardComponent {
  isMobile: boolean = false;
  allInventory: Product[] = [];

  statusLabels = ['Available', 'Hold', 'Sold'];
  statusCounts: number[] = [];

  godownLabels: string[] = [];
  godownCounts: number[] = [];

  statusChartOptions: any;
  godownChartOptions: any;

  productQualityGroupedChartOptions: any;
  productQualityLabels: string[] = [];
  productQualityStatusMap: { [quality: string]: { [status: string]: number } } = {};
 


  constructor(private productService: ProductService) {
    this.isMobile = window.innerWidth <= 768;
  }

  ngOnInit() {
    this.productService.fetchAllsProducts().then(products => {
      this.allInventory = products;
      this.prepareStatusData();
      this.prepareGodownData();
      this.updateCharts();
      this.prepareProductQualityGroupedData();
    });
  }

  prepareStatusData() {
    const countMap = new Map<string, number>();
    this.statusLabels.forEach(status => countMap.set(status, 0));
    this.allInventory.forEach(item => {
      countMap.set(item.status, (countMap.get(item.status) || 0) + 1);
    });
    this.statusCounts = this.statusLabels.map(status => countMap.get(status) || 0);
  }

  prepareGodownData() {
    const locationMap = new Map<string, number>();
    this.allInventory.forEach(item => {
      locationMap.set(item.godownLocation, (locationMap.get(item.godownLocation) || 0) + 1);
    });
    this.godownLabels = Array.from(locationMap.keys());
    this.godownCounts = Array.from(locationMap.values());
  }

  updateCharts() {
    const statusColors: Record<'Available' | 'Hold' | 'Sold', string> = {
        Available: '#34D399', 
        Hold: '#fafa4b',      
        Sold: '#d4d2d2' 
    };
    this.statusChartOptions = {
      tooltip: { trigger: 'item' },
      legend: { top: '5%', left: 'center' },
      series: [
        {
          name: 'Status',
          type: 'pie',
          radius: '50%',
          data: this.statusLabels.map((label, i) => ({
            value: this.statusCounts[i],
            name: label,
            itemStyle: {
              color: statusColors[label as keyof typeof statusColors] || '#888' // Default gray if not matched
            }
          }))
        }
      ]
    };

    this.godownChartOptions = {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: this.godownLabels
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: 'Inventory',
          type: 'bar',
          barWidth: 30,
          data: this.godownCounts,
          itemStyle: {
            color: '#319795'  // mint green color or pick any hex you like
          }
        }
      ]
    };
  }
  prepareProductQualityGroupedData() {
    // Reset map
    this.productQualityStatusMap = {};

    // Aggregate counts by quality and status
    this.allInventory.forEach(item => {
      const quality = item.productQuality || 'Unknown';
      const status = item.status || 'Unknown';

      if (!this.productQualityStatusMap[quality]) {
        this.productQualityStatusMap[quality] = { Available: 0, Hold: 0, Sold: 0 };
      }
      this.productQualityStatusMap[quality][status] = (this.productQualityStatusMap[quality][status] || 0) + 1;
    });

    // Extract labels and datasets
    this.productQualityLabels = Object.keys(this.productQualityStatusMap);
    const availableData = this.productQualityLabels.map(q => this.productQualityStatusMap[q]['Available'] || 0);
    const holdData = this.productQualityLabels.map(q => this.productQualityStatusMap[q]['Hold'] || 0);
    const soldData = this.productQualityLabels.map(q => this.productQualityStatusMap[q]['Sold'] || 0);

    // Setup ECharts options
    this.productQualityGroupedChartOptions = {
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['Available', 'Hold', 'Sold']
      },
      grid: {
        left: 10,
        right: 10,
        bottom: 70, 
        top: 40,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: this.productQualityLabels,
        axisLabel: {
          interval: 0, 
          rotate: this.isMobile ? 45 : 0, 
          fontSize: this.isMobile ? 10 : 12,
          overflow: 'truncate'
        }
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: 'Available',
          type: 'bar',
          data: availableData,
          itemStyle: {
            color: '#4CAF50'
          },
          barWidth: this.isMobile ? 5 : 15
        },
        {
          name: 'Hold',
          type: 'bar',
          data: holdData,
          itemStyle: {
            color: '#FFC107'
          },
          barWidth: this.isMobile ? 5 : 15
        },
        {
          name: 'Sold',
          type: 'bar',
          data: soldData,
          itemStyle: {
            color: '#F44336'
          },
          barWidth: this.isMobile ? 5 : 15
        }
      ]
    };
  }
}

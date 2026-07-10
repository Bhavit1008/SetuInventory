import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsModule } from 'ngx-echarts';
import { Router } from '@angular/router';
import { Architect, ARCHITECT_STAGES } from '../../model/architect';
import { ArchitectBusinessRecord } from '../../model/architect-business';
import { ArchitectService } from '../../services/architect.service';

@Component({
  selector: 'app-architect-reports',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule],
  templateUrl: './architect-reports.component.html',
  styleUrl: './architect-reports.component.css'
})
export class ArchitectReportsComponent implements OnInit {
  isLoading = true;
  architects: Architect[] = [];
  businessRecords: ArchitectBusinessRecord[] = [];

  statusChartOptions: any;
  cityChartOptions: any;
  businessChartOptions: any;

  private statusColors: Record<string, string> = {
    'Research': '#9AA0AC',
    'Not Contacted': '#FB7185',
    'Contacted': '#60A5FA',
    'Visited': '#FBBF24',
    'Onboarded': '#34D399'
  };

  constructor(private architectService: ArchitectService, private router: Router) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.architectService.getAll().subscribe(list => {
      this.architects = list;
      this.buildStatusChart();
      this.buildCityChart();
      this.isLoading = false;
    });
    this.architectService.getAllBusinessRecords().subscribe(list => {
      this.businessRecords = list;
      this.buildBusinessChart();
    });
  }

  get totalArchitects(): number { return this.architects.length; }
  get onboardedCount(): number { return this.architects.filter(a => a.status === 'Onboarded').length; }
  get conversionRate(): string {
    return this.totalArchitects ? ((this.onboardedCount / this.totalArchitects) * 100).toFixed(0) + '%' : '0%';
  }
  get totalBusinessValue(): number {
    return this.businessRecords.reduce((s, b) => s + (b.value || 0), 0);
  }

  private buildStatusChart(): void {
    const counts = ARCHITECT_STAGES.map(stage => ({
      name: stage,
      value: this.architects.filter(a => (a.status || 'Research') === stage).length,
      itemStyle: { color: this.statusColors[stage] }
    }));

    this.statusChartOptions = {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      series: [{
        name: 'Lead Status',
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: true,
        label: { show: false },
        data: counts
      }]
    };
  }

  private buildCityChart(): void {
    const map = new Map<string, number>();
    this.architects.forEach(a => {
      if (!a.city) return;
      map.set(a.city, (map.get(a.city) || 0) + 1);
    });
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    this.cityChartOptions = {
      tooltip: { trigger: 'axis' },
      grid: { left: 10, right: 10, bottom: 10, top: 20, containLabel: true },
      xAxis: { type: 'category', data: sorted.map(s => s[0]), axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value' },
      series: [{
        name: 'Architects',
        type: 'bar',
        data: sorted.map(s => s[1]),
        barWidth: 26,
        itemStyle: { color: '#FF6A3D', borderRadius: [6, 6, 0, 0] }
      }]
    };
  }

  private buildBusinessChart(): void {
    const statuses = ['Under Discussion', 'Quotation Sent', 'Won', 'Lost'];
    const colors: Record<string, string> = {
      'Under Discussion': '#60A5FA', 'Quotation Sent': '#FBBF24', 'Won': '#34D399', 'Lost': '#FB7185'
    };
    const counts = statuses.map(s => ({
      name: s,
      value: this.businessRecords.filter(b => b.status === s).length,
      itemStyle: { color: colors[s] }
    }));

    this.businessChartOptions = {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      series: [{
        name: 'Business Pipeline',
        type: 'pie',
        radius: '65%',
        data: counts
      }]
    };
  }

  goBack(): void { this.router.navigate(['/architects/dashboard']); }
}

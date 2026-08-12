import { Routes } from '@angular/router';
import { SlabsManagementComponent } from './slabs-management/slabs-management.component';
import { BlocksManagementComponent } from './blocks-management/blocks-management.component';
import { SearchPageComponent } from './search-page/search-page.component';
import { LoginManagementComponent } from './login-management/login-management.component';
import { AuthGuard } from './auth.guard';
import { AdminGuard } from './admin.guard';
import { ViewProductComponent } from './view-product/view-product.component';
import { InventoryDashboardComponent } from './inventory-dashboard/inventory-dashboard.component';
import { AddIntransitComponent } from './add-intransit/add-intransit.component';
import { ApprovalsComponent } from './approvals/approvals.component';
import { AddCatalogueComponent } from './add-catalogue/add-catalogue.component';
import { InventoryListComponent } from './inventory-list/inventory-list.component';
import { ViewMarbleComponent } from './view-marble/view-marble.component';
import { AddEmployeeComponent } from './add-employee/add-employee.component';
import { AuditLogComponent } from './audit-log/audit-log.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'slab',         component: SlabsManagementComponent,     canActivate: [AuthGuard] },
  { path: 'blocks',       component: BlocksManagementComponent,     canActivate: [AuthGuard] },
  { path: 'search',       component: SearchPageComponent,           canActivate: [AuthGuard] },
  { path: 'view-product', component: ViewProductComponent,          canActivate: [AuthGuard] },
  { path: 'dashboard',    component: InventoryDashboardComponent,   canActivate: [AuthGuard] },
  { path: 'intransit',    component: AddIntransitComponent,         canActivate: [AuthGuard] },
  { path: 'approvals',    component: ApprovalsComponent,            canActivate: [AuthGuard, AdminGuard] },
  { path: 'add-employee', component: AddEmployeeComponent,          canActivate: [AuthGuard, AdminGuard] },
  { path: 'audit-log',    component: AuditLogComponent,             canActivate: [AuthGuard, AdminGuard] },
  { path: 'catalogue',           component: AddCatalogueComponent, canActivate: [AuthGuard] },
  { path: 'catalogue/edit/:id',  component: AddCatalogueComponent, canActivate: [AuthGuard] },
  { path: 'view-marble/:id',     component: ViewMarbleComponent,   canActivate: [AuthGuard] },
  { path: 'block-inventory',   component: InventoryListComponent, canActivate: [AuthGuard], data: { category: 'Block', title: 'Block Inventory' } },
  { path: 'slab-inventory',    component: InventoryListComponent, canActivate: [AuthGuard], data: { category: 'Slab',  title: 'Slab Inventory' } },
  { path: 'process-inventory', component: InventoryListComponent, canActivate: [AuthGuard], data: { statusFilter: 'Process', title: 'Process Inventory' } },
  { path: 'sold-inventory',    component: InventoryListComponent, canActivate: [AuthGuard], data: { statusFilter: 'Sold', title: 'Sold Inventory' } },

  // ── Architect & Interior Directory ──────────────────────────────────────
  { path: 'architects/dashboard', canActivate: [AuthGuard],
    loadComponent: () => import('./architect/architect-dashboard/architect-dashboard.component').then(m => m.ArchitectDashboardComponent) },
  { path: 'architects/directory', canActivate: [AuthGuard],
    loadComponent: () => import('./architect/architect-directory/architect-directory.component').then(m => m.ArchitectDirectoryComponent) },
  { path: 'architects/new', canActivate: [AuthGuard],
    loadComponent: () => import('./architect/architect-form/architect-form.component').then(m => m.ArchitectFormComponent) },
  { path: 'architects/edit/:id', canActivate: [AuthGuard],
    loadComponent: () => import('./architect/architect-form/architect-form.component').then(m => m.ArchitectFormComponent) },
  { path: 'architects/profile/:id', canActivate: [AuthGuard],
    loadComponent: () => import('./architect/architect-profile/architect-profile.component').then(m => m.ArchitectProfileComponent) },
  { path: 'architects/followups', canActivate: [AuthGuard],
    loadComponent: () => import('./architect/architect-followups/architect-followups.component').then(m => m.ArchitectFollowupsComponent) },
  { path: 'architects/visits', canActivate: [AuthGuard],
    loadComponent: () => import('./architect/architect-visits/architect-visits.component').then(m => m.ArchitectVisitsComponent) },
  { path: 'architects/business', canActivate: [AuthGuard],
    loadComponent: () => import('./architect/architect-business/architect-business.component').then(m => m.ArchitectBusinessComponent) },
  { path: 'architects/documents', canActivate: [AuthGuard],
    loadComponent: () => import('./architect/architect-documents/architect-documents.component').then(m => m.ArchitectDocumentsComponent) },
  { path: 'architects/reports', canActivate: [AuthGuard],
    loadComponent: () => import('./architect/architect-reports/architect-reports.component').then(m => m.ArchitectReportsComponent) },

  { path: 'login',        component: LoginManagementComponent },
  { path: '**', redirectTo: 'login' }
];

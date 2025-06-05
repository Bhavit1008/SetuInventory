import { Routes } from '@angular/router';
import { SlabsManagementComponent } from './slabs-management/slabs-management.component';
import { BlocksManagementComponent } from './blocks-management/blocks-management.component';
import { SearchPageComponent } from './search-page/search-page.component';
import { LoginManagementComponent } from './login-management/login-management.component';
import { AuthGuard } from './auth.guard';
import { ViewProductComponent } from './view-product/view-product.component';

export const routes: Routes = [
     { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'slab', component: SlabsManagementComponent ,canActivate: [AuthGuard] },
    { path: 'blocks', component: BlocksManagementComponent ,canActivate: [AuthGuard]  },
    { path: 'search', component: SearchPageComponent ,canActivate: [AuthGuard]  },
    { path: 'view-product', component: ViewProductComponent ,canActivate: [AuthGuard]  },
    { path: 'login', component: LoginManagementComponent},
    { path: '**', redirectTo: 'login' }
];

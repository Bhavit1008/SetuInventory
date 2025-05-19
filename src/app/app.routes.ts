import { Routes } from '@angular/router';
import { SlabsManagementComponent } from './slabs-management/slabs-management.component';
import { BlocksManagementComponent } from './blocks-management/blocks-management.component';
import { SearchPageComponent } from './search-page/search-page.component';

export const routes: Routes = [
    { path: '', component: SlabsManagementComponent },
    { path: 'blocks', component: BlocksManagementComponent },
    { path: 'search', component: SearchPageComponent }
];

import { Routes } from '@angular/router';
import { SlabsManagementComponent } from './slabs-management/slabs-management.component';
import { BlocksManagementComponent } from './blocks-management/blocks-management.component';

export const routes: Routes = [
    { path: '', component: SlabsManagementComponent },
    { path: 'blocks', component: BlocksManagementComponent }
];

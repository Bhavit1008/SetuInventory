import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SlabsManagementComponent } from './slabs-management/slabs-management.component';


const routes: Routes = [
  { path: '', component: SlabsManagementComponent }, // Default route
];

@NgModule({
  imports: [RouterModule.forRoot(routes)], 
  exports: [RouterModule]
})
export class AppRoutingModule { }

import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule ,Validators } from '@angular/forms';
import { Product } from '../model/product';
import { ProductService } from '../services/product.service';
import { Platform } from '@angular/cdk/platform';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';
import { Intransit } from '../model/intransit';


@Component({
  selector: 'app-add-intransit',
  standalone: true,
  imports: [CommonModule, FormsModule ,ReactiveFormsModule ],
  templateUrl: './add-intransit.component.html',
  styleUrl: './add-intransit.component.css'
})
export class AddIntransitComponent {

    public inTransitFormGroup!: FormGroup;


    product: Product;
    
    constructor(private router: Router, private productService: ProductService,
      private toastService: ToastService
) {
      const nav = this.router.getCurrentNavigation();
      this.product = nav?.extras?.state?.['product'];
    }
    
    goDownLocations = [
    { id: 1, label: "Kishangarh" },
    { id: 2, label: "Moradabad" },
    { id: 3, label: "Banswara"}
  ]


    ngOnInit(){
      this.buildForm();
      console.log('product :: ',this.product);
    }

     

    buildForm() {
      this.inTransitFormGroup = new FormGroup({
        id: new FormControl(),
        productCode: new FormControl(),
        fromLocation: new FormControl(),
        toLocation: new FormControl(),
        productWeight: new FormControl(),
        challanNumber: new FormControl(),
        driverContact: new FormControl(),
        dateOfLoading: new FormControl(),
        description: new FormControl()
      });
      }


    saveInTransitDetails(inTransitForm: any){
      var transitObj = this.prepareTransitObj(inTransitForm)
      this.updateProductStatus(transitObj);
    }

    updateProductStatus(inTransitObj: Intransit){
      this.product.status = 'InTransit'
      this.productService.postApiCall(this.product).subscribe({
      next: () => {
        this.saveIntransit(inTransitObj);
        this.toastService.showSuccess('updated product status');
        console.log('updated product status')
      },
      error: () => {
        this.toastService.showError('Failed to update product details.');
      }
    });
    }

  private saveIntransit(inTransitForm: any): void {
    this.productService.postIntransitApiCall(inTransitForm).subscribe({
      next: () => {
        this.toastService.showSuccess('Intransit updated');
        console.log('Intransit updated')
      },
      error: () => {
        this.toastService.showError('Failed to save intransit details.');
      }
    });
  }

    

    prepareTransitObj(inTransitFormValues: any){
        var transit: Intransit = {
          id: '',
          productId: '',
          productCode: '',
          toLocation: '',
          fromLocation: '',
          productWeight: '',
          challanNumber: '',
          driverContact: '',
          dateOfLoading: '',
          dateCreated: '',
          description: ''
        };
        const currentDate = new Date();
        transit.id = this.product.id;
        transit.productCode = this.product.productCode;
        transit.productId = this.product.id;
        transit.challanNumber = inTransitFormValues.value.challanNumber;
        transit.driverContact = inTransitFormValues.value.driverContact;
        transit.dateOfLoading = inTransitFormValues.value.dateOfLoading;
        transit.dateCreated = currentDate.toDateString();
        transit.description = inTransitFormValues.value.description;
        transit.toLocation = inTransitFormValues.value.toLocation;
        transit.fromLocation = inTransitFormValues.value.fromLocation;
        transit.productWeight = inTransitFormValues.value.productWeight;
        console.log('prepared response object :: ', transit);
        return transit;
    }
    
  
}

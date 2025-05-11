import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-blocks-management',
  standalone: true,
  imports: [CommonModule, FormsModule ,ReactiveFormsModule ],
  templateUrl: './blocks-management.component.html',
  styleUrl: './blocks-management.component.css'
})
export class BlocksManagementComponent {

    public blockFormGroup!: FormGroup;
    blockObject: any;

    ngOnInit(){
      this.buildForm();
    }

    buildForm(){
      this.blockFormGroup = new FormGroup({
        productCode : new FormControl(''),
        productLength : new FormControl(''),
        productWidth : new FormControl(''),
        productHeight : new FormControl(''),
        productWeight : new FormControl(''),
        remarks : new FormControl('')
      })
    }

    saveBlockDetails(block: any){
      if(block!=null && block!=undefined){
        console.log('block details :: ', this.prepareResponseObject(block));
      }
    }

    prepareResponseObject(block: any){
      this.blockObject = {
        productCode : block.value.productCode,
        productLength : block.value.productLength,
        productWidth : block.value.productWidth,
        productHeight : block.value.productHeight,
        productWeight : block.value.productWeight,
        remarks : block.value.remarks
      }
      return this.blockObject;
    }
  
}

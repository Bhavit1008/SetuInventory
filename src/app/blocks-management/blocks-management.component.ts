import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Block } from '../model/block';

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

    goDownLocations = [
    { id: 1, label: "Kishangarh" },
    { id: 2, label: "Moradabad" },
    { id: 3, label: "Banswara"}
  ]

  productQuality = [
    { id: 1, label: "Banswara White"},
    { id: 2, label: "Banswara Purple"},
    { id: 3, label: "Torronto"},
    { id: 4, label: "Traventine B."},
    { id: 5, label: "Kayampura"},
    { id: 6, label: "Morchana Brown"},
    { id: 7, label: "Marine Black"},
    { id: 8, label: "Kesariya Green"},
  ]


  finishesRange = [
    { id: 1, label: "Raw" },
    { id: 2, label: "Mirror Finish" },
    { id: 3, label: "Honed Finish"},
    { id: 4, label: "Hydro Finish"},
    { id: 5, label: "Epoxy Process"},
    { id: 6, label: "Filling Process"},
    { id: 7, label: "Mirror Epoxy Finish"},
    { id: 8, label: "Sand Blast"},
    { id: 9, label: "Fire Flame"},
    { id: 10, label: "Leather Finish"},
]

    ngOnInit(){
      const state = history.state as { formData?: Block };
      this.buildForm();
      if (state?.formData) {
        this.blockFormGroup = new FormGroup({
          productCode : new FormControl(state.formData.productCode),
          productLength : new FormControl(state.formData.productLength),
          productWidth : new FormControl(state.formData.productWeight),
          productHeight : new FormControl(state.formData.productHeight),
          productWeight : new FormControl(state.formData.productWeight),
          remarks :new FormControl(state.formData.remarks),
        })
      }
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

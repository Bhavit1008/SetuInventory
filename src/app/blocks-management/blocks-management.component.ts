import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Block } from '../model/block';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-blocks-management',
  standalone: true,
  imports: [CommonModule, FormsModule ,ReactiveFormsModule , HttpClientModule],
  templateUrl: './blocks-management.component.html',
  styleUrl: './blocks-management.component.css'
})
export class BlocksManagementComponent {

    constructor(private httpClient: HttpClient){}

    public blockFormGroup!: FormGroup;
    blockObject: any;
    isLoading = false;
    isResultDialog = false;

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
          godownLocation : new FormControl(state.formData.godownLocation),
          productFinished : new FormControl(state.formData.productFinished),
          productLength : new FormControl(state.formData.productLength),
          productWidth : new FormControl(state.formData.productWeight),
          productHeight : new FormControl(state.formData.productHeight),
          productWeight : new FormControl(state.formData.productWeight),
          exFactoryCost : new FormControl(state.formData.exFactoryCost),
          royaltyCost : new FormControl(state.formData.royaltyCost),
          freightCost : new FormControl(state.formData.freightCost),
          inHouseCost : new FormControl(state.formData.inHouseCost),
          sellingCost : new FormControl(state.formData.sellingCost),
          remarks :new FormControl(state.formData.remarks),
        })
      }
    }

    buildForm(){
      this.blockFormGroup = new FormGroup({
        productCode : new FormControl(''),
        godownLocation : new FormControl(''),
        productFinished : new FormControl(''),
        productLength : new FormControl(''),
        productWidth : new FormControl(''),
        productHeight : new FormControl(''),
        productWeight : new FormControl(''),
        exFactoryCost : new FormControl(''),
        royaltyCost : new FormControl(''),
        freightCost : new FormControl(''),
        inHouseCost : new FormControl(''),
        sellingCost : new FormControl(''),
        remarks : new FormControl('')
      })
    }

    saveBlockDetails(block: any){
      if(block!=null && block!=undefined){
        console.log('block details :: ', this.prepareResponseObject(block));
        this.postApiCall(this.prepareResponseObject(block)).subscribe(data => {
    let res = JSON.parse(JSON.stringify(data))
    console.log('data',res)
    this.isLoading = false;
    this.isResultDialog = true;
  })
      }
    }

    prepareResponseObject(block: any){
      this.blockObject = {
        productCode : block.value.productCode,
        godownLocation : block.value.godownLocation,
        productFinished : block.value.productFinished,
        productLength : block.value.productLength,
        productWidth : block.value.productWidth,
        productHeight : block.value.productHeight,
        productWeight : block.value.productWeight,
        exFactoryCost : block.value.exFactoryCost,
        royaltyCost : block.value.royaltyCost,
        freightCost : block.value.freightCost,
        inHouseCost : block.value.inHouseCost,
        sellingCost : block.value.sellingCost,
        remarks : block.value.remarks
      }
      return this.blockObject;
    }

    postApiCall(data: any){
      const headers = { 'content-type': 'application/json'}  
      const body=JSON.stringify(data);
      console.log(body)
      this.isLoading = true;
     var url = 'https://setu-crm.onrender.com/addProduct'
     return this.httpClient.post(url, body,{'headers':headers})
    }
  
}

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProductService } from '../services/product.service';

interface Slab {
  id: number;
  length: string;
  width: string;
  lessLength: string;
  lessWidth: string;
  totalArea: string;
  editable: boolean;
  remark:string
}

@Component({
  selector: 'app-slabs-management',
  standalone: true,
  imports: [CommonModule, FormsModule ,ReactiveFormsModule ],
  templateUrl: './slabs-management.component.html',
  styleUrl: './slabs-management.component.css'
})


export class SlabsManagementComponent {
  public stockFormGroup!: FormGroup;

  goDownLocations = [
    { id: 1, label: "Kishangarh" },
    { id: 2, label: "Moradabad" },
    { id: 3, label: "Banswara"}
]

  thicknessRange = [
    { id: 1, label: "10 mm" },
    { id: 2, label: "15 mm" },
    { id: 3, label: "20 mm"},
    { id: 4, label: "25 mm"},
    { id: 5, label: "30 mm"}
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

slabPieces :Slab[] = [];

ngOnInit(){
  this.buildForm();
}

constructor(private fb: FormBuilder ,  private productService: ProductService){

}

buildForm(){
  this.stockFormGroup = new FormGroup({
    productCode: new FormControl(''),
    godownLocation: new FormControl(''),
    productQuality: new FormControl(''),
    productFinished:new FormControl(''),
    productLength: new FormControl(''),
    productWidth:new FormControl(''),
    productPieces: new FormControl(''),
    productThickness:new FormControl(''),
    quantity:new FormControl(''),
    exFactoryCost:new FormControl(''),
    miscellaneousCost:new FormControl(''),
    freightCost:new FormControl(''),
    inHouseCost: new FormControl(''),
    sellingCost: new FormControl(''),
    status:new FormControl(''),
    remark:new FormControl(''),
  })
}

slabPieceForm: FormGroup[] = [];

editUser(index: number) {
  this.slabPieceForm[index].patchValue({ editable: true });
}

saveUser(index: number) {
  this.slabPieces[index] = this.slabPieceForm[index].value;
  this.calculateSlabArea(index)
   this.slabPieces[index] = this.slabPieceForm[index].value;
}

cancelEdit(index: number) {
  this.slabPieceForm[index].patchValue({ ...this.slabPieces[index], editable: false });
}

deleteUser(index: number) {
  this.slabPieces.splice(index, 1);
  this.slabPieceForm.splice(index, 1);
}

addNewRow() {
  let id =1;
  if (this.slabPieces.length > 0) {
    const lastAddedSlabPieces = this.slabPieces[this.slabPieceForm.length - 1];
    id=lastAddedSlabPieces.id+1;
  }
  const newUser: Slab = { id: id, length: '', width: '', lessLength: '', lessWidth: '', totalArea: 'To be calculated', editable: true , remark:''};
  this.slabPieces.push(newUser);
  this.slabPieceForm.push(this.fb.group({
    id: new FormControl(newUser.id),
    length: new FormControl(newUser.length),
    width: new FormControl(newUser.width),
    lessLength: new FormControl(newUser.lessLength),
    lessWidth: new FormControl(newUser.lessWidth),
    totalArea: new FormControl(newUser.totalArea),
    editable: new FormControl(newUser.editable),
    remark:new FormControl(newUser.remark)
  }));
}


  calculateSlabArea(index: number){
    var totalSlabLength = parseFloat(this.slabPieceForm[index].value.length);
    var totalSlabWidth = parseFloat(this.slabPieceForm[index].value.width);
    var lessLength = parseFloat(this.slabPieceForm[index].value.lessLength);
    var lessWidth = parseFloat(this.slabPieceForm[index].value.lessWidth);
    var totalSlabSize = (totalSlabLength * totalSlabWidth) - (lessLength * lessWidth);
    const group = this.slabPieceForm.at(index) as FormGroup;
    group.patchValue({ 
      totalArea: totalSlabSize,
      editable: false 
    });
    console.log('entered slab size :: ', totalSlabSize);
  }


  getValues(){
    const slabDetails = this.slabPieceForm.map(group=>group.value)
    console.log('my form values :: ', slabDetails);
  }

  saveSlabDetails(slab: any){
    if(slab!=null && slab!=undefined){
        // this.isLoading = true;
        this.productService.postApiCall(this.prepareResponseObject(slab)).subscribe(() => {
          // this.isLoading = false;
          // this.isResultDialog = true;
        })
    }
  }
  prepareResponseObject(slab: any){
     const slabObject = {
        category : "Slab",
        productCode : slab.value.productCode,
        godownLocation : slab.value.godownLocation,
        productQuality: slab.value.productQuality,
        productFinished : slab.value.productFinished,
        productLength : parseFloat(slab.value.productLength),
        productWidth : parseFloat(slab.value.productWidth),
        numberOfPeice: parseInt(slab.value.productPieces),
        productThickness : parseFloat(slab.value.productThickness),
        quantity: parseInt(slab.value.quantity),
        exFactoryCost : parseFloat(slab.value.exFactoryCost),
        miscellaneousCost: parseFloat(slab.value.miscellaneousCost),
        freightCost : parseFloat(slab.value.freightCost),
        inHouseCost : parseFloat(slab.value.inHouseCost),
        sellingCost : parseFloat(slab.value.sellingCost),
        status: slab.value.status,
        description : slab.value.remark,
        pieces : this.slabPieces
      }
      return slabObject;
    }
}

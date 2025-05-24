import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

interface Slab {
  id: number;
  length: string;
  width: string;
  lessLength: string;
  lessWidth: string;
  tSize: string;
  editable: boolean;
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

users = [
  { id: 0, length: '', width: '', lessLength: '', lessWidth: '', tSize: '',editable: true },
];

ngOnInit(){
  this.buildForm();
}

constructor(private fb: FormBuilder){

}

initializeForms() {
  this.userForms = this.users.map(user =>
    this.fb.group({
      id: new FormControl(user.id),
      length: new FormControl(user.length),
      width: new FormControl(user.width),
      lessLength: new FormControl(user.lessLength),
      lessWidth: new FormControl(user.lessWidth),
      tSize: new FormControl(user.tSize),
      editable: new FormControl(user.editable)
    })
  );
}

buildForm(){
  this.stockFormGroup = new FormGroup({
    godownLocation: new FormControl(''),
    productQuality: new FormControl(''),
    productCode: new FormControl(''),
    productPieces: new FormControl(''),
    productLength: new FormControl(''),
    productWidth: new FormControl(''),
    productSize: new FormControl(''),
    inHouseCost: new FormControl(''),
    freight: new FormControl(''),
    misCost: new FormControl(''),
    sellingCost: new FormControl(''),
    id: new FormControl(''),
    lessLength: new FormControl(''),
    lessWidth: new FormControl(''),
    tSize: new FormControl(''),
    editable: new FormControl('')
  })
}

userForms: FormGroup[] = [];

tempUsers: { [id: number]: Slab } = {}; // Store temporary edits by user ID

editUser(index: number) {
  this.userForms[index].patchValue({ editable: true });
}

saveUser(index: number) {
  this.users[index] = this.userForms[index].value;
  this.calculateSlabArea(index)
  this.users[index].editable = false;
  //this.initializeForms(); // Reset forms to sync
}

cancelEdit(index: number) {
  this.userForms[index].patchValue({ ...this.users[index], editable: false });
}

deleteUser(index: number) {
  this.users.splice(index, 1);
  this.userForms.splice(index, 1);
}

addNewRow() {
  const newUser: Slab = { id: this.userForms.length + 1, length: '', width: '', lessLength: '', lessWidth: '', tSize: '', editable: true };
  this.users.push(newUser);
  this.userForms.push(this.fb.group({
    id: new FormControl(newUser.id),
    length: new FormControl(newUser.length),
    width: new FormControl(newUser.width),
    lessLength: new FormControl(newUser.lessLength),
    lessWidth: new FormControl(newUser.lessWidth),
    tSize: new FormControl(newUser.tSize),
    editable: new FormControl(newUser.editable)
  }));
}


  calculateSlabArea(index: number){
    var totalSlabLength = parseFloat(this.userForms[index].value.length);
    var totalSlabWidth = parseFloat(this.userForms[index].value.width);
    var lessLength = parseFloat(this.userForms[index].value.lessLength);
    var lessWidth = parseFloat(this.userForms[index].value.lessWidth);
    var totalSlabSize = (totalSlabLength * totalSlabWidth) - (lessLength * lessWidth);
    const group = this.userForms.at(index) as FormGroup;
    group.patchValue({ 
      tSize: totalSlabSize,
      editable: false 
    });
    console.log('entered slab size :: ', totalSlabSize);
  }


getValues(){
  const slabDetails = this.userForms.map(group=>group.value)
  console.log('my form values :: ', slabDetails);
}
}

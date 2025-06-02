import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {SecurityService} from '../services/security.service';
import { ToastService } from '../services/toast.service';
@Component({
  selector: 'app-login-management',
  standalone: true,
  imports: [CommonModule, FormsModule ,ReactiveFormsModule ],
  templateUrl: './login-management.component.html',
  styleUrl: './login-management.component.css'
})
export class LoginManagementComponent {

  public loginFormGroup!: FormGroup;
  loginUser : any;
  matchedUser : any;
  showAlert = false;
  closing = false;
  loginError: string | null = null;
  isMobile:any;

  users:any = [
    {
      loginId: "setu",
      password: "password",
      role: "admin"
    },
    {
      loginId: "bhavit",
      password: "password",
      role: "admin"
    },
    {
      loginId: "meet",
      password: "password",
      role: "admin"
    }
  ]

  constructor(private router: Router, private sessionService: SecurityService,private toastService: ToastService) { 
     this.isMobile = window.innerWidth <= 768;
  }


  ngOnInit(){
    this.buildForm();
  }
  

  buildForm(){
    this.loginFormGroup = new FormGroup({
      loginId : new FormControl(''),
      password : new FormControl('')
    })
  }
  async saveLoginDetails(user: any){
    this.prepareResponseObject(user);
    if(user!=null && user!=undefined){
      if(this.loginUser.loginId==="" || this.loginUser.password === ""){
        this.toastService.showError('Please fill in both fields.');
      }
      else{
        for (let i = 0; i < this.users.length; i++) {
          if (this.users[i].loginId.toLowerCase() === this.loginUser.loginId.toLowerCase() && this.users[i].password.toLowerCase() === this.loginUser.password.toLowerCase()) {
            this.matchedUser = this.users[i];
            const token = await this.sessionService.createEncPayload();
            localStorage.setItem('sessionId', token);
            this.router.navigate(['/search']);
            return;            
          }
        }
        if (this.matchedUser === undefined) {
          this.toastService.showError('Invalid login ID or password.');
        }
      }
    }
     
  }

  prepareResponseObject(user: any){
    this.loginUser = {
      loginId : user.value.loginId,
      password : user.value.password,
    }
    return this.loginUser;
  }
  triggerToast(message: string): void {
  this.loginError = message;
  this.closing = false;
  this.showAlert = true;


  setTimeout(() => {
      this.closing = true;
      setTimeout(() => {
        this.showAlert = false;
        this.loginError = null;
        this.closing = false;
      }, 750);
    }, 5000);
  }

}

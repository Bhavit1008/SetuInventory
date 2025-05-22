import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

      constructor(private router: Router) { }


ngOnInit(){
      this.buildForm();
    }
  

  buildForm(){
        this.loginFormGroup = new FormGroup({
          loginId : new FormControl(''),
          password : new FormControl('')
        })
      }




  saveLoginDetails(user: any){
      if(user!=null && user!=undefined){
        console.log('block details :: ', this.prepareResponseObject(user).loginId);
        for (let i = 0; i < this.users.length; i++) {
          console.log('user :: ',this.users[i].loginId)
          if (this.users[i].loginId.toLowerCase() === this.loginUser.loginId.toLowerCase() && this.users[i].password.toLowerCase() === this.loginUser.password.toLowerCase()) {
            this.matchedUser = this.users[i];
            console.log('login successful')
           localStorage.setItem('loggedIn', 'true');
        this.router.navigate(['/search']);
        return;            
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

}

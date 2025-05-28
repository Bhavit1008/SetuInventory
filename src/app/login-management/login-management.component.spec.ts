import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginManagementComponent } from './login-management.component';

describe('LoginManagementComponent', () => {
  let component: LoginManagementComponent;
  let fixture: ComponentFixture<LoginManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

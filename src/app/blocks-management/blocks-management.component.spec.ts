import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlocksManagementComponent } from './blocks-management.component';

describe('BlocksManagementComponent', () => {
  let component: BlocksManagementComponent;
  let fixture: ComponentFixture<BlocksManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlocksManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlocksManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

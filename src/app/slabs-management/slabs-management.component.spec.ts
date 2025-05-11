import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SlabsManagementComponent } from './slabs-management.component';

describe('SlabsManagementComponent', () => {
  let component: SlabsManagementComponent;
  let fixture: ComponentFixture<SlabsManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlabsManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SlabsManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

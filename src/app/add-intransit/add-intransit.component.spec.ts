import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddIntransitComponent } from './add-intransit.component';

describe('AddIntransitComponent', () => {
  let component: AddIntransitComponent;
  let fixture: ComponentFixture<AddIntransitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddIntransitComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddIntransitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

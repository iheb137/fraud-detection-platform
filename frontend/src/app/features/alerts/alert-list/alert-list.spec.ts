import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertList } from './alert-list';

describe('AlertList', () => {
  let component: AlertList;
  let fixture: ComponentFixture<AlertList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertList],
    }).compileComponents();

    fixture = TestBed.createComponent(AlertList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

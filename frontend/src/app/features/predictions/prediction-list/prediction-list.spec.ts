import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictionList } from './prediction-list';

describe('PredictionList', () => {
  let component: PredictionList;
  let fixture: ComponentFixture<PredictionList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PredictionList],
    }).compileComponents();

    fixture = TestBed.createComponent(PredictionList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdrList } from './cdr-list';

describe('CdrList', () => {
  let component: CdrList;
  let fixture: ComponentFixture<CdrList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CdrList],
    }).compileComponents();

    fixture = TestBed.createComponent(CdrList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

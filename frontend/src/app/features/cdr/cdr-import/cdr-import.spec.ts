import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CdrImport } from './cdr-import';

describe('CdrImport', () => {
  let component: CdrImport;
  let fixture: ComponentFixture<CdrImport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CdrImport],
    }).compileComponents();

    fixture = TestBed.createComponent(CdrImport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

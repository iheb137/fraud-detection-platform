import { TestBed } from '@angular/core/testing';

import { AlertNotification } from './alert-notification';

describe('AlertNotification', () => {
  let service: AlertNotification;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AlertNotification);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

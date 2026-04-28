import { TestBed } from '@angular/core/testing';

import { Door } from './door';

describe('Door', () => {
  let service: Door;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Door);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavBadgesService } from './nav-badges.service';

describe('NavBadgesService', () => {
  it('expone contadores por defecto', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), NavBadgesService],
    });
    const svc = TestBed.inject(NavBadgesService);
    expect(svc.counts()).toEqual({ alerts: 6, payments: 3 });
  });
});

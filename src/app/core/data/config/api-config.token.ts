import { InjectionToken } from '@angular/core';

export interface ApiConfig {
  apiBaseUrl: string;
  realtimeBaseUrl: string;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');

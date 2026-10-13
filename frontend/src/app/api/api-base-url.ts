declare const API_BASE_URL: string;

const configuredApiBaseUrl =
  typeof API_BASE_URL === 'string' ? API_BASE_URL : 'http://localhost:8000';

export const apiBaseUrl = configuredApiBaseUrl.replace(/\/$/, '');

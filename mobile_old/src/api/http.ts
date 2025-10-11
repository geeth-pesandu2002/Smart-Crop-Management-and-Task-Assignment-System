import axios from 'axios';
import { API_BASE_URL } from '../config/env';

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// set bearer token after login
export function setAuthToken(token: string) {
  http.defaults.headers.common.Authorization = `Bearer ${token}`;
}

// (optional) quick logging
http.interceptors.response.use(
  (r) => r,
  (err) => {
    console.log('HTTP ERROR:', err?.message, err?.response?.status, err?.response?.data);
    throw err;
  }
);

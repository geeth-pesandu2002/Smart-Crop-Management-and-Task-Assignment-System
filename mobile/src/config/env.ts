// mobile/src/config/env.ts
// Use your PC's Wi-Fi IPv4 (from `ipconfig`) so phones on the same LAN can reach the API.
// If you switch networks, update this value.
export const API_URL = 'http://192.168.67.214:4000/api';

export const API_TOKEN = ''; // will be set after login
export const API_TIMEOUT = 10000; // ms

// Tips:
// - Android emulator: use 'http://10.0.2.2:4000/api'
// - iOS simulator:    use 'http://127.0.0.1:4000/api'

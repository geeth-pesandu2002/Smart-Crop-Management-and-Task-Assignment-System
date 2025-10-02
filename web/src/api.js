// web/src/api.js
import axios from "axios";
import { getAuth } from "./auth.js";

const BASE_URL = import.meta?.env?.VITE_API_URL || "http://localhost:4000/api";
const api = axios.create({ baseURL: BASE_URL });

// Attach auth token
api.interceptors.request.use((config) => {
  const a = getAuth?.();
  if (a?.token) config.headers.Authorization = `Bearer ${a.token}`;
  return config;
});

/* ---------------- USERS ---------------- */
export const listUsers        = (params = {}) => api.get("/users", { params }).then(r => r.data);
export const createUser       = (payload)     => api.post("/users", payload).then(r => r.data);
export const updateUser       = (id, payload) => api.patch(`/users/${id}`, payload).then(r => r.data);
export const setUserStatus    = (id, status)  => api.patch(`/users/${id}/status`, { status }).then(r => r.data);
export const resetUserPassword= (id)          => api.post(`/users/${id}/reset-password`).then(r => r.data);
export const resetUserPin     = (id)          => api.post(`/users/${id}/reset-pin`).then(r => r.data);

/* ---------------- LEAVES ---------------- */
export const listLeaves       = (params = {}) => api.get("/leaves", { params }).then(r => r.data);
export const createLeave      = (payload)     => api.post("/leaves", payload).then(r => r.data);
export const endLeaveToday    = (id)          => api.patch(`/leaves/${id}/end-today`).then(r => r.data);
export const listActiveLeaves = (dateStr)     => api.get("/leaves/active", { params: { date: dateStr } }).then(r => r.data);
export const extendLeave      = (id, endDate) => api.patch(`/leaves/${id}/extend`, { endDate }).then(r => r.data);

/* ---------------- PLOTS ---------------- */
export const getPlots         = (params = {}) => api.get("/plots", { params }).then(r => r.data);
export const listPlots        = (params = {}) => getPlots(params);
export const getPlot          = (id)          => api.get(`/plots/${id}`).then(r => r.data);
export const createPlot       = (payload)     => api.post("/plots", payload).then(r => r.data);
export const updatePlot       = (id, payload) => api.patch(`/plots/${id}`, payload).then(r => r.data);
export const deletePlot       = (id)          => api.delete(`/plots/${id}`).then(r => r.data);

/* ---------------- HARVESTS ---------------- */
export const addHarvest       = (plotId, payload)           => api.post(`/plots/${plotId}/harvests`, payload).then(r => r.data);
export const updateHarvest    = (plotId, hid, payload)      => api.patch(`/plots/${plotId}/harvests/${hid}`, payload).then(r => r.data);
export const deleteHarvest    = (plotId, hid)               => api.delete(`/plots/${plotId}/harvests/${hid}`).then(r => r.data);

/* ---------------- RESOURCES ---------------- */
export const createResourceUsage  = (payload)     => api.post("/resources", payload).then(r => r.data);
export const listResourceUsages   = (params = {}) => api.get("/resources", { params }).then(r => r.data);
export const deleteResourceUsage  = (id)          => api.delete(`/resources/${id}`).then(r => r.data);
export const getResourceMetrics   = (yearOrParams) => {
  const params = typeof yearOrParams === "number" ? { year: yearOrParams } : yearOrParams || {};
  return api.get("/resources/metrics/summary", { params }).then(r => r.data);
};

export default api;

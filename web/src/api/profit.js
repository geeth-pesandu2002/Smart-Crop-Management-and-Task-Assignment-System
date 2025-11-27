import api from "../api";

export const listProfits = (params = {}) => api.get("/profits", { params }).then(r => r.data);
export const createOrUpdateProfit = (payload) => api.post("/profits", payload).then(r => r.data);
export const updateProfit = (id, payload) => api.patch(`/profits/${id}`, payload).then(r => r.data);
export const deleteProfit = (id) => api.delete(`/profits/${id}`).then(r => r.data);

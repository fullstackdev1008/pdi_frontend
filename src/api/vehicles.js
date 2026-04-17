import client from './client';

export const getVehicles = (params) => client.get('/vehicles', { params });
export const getVehicle = (id) => client.get(`/vehicles/${id}`);
export const createVehicle = (data) => client.post('/vehicles', data);
export const updateVehicle = (id, data) => client.put(`/vehicles/${id}`, data);
export const deleteVehicle = (id) => client.delete(`/vehicles/${id}`);

export const addVehicleEta = (id, data) => client.post(`/vehicles/${id}/eta`, data);
export const receiveVehicle = (id, data) => client.put(`/vehicles/${id}/receive`, data);
export const acceptVehicle = (id) => client.put(`/vehicles/${id}/accept`);
export const rejectVehicle = (id, data) => client.put(`/vehicles/${id}/reject`, data);
export const deliverVehicle = (id) => client.put(`/vehicles/${id}/deliver`);

export const addBodyBuilding = (id, data) => client.post(`/vehicles/${id}/body-building`, data);
export const addBodyBuildingEta = (id, data) => client.post(`/vehicles/${id}/body-building/eta`, data);
export const completeBodyBuilding = (id, data) => client.put(`/vehicles/${id}/body-building/complete`, data);

export const addAccessoriesVendor = (id, data) => client.post(`/vehicles/${id}/accessories-vendor`, data);
export const addAccessoriesVendorEta = (id, data) => client.post(`/vehicles/${id}/accessories-vendor/eta`, data);
export const completeAccessoriesVendor = (id, data) => client.put(`/vehicles/${id}/accessories-vendor/complete`, data);

export const getJobs = (vehicleId) => client.get(`/vehicles/${vehicleId}/jobs`);
export const createJob = (vehicleId, data) => client.post(`/vehicles/${vehicleId}/jobs`, data);
export const updateJob = (vehicleId, jobId, data) => client.put(`/vehicles/${vehicleId}/jobs/${jobId}`, data);
export const completeJob = (vehicleId, jobId, data) => client.put(`/vehicles/${vehicleId}/jobs/${jobId}/complete`, data);
export const addJobEta = (vehicleId, jobId, data) => client.post(`/vehicles/${vehicleId}/jobs/${jobId}/eta`, data);

export const addChecklistItem = (vehicleId, jobId, data) => client.post(`/vehicles/${vehicleId}/jobs/${jobId}/checklist`, data);
export const toggleChecklistItem = (vehicleId, jobId, itemId, data) => client.put(`/vehicles/${vehicleId}/jobs/${jobId}/checklist/${itemId}`, data);
export const deleteChecklistItem = (vehicleId, jobId, itemId) => client.delete(`/vehicles/${vehicleId}/jobs/${jobId}/checklist/${itemId}`);

import axios from 'axios';

//const API_BASE_URL = 'https://lyonclimb.onrender.com/api';
//const API_BASE_URL = 'http://192.168.1.11:12000/api';
const API_BASE_URL = 'http://192.168.1.20:12000/api';


const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Gyms
export const getGyms = async () => {
  const response = await api.get('/gyms');
  return response.data;
};

export const getGym = async (id, userId = null) => {
  const response = await api.get(`/gyms/${id}`, {
    params: userId ? { userId } : {}
  });
  return response.data;
};

// Device-based auth (no email required)
export const registerDevice = async (deviceId, deviceName) => {
  const response = await api.post('/auth/device', { deviceId, deviceName });
  return response.data;
};

// Subscriptions
export const subscribe = async (userId, gymId) => {
  const response = await api.post('/subscriptions', { userId, gymId });
  return response.data;
};

export const unsubscribe = async (userId, gymId) => {
  const response = await api.delete(`/subscriptions/${userId}/${gymId}`);
  return response.data;
};

export const getUserSubscriptions = async (userId) => {
  const response = await api.get(`/subscriptions/${userId}`);
  return response.data;
};

// Crowd updates
export const updateCrowdLevel = async (gymId, userId, crowdLevel) => {
  const response = await api.post(`/gyms/${gymId}/crowd`, { userId, crowdLevel });
  return response.data;
};

export const getGymCrowdHistory = async (gymId, date = null) => {
  const response = await api.get(`/gyms/${gymId}/crowd-history`, {
    params: date ? { date } : {}
  });
  return response.data;
};

export const registerVisitSlot = async (gymId, userId, slot) => {
  const response = await api.post(`/gyms/${gymId}/slots`, {
    userId,
    arrivalTime: slot.arrivalTime,
    duration: slot.duration,
    visitDate: slot.date
  });
  return response.data;
};

export default api;

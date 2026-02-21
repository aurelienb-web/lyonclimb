import axios from 'axios';

// const API_BASE_URL = 'https://work-1-qvlwqbjsnisnedpv.prod-runtime.all-hands.dev/api';
const API_BASE_URL = 'http://localhost:12000/api';


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

export const getGym = async (id) => {
  const response = await api.get(`/gyms/${id}`);
  return response.data;
};

// Auth
export const login = async (email) => {
  const response = await api.post('/auth/login', { email });
  return response.data;
};

export const register = async (email, name) => {
  const response = await api.post('/auth/register', { email, name });
  return response.data;
};

// Subscriptions
export const subscribe = async (userId, gymId, pushToken = null) => {
  const response = await api.post('/subscriptions', { userId, gymId, pushToken });
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

// Sector changes
export const reportSectorChange = async (gymId, userId, sectorName, description) => {
  const response = await api.post(`/gyms/${gymId}/sector-change`, {
    userId,
    sectorName,
    description,
  });
  return response.data;
};

// Notifications
export const getNotifications = async (userId) => {
  const response = await api.get(`/notifications/${userId}`);
  return response.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data;
};

export const markAllNotificationsRead = async (userId) => {
  const response = await api.put(`/notifications/${userId}/read-all`);
  return response.data;
};

export default api;

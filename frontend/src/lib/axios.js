import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.DEV ? '/api' : import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 15000,
});

export default api;

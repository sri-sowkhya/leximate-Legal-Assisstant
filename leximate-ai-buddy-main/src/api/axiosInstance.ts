import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
   // Flask backend URL
});

export default api;

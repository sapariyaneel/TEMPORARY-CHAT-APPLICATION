const PROD_API_URL = 'https://temporary-chat-application-api.onrender.com';
const DEV_API_URL = 'http://localhost:5000';

export const API_URL = import.meta.env.PROD ? PROD_API_URL : DEV_API_URL;
export const SOCKET_URL = API_URL;

export const SOCKET_OPTIONS = {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  path: '/socket.io/',
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
}; 
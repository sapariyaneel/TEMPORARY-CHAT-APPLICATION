const PROD_API_URL = 'https://temporary-chat-application-api.onrender.com';
const DEV_API_URL = 'http://localhost:5000';

export const API_URL = import.meta.env.PROD ? PROD_API_URL : DEV_API_URL;
export const SOCKET_URL = API_URL; 
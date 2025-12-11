// src/services/api.js
import axios from 'axios';
import { API_BASE_URL } from '../authConfig';

// URL base del backend - cambiar según el entorno
export const getApiBaseUrl = () => API_BASE_URL;

// Log para debugging (solo en desarrollo)
if (import.meta.env.DEV) {
  console.log('🔧 API Configuration:', {
    hostname: window.location.hostname,
    API_BASE_URL,
    VITE_API_URL: import.meta.env.VITE_API_URL
  });
}

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Interceptor para agregar token JWT a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('❌ Token inválido o expirado');
      localStorage.removeItem('accessToken');
    }
    return Promise.reject(error);
  }
);

// ==========================================
// API DE AUTENTICACIÓN
// ==========================================
export const authAPI = {
  // Obtener información del usuario autenticado
  getUserProfile: () => api.get('/api/auth/me'),
  
  // Verificar token
  verifyToken: () => api.get('/api/auth/verify'),
};

// ==========================================
// API DE SALUD
// ==========================================
export const healthAPI = {
  // Health check
  check: () => api.get('/api/health'),
};

// ==========================================
// API DE MFA (AUTENTICACIÓN DE 2 FACTORES)
// ==========================================
export const mfaAPI = {
  // Enviar código MFA al email
  sendCode: (email) => api.post('/api/mfa/send', { email }),
  
  // Verificar código MFA
  verifyCode: (email, code) => api.post('/api/mfa/verify', { email, code }),
};

// ==========================================
// API DE CHAT
// ==========================================
export const chatAPI = {
  // Enviar mensaje
  sendMessage: (message) => api.post('/api/chat/send', message),
  
  // Obtener mensajes con otro usuario
  getMessages: (userId, otherUserId) => api.get(`/api/chat/messages/${userId}/${otherUserId}`),
  
  // Obtener lista de contactos
  getContacts: (userId) => api.get(`/api/chat/contacts?userId=${encodeURIComponent(userId)}`),
  
  // Marcar mensaje como leído
  markAsRead: (messageId) => api.post(`/api/chat/read/${messageId}`),

  // Registrar clave pública
  registerPublicKey: (userId, publicKey) => api.post('/api/chat/key', { userId, publicKey }),

  // Obtener clave pública
  getPublicKey: (userId) => api.get(`/api/chat/key/${encodeURIComponent(userId)}`),
};

export default api;

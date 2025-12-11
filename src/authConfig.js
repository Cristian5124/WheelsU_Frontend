// ==========================================
//  MSAL CONFIG - DINÁMICO (LOCAL/PRODUCCIÓN)
// ==========================================

// Detectar si estamos en local o en producción
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// ⚠️ Configuración de WheelsU - Estos valores son seguros para frontend (no hay secretos)
const CLIENT_ID = "74bc9842-c074-43d7-9474-94800b274287";   // WheelsU App
const TENANT_ID = "50640584-2a40-4216-a84b-9b3ee0f3f6cf";    // WheelsU Tenant ID real del usuario
const AUTHORITY = `https://login.microsoftonline.com/${TENANT_ID}`;

// URLs dinámicas según el entorno
const REDIRECT_URI = isLocal 
  ? "http://localhost:5173/" 
  : "https://d34hoxniq2n0jw.cloudfront.net/";

const POST_LOGOUT_REDIRECT_URI = isLocal 
  ? "http://localhost:5173/" 
  : "https://d34hoxniq2n0jw.cloudfront.net/";

const API_SCOPE = "api://74bc9842-c074-43d7-9474-94800b274287/Login"; // Scope de WheelsU

// Backend URL según el entorno
const API_BASE_URL = isLocal 
  ? "http://localhost:8080" 
  : "https://d34hoxniq2n0jw.cloudfront.net";

console.log('🚗 WheelsU - Entorno detectado:', isLocal ? 'LOCAL' : 'PRODUCCIÓN');
console.log('🔗 Redirect URI:', REDIRECT_URI);
console.log('🔗 API Base URL:', API_BASE_URL);
console.log('🔐 Client ID:', CLIENT_ID);
console.log('🏢 Tenant ID:', TENANT_ID);


// ==========================================
//  EXPORT: CONFIGURACIÓN MSAL
// ==========================================
export const msalConfig = {
  auth: {
    clientId: CLIENT_ID,
    authority: AUTHORITY,
    redirectUri: REDIRECT_URI,
    postLogoutRedirectUri: POST_LOGOUT_REDIRECT_URI,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message) => {
        // console.log(message);
      },
      piiLoggingEnabled: false,
    },
  },
};


// ==========================================
//  REQUEST PARA LOGIN
// ==========================================
export const loginRequest = {
  scopes: ["openid", "profile", "offline_access", API_SCOPE],
};


// ==========================================
//  REQUEST PARA TOKEN (API BACKEND)
// ==========================================
export const tokenRequest = {
  scopes: [API_SCOPE],
};


// ==========================================
//  (Opcional) CONFIG PARA TU API
// ==========================================
export const apiConfig = {
  baseUrl: API_BASE_URL,
  validateTokenUrl: `${API_BASE_URL}/api/auth/validate-token`,
};

import React, { useState, useEffect } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";
import Login from "./components/Login";
import MFAVerification from "./components/MFAVerification";
import NavBar from "./components/NavBar";
import Chat from "./components/Chat";
import "./styles/mainStyles/index.css";
import "./App.css";

export default function App() {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  const [userName, setUserName] = useState("");
  const [mfaVerified, setMfaVerified] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Obtener token y guardar en localStorage
  useEffect(() => {
    const getToken = async () => {
      if (isAuthenticated && accounts.length > 0) {
        try {
          const response = await instance.acquireTokenSilent({
            ...loginRequest,
            account: accounts[0],
          });
          
          if (response.accessToken) {
            localStorage.setItem('accessToken', response.accessToken);
            console.log('✅ Token guardado correctamente');
          }
          
          // Guardar nombre del usuario
          setUserName(accounts[0].name || accounts[0].username);
        } catch (error) {
          console.error('Error obteniendo token:', error);
        }
      }
    };

    getToken();
  }, [isAuthenticated, accounts, instance]);

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setMfaVerified(false);
    instance.logoutRedirect({
      postLogoutRedirectUri: "/",
    });
  };

  // Función callback cuando MFA es verificado
  const handleMFAVerified = () => {
    setMfaVerified(true);
  };

  // Función para abrir el chat
  const handleOpenChat = () => {
    setChatOpen(true);
  };

  // Si no está autenticado, mostrar Login
  if (!isAuthenticated) {
    return <Login />;
  }

  // Si está autenticado pero no ha verificado MFA, mostrar pantalla MFA
  if (!mfaVerified) {
    return <MFAVerification onVerified={handleMFAVerified} />;
  }

  // Si está autenticado Y ha verificado MFA, mostrar página principal
  return (
    <div className="app-container">
      <NavBar onLogout={handleLogout} userName={userName} onOpenChat={handleOpenChat} />
      
      {chatOpen && (
        <Chat 
          currentUser={accounts[0]?.username || accounts[0]?.name} 
          onClose={() => setChatOpen(false)} 
        />
      )}
      
      <main className="main-content">
        {/* Hero Section - Estilo Nubank */}
        <section className="hero-section">
          <div className="hero-background">
            <div className="hero-content">
              <div className="welcome-badge">Bienvenido</div>
              <h1 className="hero-title">Hola, {userName ? userName.split(' ')[0] : 'Usuario'}</h1>
              <p className="hero-subtitle">
                Tu plataforma de viajes compartidos está lista
              </p>
            </div>
          </div>
        </section>

        {/* Main Features Cards - Diseño Nubank */}
        <section className="features-section">
          <div className="container">
            <div className="features-grid">
              <div className="feature-card feature-card-primary">
                <div className="feature-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 7H6C4.89543 7 4 7.89543 4 9V15C4 16.1046 4.89543 17 6 17H18C19.1046 17 20 16.1046 20 15V9C20 7.89543 19.1046 7 18 7Z" stroke="#6A0E0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" stroke="#6A0E0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="7" cy="19" r="2" stroke="#6A0E0F" strokeWidth="2"/>
                    <circle cx="17" cy="19" r="2" stroke="#6A0E0F" strokeWidth="2"/>
                  </svg>
                </div>
                <h3>Viajes Compartidos</h3>
                <p>Conecta con estudiantes de tu universidad para compartir trayectos</p>
                <button className="feature-btn">Explorar viajes</button>
              </div>
              
              <div className="feature-card feature-card-secondary">
                <div className="feature-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="#6A0E0F" strokeWidth="2"/>
                    <path d="M12 6V18" stroke="#6A0E0F" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M15 9H10.5C9.67157 9 9 9.67157 9 10.5C9 11.3284 9.67157 12 10.5 12H13.5C14.3284 12 15 12.6716 15 13.5C15 14.3284 14.3284 15 13.5 15H9" stroke="#6A0E0F" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3>Ahorra dinero</h3>
                <p>Reduce costos de transporte compartiendo gastos con otros</p>
                <button className="feature-btn">Ver beneficios</button>
              </div>
              
              <div className="feature-card feature-card-tertiary">
                <div className="feature-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="#6A0E0F" strokeWidth="2"/>
                    <path d="M2 12H22" stroke="#6A0E0F" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M12 2C10.5 5 10 8.5 10 12C10 15.5 10.5 19 12 22" stroke="#6A0E0F" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M12 2C13.5 5 14 8.5 14 12C14 15.5 13.5 19 12 22" stroke="#6A0E0F" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3>Cuida el planeta</h3>
                <p>Contribuye a reducir la huella de carbono con movilidad sostenible</p>
                <button className="feature-btn">Más información</button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats-section">
          <div className="container">
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number">100%</div>
                <div className="stat-label">Seguro</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">24/7</div>
                <div className="stat-label">Disponible</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">0</div>
                <div className="stat-label">Comisiones</div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section - Minimalista */}
        <section className="security-section">
          <div className="container">
            <h2 className="section-title">Tu seguridad es nuestra prioridad</h2>
            <div className="security-grid">
              <div className="security-item">
                <div className="security-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L3 7V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V7L12 2Z" stroke="#6A0E0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 12L11 14L15 10" stroke="#6A0E0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h4>Verificación universitaria</h4>
                <p>Solo estudiantes con credenciales institucionales validadas</p>
              </div>
              
              <div className="security-item">
                <div className="security-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="11" width="14" height="10" rx="2" stroke="#6A0E0F" strokeWidth="2"/>
                    <path d="M12 15V17" stroke="#6A0E0F" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M7 11V7C7 4.79086 8.79086 3 11 3H13C15.2091 3 17 4.79086 17 7V11" stroke="#6A0E0F" strokeWidth="2"/>
                  </svg>
                </div>
                <h4>Autenticación segura</h4>
                <p>Protección mediante Microsoft Entra ID y MFA</p>
              </div>
              
              <div className="security-item">
                <div className="security-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L3 7V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V7L12 2Z" stroke="#6A0E0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="9" y="10" width="6" height="7" rx="1" stroke="#6A0E0F" strokeWidth="2"/>
                    <path d="M12 13V15" stroke="#6A0E0F" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h4>Datos protegidos</h4>
                <p>Cifrado end-to-end en todas las comunicaciones</p>
              </div>
            </div>
          </div>
        </section>

        {/* User Info Card - Estilo tarjeta Nubank */}
        <section className="user-section">
          <div className="container">
            <div className="user-info-card">
              <div className="user-info-header">
                <div className="user-avatar">{userName ? userName.charAt(0).toUpperCase() : 'U'}</div>
                <div className="user-details">
                  <h3>{userName || 'Usuario'}</h3>
                  <p>{accounts[0]?.username || ''}</p>
                </div>
              </div>
              <div className="user-info-body">
                <div className="info-row">
                  <span className="info-label">Estado</span>
                  <span className="status-active">Activo</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Autenticado con</span>
                  <span>Microsoft Entra ID</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <p>WheelsU · Plataforma de viajes compartidos para estudiantes</p>
          <p className="footer-small">Seguro · Confiable · Sostenible</p>
        </div>
      </footer>
    </div>
  );
}

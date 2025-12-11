// src/components/NavBar.jsx
import React, { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import '../styles/NavBar.css';

const NavBar = ({ onLogout, userName: propUserName, onOpenChat }) => {
  const { accounts } = useMsal();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.removeItem('accessToken');
    if (onLogout) {
      onLogout();
    }
  };

  const userName = propUserName || accounts[0]?.name || 'Usuario';
  const userEmail = accounts[0]?.username || '';
  const userRole = 'ESTUDIANTE';

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-brand">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 7H6C4.89543 7 4 7.89543 4 9V15C4 16.1046 4.89543 17 6 17H18C19.1046 17 20 16.1046 20 15V9C20 7.89543 19.1046 7 18 7Z" stroke="#6A0E0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" stroke="#6A0E0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="7" cy="19" r="2" stroke="#6A0E0F" strokeWidth="2"/>
            <circle cx="17" cy="19" r="2" stroke="#6A0E0F" strokeWidth="2"/>
          </svg>
          <span className="brand-text">WheelsU</span>
        </div>

        {/* Usuario y menú */}
        <div className="navbar-user">
          {/* Botón de chat */}
          <button className="chat-button" onClick={onOpenChat} title="Chat Seguro">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Chat</span>
          </button>

          <div className="user-info" onClick={() => setShowMenu(!showMenu)}>
            <div className="user-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">{userName.split(' ')[0]}</span>
              <span className="user-role">{userRole}</span>
            </div>
            <svg 
              className={`dropdown-icon ${showMenu ? 'open' : ''}`}
              width="16" 
              height="16" 
              viewBox="0 0 16 16" 
              fill="currentColor"
            >
              <path d="M4 6l4 4 4-4z"/>
            </svg>
          </div>

          {/* Menú desplegable */}
          {showMenu && (
            <>
              <div className="menu-overlay" onClick={() => setShowMenu(false)} />
              <div className="dropdown-menu">
                <div className="menu-header">
                  <div className="menu-user-avatar">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="menu-user-info">
                    <div className="menu-user-name">{userName}</div>
                    <div className="menu-user-email">{userEmail}</div>
                  </div>
                </div>
                
                <div className="menu-divider" />
                
                <button className="menu-item logout" onClick={handleLogout}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="menu-icon">
                    <path d="M9 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;

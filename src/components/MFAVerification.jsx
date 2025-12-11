// src/components/MFAVerification.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMsal } from '@azure/msal-react';
import '../styles/MFAVerification.css';

const MFAVerification = ({ onVerified }) => {
  const { accounts } = useMsal();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const codeSentRef = useRef(false);

  const userEmail = accounts[0]?.username || '';
  const COOLDOWN_TIME = 60; // 60 segundos

  // Verificar si hay un cooldown activo al cargar
  useEffect(() => {
    const savedTimestamp = localStorage.getItem(`mfa_cooldown_${userEmail}`);
    if (savedTimestamp) {
      const elapsed = Math.floor((Date.now() - parseInt(savedTimestamp)) / 1000);
      const remaining = COOLDOWN_TIME - elapsed;
      
      if (remaining > 0) {
        setTimeLeft(remaining);
        codeSentRef.current = true; // Ya se envió un código
      } else {
        localStorage.removeItem(`mfa_cooldown_${userEmail}`);
      }
    }
  }, [userEmail]);

  // Temporizador de cuenta regresiva
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
        
        if (timeLeft - 1 === 0) {
          localStorage.removeItem(`mfa_cooldown_${userEmail}`);
          codeSentRef.current = false;
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [timeLeft, userEmail]);

  const sendCode = useCallback(async () => {
    // Prevenir envíos múltiples
    if (codeSentRef.current || timeLeft > 0) {
      if (timeLeft > 0) {
        setError(`Espera ${timeLeft} segundos antes de reenviar`);
      }
      return;
    }
    
    codeSentRef.current = true; // Marcar como enviado inmediatamente
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:8080/api/mfa/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: userEmail })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Código enviado a ' + userEmail);
        
        // Guardar timestamp en localStorage
        const timestamp = Date.now();
        localStorage.setItem(`mfa_cooldown_${userEmail}`, timestamp.toString());
        
        // Iniciar cuenta regresiva
        setTimeLeft(COOLDOWN_TIME);
      } else {
        setError(data.message || 'Error al enviar código');
        codeSentRef.current = false; // Permitir reintentar en caso de error
      }
    } catch (err) {
      setError('Error de conexión al servidor');
      codeSentRef.current = false; // Permitir reintentar en caso de error
    } finally {
      setLoading(false);
    }
  }, [userEmail, timeLeft]);

  useEffect(() => {
    // Enviar código automáticamente al cargar solo la primera vez
    if (userEmail && !codeSentRef.current && timeLeft === 0) {
      const savedTimestamp = localStorage.getItem(`mfa_cooldown_${userEmail}`);
      // Solo enviar si no hay timestamp guardado
      if (!savedTimestamp) {
        sendCode();
      }
    }
  }, [userEmail, timeLeft, sendCode]);

  const verifyCode = async (e) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8080/api/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email: userEmail,
          code: code 
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('¡Verificación exitosa!');
        setTimeout(() => {
          onVerified();
        }, 1000);
      } else {
        setError(data.message || 'Código inválido');
      }
    } catch (err) {
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  return (
    <div className="mfa-container">
      <div className="mfa-card">
        <div className="mfa-header">
          <div className="mfa-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L3 7V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V7L12 2Z" 
                    stroke="#6A0E0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 12L11 14L15 10" stroke="#6A0E0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2>Verificación en dos pasos</h2>
          <p>Ingresa el código de 6 dígitos enviado a:</p>
          <p className="user-email">{userEmail}</p>
        </div>

        <form onSubmit={verifyCode} className="mfa-form">
          <div className="code-input-container">
            <input
              type="text"
              inputMode="numeric"
              className="code-input"
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              maxLength="6"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && <div className="mfa-error">{error}</div>}
          {success && <div className="mfa-success">{success}</div>}

          <button 
            type="submit" 
            className="verify-btn"
            disabled={loading || code.length !== 6}
          >
            {loading ? 'Verificando...' : 'Verificar código'}
          </button>

          <button 
            type="button" 
            className="resend-btn"
            onClick={sendCode}
            disabled={loading || timeLeft > 0}
          >
            {timeLeft > 0 ? `Reenviar en ${timeLeft}s` : 'Reenviar código'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MFAVerification;

// src/components/Chat.jsx
import React, { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { over } from 'stompjs';
import { encryptMessage, decryptMessage, generateKeyPair, saveKeyPair, loadKeyPair, exportPublicKey, importPublicKey } from '../services/encryption';
import { chatAPI } from '../services/api';
import { API_BASE_URL } from '../authConfig';
import '../styles/Chat.css';

const Chat = ({ currentUser, onClose }) => {
  const [stompClient, setStompClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [keyPair, setKeyPair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactEmail, setNewContactEmail] = useState('');
  const messagesEndRef = useRef(null);

  // Inicializar claves de encriptación
  useEffect(() => {
    const initKeys = async () => {
      try {
        let keys = await loadKeyPair();
        if (!keys) {
          console.log('🔐 Generando nuevas claves de encriptación...');
          keys = await generateKeyPair();
          await saveKeyPair(keys);
          console.log('✅ Claves generadas y guardadas');
        } else {
          console.log('✅ Claves cargadas desde localStorage');
        }
        setKeyPair(keys);

        // Registrar clave pública en el servidor
        const publicJwk = await exportPublicKey(keys.publicKey);
        await chatAPI.registerPublicKey(currentUser, JSON.stringify(publicJwk));
        console.log('✅ Clave pública registrada en el servidor');

      } catch (error) {
        console.error('Error inicializando claves:', error);
      }
    };

    if (currentUser) {
      initKeys();
    }
  }, [currentUser]);

  // Conectar al WebSocket
  useEffect(() => {
    if (!keyPair) return;

    const socket = new SockJS(`${API_BASE_URL}/ws`);
    const client = over(socket);
    
    client.debug = (str) => {
      console.log('STOMP:', str);
    };

    client.connect(
      {},
      () => {
        console.log('✅ WebSocket conectado');
        setConnected(true);
        setStompClient(client);

        // Suscribirse a mensajes personales
        client.subscribe(`/user/${currentUser}/queue/messages`, (message) => {
          const receivedMessage = JSON.parse(message.body);
          console.log('📩 Mensaje recibido:', receivedMessage);
          handleReceivedMessage(receivedMessage);
        });

        // Notificar que el usuario se conectó
        client.send('/app/chat.addUser', {}, JSON.stringify({
          senderId: currentUser,
          status: 'JOINED'
        }));
      },
      (error) => {
        console.error('❌ Error WebSocket:', error);
        setConnected(false);
      }
    );

    return () => {
      if (client && client.connected) {
        client.disconnect();
      }
    };
  }, [currentUser, keyPair]);

  // Cargar contactos
  useEffect(() => {
    loadContacts();
  }, []);

  // Cargar mensajes cuando se selecciona un contacto
  useEffect(() => {
    if (selectedContact) {
      console.log('🎯 Contacto seleccionado:', selectedContact);
      console.log('🔑 KeyPair disponible:', !!keyPair);
      loadMessages(selectedContact);
    }
  }, [selectedContact]);

  // Scroll automático al final de los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadContacts = async () => {
    try {
      console.log('🔄 Cargando contactos para:', currentUser);
      const response = await chatAPI.getContacts(currentUser);
      if (response.data.success) {
        setContacts(response.data.contacts);
        console.log('✅ Contactos cargados:', response.data.contacts);
      }
    } catch (error) {
      console.error('Error cargando contactos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (contactEmail) => {
    try {
      console.log('📬 Cargando mensajes con:', contactEmail);
      const response = await chatAPI.getMessages(currentUser, contactEmail);
      console.log('📦 Respuesta del servidor:', response.data);
      
      if (response.data.success) {
        console.log('📨 Total mensajes recibidos:', response.data.messages.length);
        
        const decryptedMessages = await Promise.all(
          response.data.messages.map(async (msg, index) => {
            try {
              console.log(`🔓 Desencriptando mensaje ${index + 1}/${response.data.messages.length}`);
              
              let contentToDecrypt;
              
              // Si yo lo envié, uso la copia encriptada para mí
              if (msg.senderId === currentUser) {
                  if (msg.encryptedContentSender) {
                      contentToDecrypt = msg.encryptedContentSender;
                  } else {
                      // Mensajes antiguos que no tienen copia para el remitente
                      return {
                          ...msg,
                          decryptedContent: '[Mensaje antiguo no disponible]',
                      };
                  }
              } else {
                  // Si me lo enviaron, uso el contenido normal
                  contentToDecrypt = msg.encryptedContent;
              }

              const decrypted = await decryptMessage(contentToDecrypt, keyPair.privateKey);
              console.log(`✅ Mensaje ${index + 1} desencriptado:`, decrypted.substring(0, 50) + '...');
              return {
                ...msg,
                decryptedContent: decrypted,
              };
            } catch (error) {
              console.error(`❌ Error desencriptando mensaje ${index + 1}:`, error);
              return {
                ...msg,
                decryptedContent: '[Error al desencriptar]',
              };
            }
          })
        );
        
        console.log('✅ Mensajes procesados:', decryptedMessages);
        setMessages(decryptedMessages);
        console.log('✅ Estado actualizado con', decryptedMessages.length, 'mensajes');
      } else {
        console.log('⚠️ La respuesta no fue exitosa:', response.data);
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Error cargando mensajes:', error.response?.data || error.message);
      setMessages([]);
    }
  };

  const handleReceivedMessage = async (message) => {
    try {
      // Desencriptar el mensaje recibido
      const decrypted = await decryptMessage(message.encryptedContent, keyPair.privateKey);
      
      const decryptedMessage = {
        ...message,
        decryptedContent: decrypted,
      };

      // Si el mensaje es del contacto seleccionado, agregarlo a la lista
      if (selectedContact === message.senderId) {
        setMessages((prev) => [...prev, decryptedMessage]);
      }

      // Actualizar la lista de contactos si es un nuevo contacto
      if (!contacts.includes(message.senderId)) {
        setContacts((prev) => [...prev, message.senderId]);
      }
    } catch (error) {
      console.error('Error procesando mensaje recibido:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || !stompClient || !connected) {
      console.log('❌ No se puede enviar mensaje');
      return;
    }

    try {
      // Obtener la clave pública del receptor
      let recipientPublicKey;
      try {
        const response = await chatAPI.getPublicKey(selectedContact);
        if (response.data.success && response.data.publicKey) {
          const publicJwk = JSON.parse(response.data.publicKey);
          recipientPublicKey = await importPublicKey(publicJwk);
          console.log('🔑 Clave pública del receptor obtenida');
        }
      } catch (error) {
        console.warn('⚠️ No se pudo obtener la clave del receptor, usando clave propia (fallback inseguro)');
      }

      // Si no se pudo obtener, usar la propia (para desarrollo/fallback)
      if (!recipientPublicKey) {
         recipientPublicKey = keyPair.publicKey;
      }

      // Encriptar el mensaje para el RECEPTOR
      const encryptedForReceiver = await encryptMessage(newMessage, recipientPublicKey);

      // Encriptar el mensaje para MÍ MISMO (para poder leerlo en el historial)
      const encryptedForSender = await encryptMessage(newMessage, keyPair.publicKey);

      const chatMessage = {
        senderId: currentUser,
        receiverId: selectedContact,
        encryptedContent: encryptedForReceiver,
        encryptedContentSender: encryptedForSender,
        timestamp: new Date().toISOString(),
        status: 'SENT',
      };

      // Enviar vía WebSocket
      stompClient.send('/app/chat.sendMessage', {}, JSON.stringify(chatMessage));

      // Agregar a la lista local (ya encriptado)
      const localMessage = {
        ...chatMessage,
        decryptedContent: newMessage,
        id: Date.now().toString(),
      };

      setMessages((prev) => [...prev, localMessage]);
      setNewMessage('');
      console.log('✅ Mensaje enviado');
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addNewContact = () => {
    if (newContactEmail.trim() && !contacts.includes(newContactEmail)) {
      setContacts((prev) => [...prev, newContactEmail]);
      setSelectedContact(newContactEmail);
      setNewContactEmail('');
      setShowAddContact(false);
      console.log('✅ Nuevo contacto agregado:', newContactEmail);
    }
  };

  const handleAddContactKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNewContact();
    }
  };

  return (
    <div className="chat-overlay" onClick={onClose}>
      <div className="chat-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-content">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>Chat Seguro</h2>
            {connected && <span className="status-indicator"></span>}
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="chat-body">
          {/* Sidebar - Lista de contactos */}
          <div className="chat-sidebar">
            <div className="sidebar-header">
              <h3>Contactos</h3>
              <button 
                className="add-contact-button" 
                onClick={() => setShowAddContact(!showAddContact)}
                title="Agregar contacto"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            
            {showAddContact && (
              <div className="add-contact-form">
                <input
                  type="email"
                  className="add-contact-input"
                  placeholder="correo@ejemplo.com"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  onKeyPress={handleAddContactKeyPress}
                />
                <button className="confirm-add-button" onClick={addNewContact}>
                  Agregar
                </button>
              </div>
            )}
            
            <div className="contacts-list">
              {loading ? (
                <div className="loading">Cargando...</div>
              ) : contacts.length === 0 ? (
                <div className="empty-state">No hay contactos aún</div>
              ) : (
                contacts.map((contact) => (
                  <div
                    key={contact}
                    className={`contact-item ${selectedContact === contact ? 'active' : ''}`}
                    onClick={() => setSelectedContact(contact)}
                  >
                    <div className="contact-avatar">
                      {contact.charAt(0).toUpperCase()}
                    </div>
                    <div className="contact-info">
                      <div className="contact-name">{contact.split('@')[0]}</div>
                      <div className="contact-email">{contact}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Área de mensajes */}
          <div className="chat-main">
            {!selectedContact ? (
              <div className="empty-conversation">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p>Selecciona un contacto para iniciar una conversación</p>
              </div>
            ) : (
              <>
                {/* Header de conversación */}
                <div className="conversation-header">
                  <div className="contact-avatar">
                    {selectedContact.charAt(0).toUpperCase()}
                  </div>
                  <div className="contact-info">
                    <div className="contact-name">{selectedContact.split('@')[0]}</div>
                    <div className="contact-email">{selectedContact}</div>
                  </div>
                </div>

                {/* Mensajes */}
                <div className="messages-container">
                  {console.log('🎨 Renderizando mensajes:', messages.length)}
                  {messages.length === 0 ? (
                    <div className="empty-state">No hay mensajes aún</div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`message ${msg.senderId === currentUser ? 'sent' : 'received'}`}
                      >
                        <div className="message-bubble">
                          <div className="message-content">{msg.decryptedContent}</div>
                          <div className="message-time">
                            {new Date(msg.timestamp).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'America/Bogota' // Forzar zona horaria de Colombia (GMT-5)
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input de mensaje */}
                <div className="message-input-container">
                  <input
                    type="text"
                    className="message-input"
                    placeholder="Escribe un mensaje..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <button className="send-button" onClick={sendMessage}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;

// src/services/encryption.js

/**
 * Servicio de encriptación para mensajes del chat
 * Utiliza RSA-OAEP para la clave y AES-GCM para el contenido
 */

// Generar un par de claves RSA
export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  return keyPair;
}

// Exportar clave pública a formato JWK
export async function exportPublicKey(publicKey) {
  const exported = await window.crypto.subtle.exportKey('jwk', publicKey);
  return exported;
}

// Importar clave pública desde formato JWK
export async function importPublicKey(jwk) {
  const publicKey = await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt']
  );

  return publicKey;
}

// Generar clave AES para encriptar el mensaje
async function generateAESKey() {
  const key = await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );

  return key;
}

// Encriptar mensaje
export async function encryptMessage(message, recipientPublicKey) {
  try {
    // 1. Generar clave AES aleatoria
    const aesKey = await generateAESKey();

    // 2. Generar IV (Initialization Vector) aleatorio
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // 3. Encriptar el mensaje con AES-GCM
    const encodedMessage = new TextEncoder().encode(message);
    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      encodedMessage
    );

    // 4. Exportar la clave AES a formato raw
    const rawAESKey = await window.crypto.subtle.exportKey('raw', aesKey);

    // 5. Encriptar la clave AES con la clave pública RSA del receptor
    const encryptedKey = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      recipientPublicKey,
      rawAESKey
    );

    // 6. Convertir a Base64 para almacenamiento
    const encryptedData = {
      encryptedMessage: arrayBufferToBase64(encryptedContent),
      encryptedKey: arrayBufferToBase64(encryptedKey),
      iv: arrayBufferToBase64(iv),
    };

    return JSON.stringify(encryptedData);
  } catch (error) {
    console.error('Error encriptando mensaje:', error);
    throw error;
  }
}

// Desencriptar mensaje
export async function decryptMessage(encryptedData, privateKey) {
  try {
    const data = JSON.parse(encryptedData);

    // 1. Convertir de Base64 a ArrayBuffer
    const encryptedMessage = base64ToArrayBuffer(data.encryptedMessage);
    const encryptedKey = base64ToArrayBuffer(data.encryptedKey);
    const iv = base64ToArrayBuffer(data.iv);

    // 2. Desencriptar la clave AES con la clave privada RSA
    const rawAESKey = await window.crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
      },
      privateKey,
      encryptedKey
    );

    // 3. Importar la clave AES
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      rawAESKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['decrypt']
    );

    // 4. Desencriptar el mensaje con AES-GCM
    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      encryptedMessage
    );

    // 5. Decodificar el mensaje
    const message = new TextDecoder().decode(decryptedContent);

    return message;
  } catch (error) {
    console.error('Error desencriptando mensaje:', error);
    throw error;
  }
}

// Utilidades para conversión Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Guardar claves en localStorage (para desarrollo - en producción usar IndexedDB)
export function saveKeyPair(keyPair) {
  return window.crypto.subtle.exportKey('jwk', keyPair.privateKey).then((privateJwk) => {
    return window.crypto.subtle.exportKey('jwk', keyPair.publicKey).then((publicJwk) => {
      localStorage.setItem('chatPrivateKey', JSON.stringify(privateJwk));
      localStorage.setItem('chatPublicKey', JSON.stringify(publicJwk));
    });
  });
}

// Recuperar claves de localStorage
export async function loadKeyPair() {
  const privateJwk = JSON.parse(localStorage.getItem('chatPrivateKey'));
  const publicJwk = JSON.parse(localStorage.getItem('chatPublicKey'));

  if (!privateJwk || !publicJwk) {
    return null;
  }

  const privateKey = await window.crypto.subtle.importKey(
    'jwk',
    privateJwk,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['decrypt']
  );

  const publicKey = await window.crypto.subtle.importKey(
    'jwk',
    publicJwk,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt']
  );

  return { privateKey, publicKey };
}

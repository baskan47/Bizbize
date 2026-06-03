import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Message } from './types';

// ─── Web Crypto API E2EE Yardımcıları ───

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKey = enc.encode(secret.padEnd(32, '0').slice(0, 32)); // 256 bits
  return window.crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMessage(text: string, secret: string): Promise<string> {
  try {
    const key = await getCryptoKey(secret);
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(text)
    );
    
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    return JSON.stringify({ iv: ivBase64, data: encryptedBase64 });
  } catch (err) {
    console.error("Şifreleme hatası:", err);
    return text;
  }
}

export async function decryptMessage(payload: string, secret: string): Promise<string> {
  try {
    const parsed = JSON.parse(payload);
    if (!parsed.iv || !parsed.data) return payload;

    const key = await getCryptoKey(secret);
    const dec = new TextDecoder();
    
    const iv = new Uint8Array(atob(parsed.iv).split('').map(c => c.charCodeAt(0)));
    const encryptedData = new Uint8Array(atob(parsed.data).split('').map(c => c.charCodeAt(0)));
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );
    return dec.decode(decrypted);
  } catch (err) {
    return payload;
  }
}

// ─── Canlı Veritabanı ve Senkronizasyon ───

export async function saveMessageToDb(chatId: string, message: Message, secretKey: string = 'bizbize-default-secret') {
  const encryptedText = message.text ? await encryptMessage(message.text, secretKey) : '';
  const messageData = {
    ...message,
    text: encryptedText,
    isEncrypted: true,
    serverTimestamp: new Date().toISOString()
  };

  if (db) {
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      return;
    } catch (error) {
      console.error("Firestore kaydetme hatası:", error);
    }
  }

  const localHistoryKey = `bizbize_history_${chatId}`;
  const localHistory = JSON.parse(localStorage.getItem(localHistoryKey) || '[]');
  localHistory.push(messageData);
  localStorage.setItem(localHistoryKey, JSON.stringify(localHistory));
}

export function subscribeToMessages(
  chatId: string, 
  secretKey: string = 'bizbize-default-secret', 
  onUpdate: (messages: Message[]) => void
) {
  if (db) {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );
    
    return onSnapshot(q, async (snapshot) => {
      const msgs: Message[] = [];
      for (const doc of snapshot.docs) {
        const data = doc.data() as any;
        if (data.isEncrypted && data.text) {
          data.text = await decryptMessage(data.text, secretKey);
        }
        msgs.push(data);
      }
      onUpdate(msgs);
    }, (error) => {
      console.error("Firestore dinleme hatası:", error);
    });
  }

  const localHistoryKey = `bizbize_history_${chatId}`;
  const loadLocal = async () => {
    const localHistory = JSON.parse(localStorage.getItem(localHistoryKey) || '[]');
    const decryptedList: Message[] = [];
    for (const msg of localHistory) {
      const copy = { ...msg };
      if (copy.isEncrypted && copy.text) {
        copy.text = await decryptMessage(copy.text, secretKey);
      }
      decryptedList.push(copy);
    }
    onUpdate(decryptedList);
  };

  loadLocal();
  const timer = setInterval(loadLocal, 1500);

  return () => clearInterval(timer);
}

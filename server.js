import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// Create HTTP server
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('bizbize WebRTC Sinyallesme Sunucusu Aktif\n');
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Track active connections by user phone number or ID
const clients = new Map();

console.log('Sinyalleşme sunucusu başlatılıyor...');

wss.on('connection', (ws) => {
  let clientId = '';

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'register':
          clientId = data.userId;
          clients.set(clientId, ws);
          console.log(`Kullanıcı kaydedildi: ${clientId}`);
          break;

        case 'offer':
        case 'answer':
        case 'candidate':
          // Relay WebRTC negotiation data to target user
          const targetWs = clients.get(data.targetId);
          if (targetWs && targetWs.readyState === 1) { // 1 is WebSocket.OPEN
            targetWs.send(JSON.stringify({
              ...data,
              senderId: clientId
            }));
          } else {
            console.log(`Hedef bulunamadı veya bağlantı kapalı: ${data.targetId}`);
            ws.send(JSON.stringify({ type: 'error', message: 'Hedef kullanıcı çevrimdışı.' }));
          }
          break;

        case 'hangup':
          const peerWs = clients.get(data.targetId);
          if (peerWs && peerWs.readyState === 1) {
            peerWs.send(JSON.stringify({ type: 'hangup', senderId: clientId }));
          }
          break;

        default:
          console.log('Bilinmeyen mesaj tipi:', data.type);
      }
    } catch (err) {
      console.error('Mesaj işleme hatası:', err);
    }
  });

  ws.on('close', () => {
    if (clientId) {
      clients.delete(clientId);
      console.log(`Bağlantı kapandı: ${clientId}`);
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Sinyalleşme sunucusu port ${PORT} üzerinde dinleniyor`);
});

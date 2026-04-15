import io from 'socket.io-client';

// On utilise la même IP que l'API mais sans le suffixe /api
const SOCKET_URL = 'http://192.168.1.20:12000';

const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('🔌 Connecté au serveur WebSocket');
});

socket.on('disconnect', () => {
  console.log('🔌 Déconnecté du serveur WebSocket');
});

export const subscribeToCrowdUpdates = (callback) => {
  socket.on('gym_crowd_updated', callback);
  return () => {
    socket.off('gym_crowd_updated', callback);
  };
};

export default socket;

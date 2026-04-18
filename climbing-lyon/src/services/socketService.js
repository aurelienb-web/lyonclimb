import { io } from 'socket.io-client';

// On utilise la même IP que l'API mais sans le suffixe /api
const SOCKET_URL = 'https://lyonclimb.onrender.com';

const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'], // Ajout de polling pour plus de compatibilité
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

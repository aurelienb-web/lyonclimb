//const SOCKET_URL = 'http://192.168.1.11:12000';
//const SOCKET_URL = 'http://192.168.1.20:12000';

import { supabase } from './supabaseClient';

export const subscribeToCrowdUpdates = (callback) => {
  // On utilise un ID unique pour le canal pour éviter les conflits si plusieurs composants s'abonnent
  const channelId = `gym-updates-${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'gyms',
      },
      (payload) => {
        console.log('Change received!', payload);
        // On renvoie un objet compatible avec l'ancien socket.io
        callback({
          gymId: payload.new.id,
          crowdLevel: payload.new.crowdLevel
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export default {
  subscribeToCrowdUpdates
};

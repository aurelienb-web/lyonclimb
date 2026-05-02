//const SOCKET_URL = 'http://192.168.1.11:12000';
//const SOCKET_URL = 'http://192.168.1.20:12000';

import { supabase } from './supabaseClient';

export const subscribeToCrowdUpdates = (callback) => {
  // On écoute les changements sur la table 'gyms'
  // car notre trigger SQL met à jour 'crowdLevel' automatiquement
  const channel = supabase
    .channel('public:gyms')
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

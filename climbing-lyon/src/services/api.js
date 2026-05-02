//const API_BASE_URL = 'http://192.168.1.11:12000/api';
//const API_BASE_URL = 'http://192.168.1.20:12000/api';

import { supabase } from './supabaseClient';

// Gyms
export const getGyms = async () => {
  // On utilise la vue 'gyms_with_crowd' pour avoir les moyennes calculées
  const { data, error } = await supabase
    .from('gyms_with_crowd')
    .select('*');

  if (error) throw error;
  return data;
};

export const getGym = async (id, userId = null) => {
  // Détails de la salle avec affluence calculée
  const { data: gym, error } = await supabase
    .from('gyms_with_crowd')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  // Récupérer la dernière contribution de l'utilisateur
  let userLastContribution = null;
  if (userId) {
    const { data: userUpdates } = await supabase
      .from('crowdUpdates')
      .select('crowdLevel')
      .eq('gymId', id)
      .eq('userId', userId)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (userUpdates && userUpdates.length > 0) {
      userLastContribution = userUpdates[0].crowdLevel;
    }
  }

  return {
    ...gym,
    userLastContribution
  };
};

// Device-based auth
export const registerDevice = async (deviceId, deviceName) => {
  // Vérifier si l'utilisateur existe
  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('deviceId', deviceId)
    .single();

  if (!user) {
    const newUser = {
      id: deviceId,
      deviceId,
      name: deviceName || 'Appareil'
    };
    const { data: insertedUser, error } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (error) throw error;
    user = insertedUser;
  }

  return { user, message: 'Appareil enregistré' };
};

// Subscriptions
export const subscribe = async (userId, gymId) => {
  const subscription = {
    id: Math.random().toString(36).substring(2, 15), // Simple ID generator
    userId,
    gymId
  };

  const { data, error } = await supabase
    .from('subscriptions')
    .insert([subscription])
    .select()
    .single();

  if (error) throw error;
  return { subscription: data, message: 'Abonnement créé' };
};

export const unsubscribe = async (userId, gymId) => {
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('userId', userId)
    .eq('gymId', gymId);

  if (error) throw error;
  return { message: 'Désabonnement effectué' };
};

export const getUserSubscriptions = async (userId) => {
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('gymId')
    .eq('userId', userId);

  if (subError) throw subError;
  if (!subscriptions || subscriptions.length === 0) return [];

  const gymIds = subscriptions.map(s => s.gymId);
  const { data: subscribedGyms, error: gymError } = await supabase
    .from('gyms_with_crowd')
    .select('*')
    .in('id', gymIds);

  if (gymError) throw gymError;
  return subscribedGyms || [];
};

// Crowd updates
export const updateCrowdLevel = async (gymId, userId, crowdLevel) => {
  const update = {
    id: Math.random().toString(36).substring(2, 15),
    gymId,
    userId,
    crowdLevel: Number(crowdLevel)
  };

  const { error } = await supabase
    .from('crowdUpdates')
    .insert([update]);

  if (error) throw error;

  // On récupère les infos à jour de la salle pour retourner un objet compatible
  const updatedGym = await getGym(gymId, userId);
  return { gym: updatedGym, message: 'Affluence mise à jour' };
};

export const getGymCrowdHistory = async (gymId, date = null) => {
  const targetDateStr = date || new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: updates } = await supabase
    .from('crowdUpdates')
    .select('*')
    .eq('gymId', gymId)
    .gte('timestamp', sevenDaysAgo);

  const { data: plannedVisits } = await supabase
    .from('plannedVisits')
    .select('*')
    .eq('gymId', gymId)
    .eq('visitDate', targetDateStr);

  return {
    updates: updates || [],
    plannedVisits: plannedVisits || []
  };
};

export const registerVisitSlot = async (gymId, userId, slot) => {
  const targetDate = slot.date || new Date().toISOString().split('T')[0];

  // Supprimer l'ancien créneau si existant
  await supabase
    .from('plannedVisits')
    .delete()
    .eq('userId', userId)
    .eq('gymId', gymId)
    .eq('visitDate', targetDate);

  const visit = {
    id: Math.random().toString(36).substring(2, 15),
    gymId,
    userId,
    arrivalTime: slot.arrivalTime,
    duration: slot.duration,
    visitDate: targetDate
  };

  const { data, error } = await supabase
    .from('plannedVisits')
    .insert([visit])
    .select()
    .single();

  if (error) throw error;
  return { visit: data, message: 'Visite planifiée enregistrée' };
};

export default {
  getGyms,
  getGym,
  registerDevice,
  subscribe,
  unsubscribe,
  getUserSubscriptions,
  updateCrowdLevel,
  getGymCrowdHistory,
  registerVisitSlot
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin } from '../services/api';
import { registerPushToken } from '../services/api';
import { registerForPushNotificationsAsync } from '../services/notificationService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [pushToken, setPushToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  /**
   * Register the push token for a given user and persist it.
   * Safe to call on web or simulator (notificationService guards those cases).
   */
  const registerToken = async (userId) => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        setPushToken(token);
        await AsyncStorage.setItem('pushToken', token);
        await registerPushToken(userId, token);
        console.log('✅ Push token enregistré avec succès');
      }
    } catch (err) {
      console.warn('⚠️ Enregistrement push token échoué:', err.message);
    }
  };

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        // Always re-register token on app start in case it changed
        // (tokens can rotate; this is also when we ask for permissions the first time)
        await registerToken(parsedUser.id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email) => {
    try {
      const response = await apiLogin(email);
      setUser(response.user);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));

      // Register push token after fresh login
      await registerToken(response.user.id);

      return { success: true, user: response.user };
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('pushToken');
      setUser(null);
      setPushToken(null);
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, pushToken, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};


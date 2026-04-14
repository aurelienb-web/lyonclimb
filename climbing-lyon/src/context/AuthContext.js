import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { registerDevice } from '../services/api';

const AuthContext = createContext(null);

// Generate a stable unique ID for this device
const generateDeviceId = () => {
  const random = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now().toString(36);
  return `dev_${timestamp}_${random}`;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initDeviceUser();
  }, []);

  const initDeviceUser = async () => {
    try {
      // Try to load existing device user from storage
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setLoading(false);
        return;
      }

      // First launch: create a new device ID
      let deviceId = await AsyncStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = generateDeviceId();
        await AsyncStorage.setItem('deviceId', deviceId);
      }

      // Build a friendly device name
      const deviceName = Device.deviceName || Device.modelName || 'Appareil';

      // Register device on the backend
      const response = await registerDevice(deviceId, deviceName);
      setUser(response.user);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'appareil:', error);
      // Fallback: create a local-only user so the app still works offline
      try {
        let deviceId = await AsyncStorage.getItem('deviceId');
        if (!deviceId) {
          deviceId = generateDeviceId();
          await AsyncStorage.setItem('deviceId', deviceId);
        }
        const fallbackUser = {
          id: deviceId,
          name: 'Mon appareil',
          deviceId,
          createdAt: new Date().toISOString(),
        };
        setUser(fallbackUser);
        await AsyncStorage.setItem('user', JSON.stringify(fallbackUser));
      } catch (e) {
        console.error('Erreur fallback:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  // Exposed for manual refresh if needed
  const refreshUser = async () => {
    await initDeviceUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
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

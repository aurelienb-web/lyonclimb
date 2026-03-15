import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

// Configure how notifications are displayed when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request permission and return the Expo push token.
 * Returns null on web, simulators, or if permission is denied.
 */
export async function registerForPushNotificationsAsync() {
  // Push notifications only work on native devices, not on web or simulators
  if (Platform.OS === 'web') {
    console.log('⚠️ Push notifications non supportées sur web');
    return null;
  }

  if (!Device.isDevice) {
    console.log('⚠️ Push notifications uniquement sur appareil physique (pas simulateur)');
    return null;
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('⚠️ Permission push notifications refusée');
    return null;
  }

  let token = null;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    token = tokenData.data;
    console.log('📱 Expo push token obtenu:', token);
  } catch (error) {
    console.log('⚠️ Impossible d\'obtenir le token push:', error.message);
    return null;
  }

  // On Android, a notification channel is required
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'LyonClimb',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#e74c3c',
    });
  }

  return token;
}

/**
 * Setup a listener that navigates to the gym when the user taps a notification.
 * Returns a cleanup function to remove the listener.
 */
export function setupNotificationListener(navigation) {
  if (Platform.OS === 'web') return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    if (data?.gymId) {
      navigation.navigate('Salles', {
        screen: 'GymDetail',
        params: { gymId: data.gymId, gymName: data.gymName },
      });
    }
  });

  return () => subscription.remove();
}


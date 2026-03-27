import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

// Show notifications even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permissions and register the device push token
 * with the backend.  Should be called once after a successful login.
 *
 * Returns the Expo push token string, or null if permissions were denied.
 */
export async function registerForPushNotifications() {
  try {
    // Physical device check (simulators can't receive real push)
    // We still allow simulators so devs can test the token-save flow
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted');
      return null;
    }

    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'MLB162',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C4912A',
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    // Persist the token on the backend so the server can send notifications
    await api.put('/auth/push-token', { pushToken });

    console.log('[Notifications] Registered push token:', pushToken);
    return pushToken;
  } catch (err) {
    // Never crash the app over notification registration
    console.warn('[Notifications] Registration failed:', err.message);
    return null;
  }
}

/**
 * Add a listener that fires when the user taps a notification.
 * Returns a subscription that must be removed on unmount.
 *
 * @param {function} handler - receives the notification response object
 */
export function addNotificationResponseListener(handler) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Add a listener that fires when a notification is received while the app
 * is in the foreground.
 *
 * @param {function} handler - receives the notification object
 */
export function addNotificationReceivedListener(handler) {
  return Notifications.addNotificationReceivedListener(handler);
}

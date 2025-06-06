// app/services/notificationService.ts

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  
  // Step 1: Request basic permissions
  async requestPermissions(): Promise<boolean> {
    try {
      console.log('Requesting notification permissions...');
      
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('Permission status:', status);
      
      if (status !== 'granted') {
        console.log('Permission denied');
        return false;
      }

      // Setup Android channel if needed
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      console.log('Permissions granted and configured');
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  }

  // Step 2: Trigger immediate notification (for testing)
  async triggerImmediateNotification(): Promise<void> {
    try {
      console.log('Triggering immediate notification...');
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification 🎯',
          body: 'This is working! Notification triggered immediately.',
          sound: true,
        },
        trigger: null, // null = immediate
      });
      
      console.log('Immediate notification triggered');
    } catch (error) {
      console.error('Error triggering notification:', error);
      throw error;
    }
  }

  // Step 3: Schedule notification for a few seconds later
  async scheduleDelayedNotification(seconds: number = 5): Promise<void> {
    try {
      console.log(`Scheduling notification for ${seconds} seconds...`);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Delayed Test 🎯',
          body: `This notification was scheduled ${seconds} seconds ago!`,
          sound: true,
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: seconds 
        },
      });
      
      console.log(`Notification scheduled for ${seconds} seconds`);
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  // Helper: Check current permissions
  async checkPermissions(): Promise<string> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return 'unknown';
    }
  }

  // Helper: Cancel all notifications
  async cancelAll(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }
}

export const notificationService = new NotificationService();
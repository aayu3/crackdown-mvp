// app/services/notificationService.ts

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DayOfWeek, Goal, GoalNotificationTimes } from '../types/goals';

// Configure how notifications appear when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {

  async checkPermissions(): Promise<string> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return 'unknown';
    }
  }

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
          data: { type: 'immediate_test' },
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
          data: { type: 'delayed_test', scheduledAt: new Date().toISOString() },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: seconds,
        },
      });
      
      console.log(`Notification scheduled for ${seconds} seconds`);
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  // Helper: Get all scheduled notifications with detailed info
  async getScheduledNotifications(): Promise<any[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('\n=== 📋 SCHEDULED NOTIFICATIONS DEBUG ===');
      console.log(`Total scheduled: ${notifications.length}`);
      
      if (notifications.length === 0) {
        console.log('📭 No notifications currently scheduled');
        console.log('=== END DEBUG ===\n');
        return notifications;
      }
      
      notifications.forEach((notification, index) => {
        const trigger = notification.trigger as any;
        const data = notification.content.data || {};
        
        console.log(`\n${index + 1}. 📄 NOTIFICATION`);
        console.log(`   📝 Title: ${notification.content.title}`);
        console.log(`   💬 Body: ${notification.content.body}`);
        console.log(`   🏷️ Type: ${data.type || 'unknown'}`);
        console.log(`   🆔 ID: ${notification.identifier}`);
        
        if (data.goalName) {
          console.log(`   🎯 Goal: ${data.goalName}`);
        }
        
        if (trigger.type === 'timeInterval') {
          const fireTime = new Date(Date.now() + (trigger.seconds * 1000));
          console.log(`   ⏰ Fires in: ${trigger.seconds} seconds (${fireTime.toLocaleTimeString()})`);
        } else if (trigger.type === 'calendar') {
          console.log(`   ⏰ Fires at: ${trigger.dateComponents?.hour || '?'}:${trigger.dateComponents?.minute?.toString().padStart(2, '0') || '??'}`);
          console.log(`   📅 Weekday: ${trigger.dateComponents?.weekday || 'Any'}`);
          console.log(`   🔄 Repeats: ${trigger.repeats ? 'Yes' : 'No'}`);
        }
        
        console.log('   ---');
      });
      
      console.log('=== END DEBUG ===\n');
      return notifications;
    } catch (error) {
      console.error('❌ Error getting scheduled notifications:', error);
      return [];
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

  // Convert DayOfWeek to iOS weekday format (1=Sunday, 2=Monday, etc.)
  private convertToiOSWeekday(dayOfWeek: DayOfWeek): number {
    // Your DayOfWeek: 0=Sunday, 1=Monday, 2=Tuesday, etc.
    // iOS weekday: 1=Sunday, 2=Monday, 3=Tuesday, etc.
    return dayOfWeek + 1;
  }

  // Get day name for logging
  private getDayName(dayOfWeek: DayOfWeek): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  }

  // Schedule goal notifications at specific times for specific days (FIXED VERSION)
  async scheduleGoalNotifications(goals: Goal[]): Promise<void> {
    try {
      console.log('🎯 Starting to schedule goal notifications...');
      console.log(`📊 Total goals to process: ${goals.length}`);
      
      // Cancel existing goal notifications first
      await this.cancelGoalNotifications();
      
      let scheduledCount = 0;
      
      for (const goal of goals) {
        console.log(`\n📝 Processing goal: "${goal.goal_name}"`);
        console.log(`   Active: ${goal.active}`);
        console.log(`   Daily reminders: ${goal.daily_reminders}`);
        console.log(`   Repeat days: [${goal.repeat.map(d => this.getDayName(d)).join(', ')}]`);
        
        if (!goal.active) {
          console.log(`   ⏭️ Skipping - Goal is inactive`);
          continue;
        }
        
        if (goal.daily_reminders === 0) {
          console.log(`   ⏭️ Skipping - No reminders set`);
          continue;
        }

        if (goal.repeat.length === 0) {
          console.log(`   ⏭️ Skipping - No repeat days set`);
          continue;
        }
        
        // Get notification times for this goal
        const times = this.getGoalNotificationTimes(goal);
        console.log(`   ⏰ Notification times:`, times);
        
        if (times.length === 0) {
          console.log(`   ❌ No notification times found for goal`);
          continue;
        }

        // Schedule notifications for each day of the week and each time slot
        for (const dayOfWeek of goal.repeat) {
          const dayName = this.getDayName(dayOfWeek);
          console.log(`\n   📅 Scheduling for ${dayName}:`);
          
          for (let timeIndex = 0; timeIndex < times.length; timeIndex++) {
            const timeSlot = times[timeIndex];
            const message = this.getReminderForTimeSlot(goal, timeIndex);
            
            console.log(`\n     ⏰ Time slot ${timeIndex + 1}/${times.length}:`);
            console.log(`        Time: ${timeSlot.hour}:${timeSlot.minute.toString().padStart(2, '0')}`);
            console.log(`        Label: ${timeSlot.label}`);
            console.log(`        Message: ${message}`);
            
            try {
              const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                  title: `${goal.icon || '🎯'} ${goal.goal_name}`,
                  body: message,
                  sound: true,
                  data: { 
                    type: 'goal_reminder',
                    goalId: goal.id,
                    goalName: goal.goal_name,
                    timeSlot: timeSlot.label,
                    timeSlotIndex: timeIndex,
                    dayOfWeek: dayOfWeek,
                    dayName: dayName
                  },
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                  hour: timeSlot.hour,
                  minute: timeSlot.minute,
                  weekday: this.convertToiOSWeekday(dayOfWeek), // This is the key fix!
                },
              });

              console.log(`        ✅ Scheduled with ID: ${notificationId}`);
              scheduledCount++;
            } catch (scheduleError) {
              console.log(`        ❌ Failed to schedule: ${scheduleError}`);
            }
          }
        }
      }
      
      console.log(`\n🎉 Successfully scheduled ${scheduledCount} goal notifications!`);
      
      // Debug: Show what was actually scheduled
      await this.getScheduledNotifications();
      
    } catch (error) {
      console.error('❌ Error scheduling goal notifications:', error);
      throw error;
    }
  }

  // Helper method to get notification times for a goal
  private getGoalNotificationTimes(goal: Goal): GoalNotificationTimes[] {
    // If goal has custom notification times, use those
    if (goal.notification_times && goal.notification_times.length === goal.daily_reminders) {
      console.log(`   📋 Using custom notification times for goal`);
      return goal.notification_times;
    }
    
    // Otherwise, fall back to default schedule
    console.log(`   📋 Using default notification schedule for frequency ${goal.daily_reminders}`);
    const defaultSchedules: Record<0 | 1 | 2 | 3, GoalNotificationTimes[]> = {
      0: [],
      1: [{ hour: 12, minute: 0, label: 'Midday Check-in' }],
      2: [
        { hour: 10, minute: 0, label: 'Morning Motivation' },
        { hour: 15, minute: 0, label: 'Afternoon Push' }
      ],
      3: [
        { hour: 9, minute: 0, label: 'Morning Start' },
        { hour: 12, minute: 0, label: 'Midday Check-in' },
        { hour: 16, minute: 0, label: 'Afternoon Finish' }
      ]
    };
    
    const key = [0, 1, 2, 3].includes(goal.daily_reminders) ? goal.daily_reminders as 0 | 1 | 2 | 3 : 0;
    return defaultSchedules[key];
  }

  // Helper method to get reminder message for a time slot
  private getReminderForTimeSlot(goal: Goal, timeSlotIndex: number): string {
    // If goal has custom reminders, use those
    if (goal.reminders && timeSlotIndex >= 0 && timeSlotIndex < goal.reminders.length) {
      return goal.reminders[timeSlotIndex];
    }
    
    // Fallback to default message
    return `Time to work on "${goal.goal_name}"!`;
  }

  // Cancel goal-specific notifications
  async cancelGoalNotifications(): Promise<void> {
    try {
      console.log('🧹 Cancelling existing goal notifications...');
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      let cancelledCount = 0;
      for (const notification of scheduledNotifications) {
        const data = notification.content.data;
        if (data?.type === 'goal_reminder') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          cancelledCount++;
        }
      }
      
      console.log(`✅ Cancelled ${cancelledCount} existing goal notifications`);
    } catch (error) {
      console.error('❌ Error cancelling goal notifications:', error);
    }
  }

  // Cancel notifications for a specific goal
  async cancelGoalNotification(goalId: string): Promise<void> {
    try {
      console.log(`🗑️ Cancelling notifications for goal: ${goalId}`);
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      let cancelledCount = 0;
      for (const notification of scheduledNotifications) {
        const data = notification.content.data;
        if (data?.type === 'goal_reminder' && data?.goalId === goalId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          cancelledCount++;
        }
      }
      
      console.log(`✅ Cancelled ${cancelledCount} notifications for goal ${goalId}`);
    } catch (error) {
      console.error(`❌ Error cancelling notifications for goal ${goalId}:`, error);
    }
  }

  // Reschedule notifications for a single goal (useful when goal is updated)
  async rescheduleGoalNotification(goal: Goal): Promise<void> {
    try {
      console.log(`🔄 Rescheduling notifications for goal: "${goal.goal_name}"`);
      
      // First cancel existing notifications for this goal
      await this.cancelGoalNotification(goal.id);
      
      // Then schedule new ones if goal is active
      if (goal.active && goal.daily_reminders > 0 && goal.repeat.length > 0) {
        await this.scheduleGoalNotifications([goal]);
      } else {
        console.log(`⏭️ Goal "${goal.goal_name}" is inactive or has no reminders/repeat days - skipping scheduling`);
      }
      
    } catch (error) {
      console.error(`❌ Error rescheduling notifications for goal "${goal.goal_name}":`, error);
    }
  }
}

export const notificationService = new NotificationService();
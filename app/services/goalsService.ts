// app/services/goalsService.ts

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import {
  DayOfWeek,
  generateDefaultNotificationTimes,
  generateDefaultReminders,
  Goal,
  GoalNotificationFrequency,
  GoalNotificationTimes,
  GoalType
} from '../types/goals';
import { notificationService } from './notificationService';

class GoalsService {

  // Generate custom reminder messages using the API
  private async generateCustomReminders(
    goalName: string,
    notificationTimes: GoalNotificationTimes[]
  ): Promise<string[]> {
    try {
      console.log('🤖 Generating custom reminders for goal:', goalName);
      
      // Format times as HH:MM for the API
      const times = notificationTimes.map(time => {
        const hour = time.hour.toString().padStart(2, '0');
        const minute = time.minute.toString().padStart(2, '0');
        return `${hour}:${minute}`;
      });

      const requestBody = {
        tasks: goalName,
        times: times
      };

      console.log('📤 API Request:', requestBody);

      const response = await fetch('http://localhost:8080/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📥 API Response:', data);

      if (data.reminders && Array.isArray(data.reminders)) {
        console.log('✅ Custom reminders generated successfully');
        return data.reminders;
      } else {
        throw new Error('Invalid API response format');
      }

    } catch (error) {
      console.error('❌ Error generating custom reminders:', error);
      console.log('🔄 Falling back to default reminders');
      
      // Fallback to default reminders if API fails
      return generateDefaultReminders(
        goalName,
        'task', // Default to task type for fallback
        notificationTimes.length as GoalNotificationFrequency
      );
    }
  }
  
  // Get all goals for a user
  async getUserGoals(userId: string): Promise<Goal[]> {
    try {
      const goalsRef = collection(db, 'users', userId, 'goals');
      const q = query(goalsRef, orderBy('created_date', 'asc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Goal));
    } catch (error) {
      console.error('Error getting user goals:', error);
      return [];
    }
  }

  // Get active goals for a user
  async getActiveGoals(userId: string): Promise<Goal[]> {
    try {
      const goalsRef = collection(db, 'users', userId, 'goals');
      const q = query(
        goalsRef, 
        where('active', '==', true),
        orderBy('created_date', 'asc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Goal));
    } catch (error) {
      console.error('Error getting active goals:', error);
      return [];
    }
  }

  // Schedule notifications for a specific goal
  private async scheduleNotificationsForGoal(goal: Goal): Promise<void> {
    try {
      console.log('🔔 Scheduling notifications for goal:', goal.goal_name);
      
      // Check notification permissions first
      const permissionStatus = await notificationService.checkPermissions();
      if (permissionStatus !== 'granted') {
        console.log('⚠️ Notification permissions not granted, skipping scheduling');
        return;
      }

      // Only schedule if goal is active and has reminders
      if (goal.active && goal.daily_reminders > 0 && goal.repeat.length > 0) {
        await notificationService.rescheduleGoalNotification(goal);
        console.log('✅ Notifications scheduled for goal:', goal.goal_name);
      } else {
        console.log('⏭️ Goal is inactive or has no reminders - skipping scheduling');
      }
    } catch (error) {
      console.error('❌ Error scheduling notifications for goal:', error);
      // Don't throw error - goal operations should succeed even if notifications fail
    }
  }

  // Create a new goal
  async createGoal(
    userId: string,
    goalData: {
      goal_name: string;
      goal_type: GoalType;
      target_count: number | null;
      icon?: string;
      repeat: DayOfWeek[];
      daily_reminders?: GoalNotificationFrequency;
      notification_times?: GoalNotificationTimes[];
    }
  ): Promise<string> {
    try {
      const now = Timestamp.now();
      const frequency = goalData.daily_reminders || 1;
      
      // Use custom times if provided, otherwise use defaults
      const notificationTimes = goalData.notification_times || 
        generateDefaultNotificationTimes(frequency);

      // Generate custom reminders using the API
      let reminders: string[];
      if (frequency > 0 && notificationTimes.length > 0) {
        reminders = await this.generateCustomReminders(goalData.goal_name, notificationTimes);
      } else {
        reminders = [];
      }

      const goal: Omit<Goal, 'id'> = {
        user_id: userId,
        goal_name: goalData.goal_name,
        goal_type: goalData.goal_type,
        target_count: goalData.goal_type === 'incremental' ? (goalData.target_count || 1) : null,
        active: true,
        icon: goalData.icon || null,
        created_date: now,
        repeat: goalData.repeat,
        goal_streak: 0,
        total_completions: 0,
        day_count: 0,
        completed: false,
        last_day_completed: null,
        daily_reminders: frequency,
        reminders: reminders,
        notification_times: notificationTimes,
      };

      const goalsRef = collection(db, 'users', userId, 'goals');
      const docRef = await addDoc(goalsRef, goal);
      
      console.log('🎯 Goal created with ID:', docRef.id);
      
      // Create the goal object with the new ID for notification scheduling
      const createdGoal: Goal = {
        id: docRef.id,
        ...goal
      };
      
      // Schedule notifications for just this goal
      await this.scheduleNotificationsForGoal(createdGoal);
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  }

  // Update a goal
  async updateGoal(
    userId: string,
    goalId: string,
    updates: Partial<Omit<Goal, 'id' | 'user_id' | 'created_date'>>
  ): Promise<void> {
    try {
      // Check if we need to regenerate reminders
      const needsReminderRegeneration = updates.daily_reminders !== undefined || 
        updates.notification_times !== undefined || 
        updates.goal_name !== undefined;

      // If daily_reminders is being updated, regenerate notification times and reminders
      if (updates.daily_reminders !== undefined) {
        const currentGoals = await this.getUserGoals(userId);
        const currentGoal = currentGoals.find(g => g.id === goalId);
        
        if (currentGoal) {
          // Also update notification times to match new frequency if not provided
          if (!updates.notification_times) {
            updates.notification_times = generateDefaultNotificationTimes(updates.daily_reminders);
          }
        }
      }

      // Generate new custom reminders if needed
      if (needsReminderRegeneration) {
        const currentGoals = await this.getUserGoals(userId);
        const currentGoal = currentGoals.find(g => g.id === goalId);
        
        if (currentGoal) {
          const goalName = updates.goal_name || currentGoal.goal_name;
          const frequency = updates.daily_reminders !== undefined ? updates.daily_reminders : currentGoal.daily_reminders;
          const notificationTimes = updates.notification_times || currentGoal.notification_times;

          if (frequency > 0 && notificationTimes && notificationTimes.length > 0) {
            console.log('🔄 Regenerating custom reminders for updated goal...');
            updates.reminders = await this.generateCustomReminders(goalName, notificationTimes);
          } else {
            updates.reminders = [];
          }
        }
      }

      const goalRef = doc(db, 'users', userId, 'goals', goalId);
      await updateDoc(goalRef, updates);
      
      console.log('📝 Goal updated:', goalId);
      
      // Check if notification-related fields were updated
      const notificationFieldsUpdated = updates.daily_reminders !== undefined || 
        updates.notification_times !== undefined || 
        updates.repeat !== undefined || 
        updates.active !== undefined ||
        updates.goal_name !== undefined ||
        updates.reminders !== undefined;
      
      if (notificationFieldsUpdated) {
        console.log('🔄 Notification settings changed, rescheduling this goal...');
        
        // Get the updated goal and reschedule just this goal
        const updatedGoals = await this.getUserGoals(userId);
        const updatedGoal = updatedGoals.find(g => g.id === goalId);
        
        if (updatedGoal) {
          await this.scheduleNotificationsForGoal(updatedGoal);
        }
      }
      
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  }

  // Toggle task completion
  async toggleTaskCompletion(userId: string, goalId: string): Promise<void> {
    try {
      const goals = await this.getUserGoals(userId);
      const goal = goals.find(g => g.id === goalId);
      
      if (!goal || goal.goal_type !== 'task') {
        throw new Error('Goal not found or not a task goal');
      }

      const now = Timestamp.now();
      const newCompleted = !goal.completed;
      
      const updates: Partial<Goal> = {
        completed: newCompleted,
        last_day_completed: newCompleted ? now : null,
      };

      // Update streak and total completions if completing
      if (newCompleted) {
        updates.goal_streak = goal.goal_streak + 1;
        updates.total_completions = goal.total_completions + 1;
      }

      await this.updateGoal(userId, goalId, updates);
    } catch (error) {
      console.error('Error toggling task completion:', error);
      throw error;
    }
  }

  // Update incremental goal count
  async updateIncrementalCount(
    userId: string, 
    goalId: string, 
    newCount: number
  ): Promise<void> {
    try {
      const goals = await this.getUserGoals(userId);
      const goal = goals.find(g => g.id === goalId);
      
      if (!goal || goal.goal_type !== 'incremental') {
        throw new Error('Goal not found or not an incremental goal');
      }

      const updates: Partial<Goal> = {
        day_count: Math.max(0, newCount), // Ensure count doesn't go below 0
      };

      // Check if target is reached
      if (goal.target_count && newCount >= goal.target_count) {
        updates.completed = true;
        updates.last_day_completed = Timestamp.now();
        updates.goal_streak = goal.goal_streak + 1;
        updates.total_completions = goal.total_completions + 1;
      } else {
        updates.completed = false;
      }

      await this.updateGoal(userId, goalId, updates);
    } catch (error) {
      console.error('Error updating incremental count:', error);
      throw error;
    }
  }

  // Delete a goal
  async deleteGoal(userId: string, goalId: string): Promise<void> {
    try {
      const goalRef = doc(db, 'users', userId, 'goals', goalId);
      await deleteDoc(goalRef);
      
      console.log('🗑️ Goal deleted:', goalId);
      
      // Cancel notifications for just this goal
      await notificationService.cancelGoalNotification(goalId);
      
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  }

  // Deactivate a goal (soft delete)
  async deactivateGoal(userId: string, goalId: string): Promise<void> {
    try {
      await this.updateGoal(userId, goalId, { active: false });
      console.log('⏸️ Goal deactivated:', goalId);
    } catch (error) {
      console.error('Error deactivating goal:', error);
      throw error;
    }
  }

  // Reactivate a goal
  async reactivateGoal(userId: string, goalId: string): Promise<void> {
    try {
      await this.updateGoal(userId, goalId, { 
        active: true,
        completed: false,
        day_count: 0 
      });
      console.log('▶️ Goal reactivated:', goalId);
    } catch (error) {
      console.error('Error reactivating goal:', error);
      throw error;
    }
  }

  // Reset daily progress (call this daily for all users)
  async resetDailyProgress(userId: string): Promise<void> {
    try {
      const activeGoals = await this.getActiveGoals(userId);
      const today = new Date().getDay() as DayOfWeek;
      
      for (const goal of activeGoals) {
        // Only reset if today is in the goal's repeat schedule
        if (goal.repeat.includes(today)) {
          await this.updateGoal(userId, goal.id, {
            completed: false,
            day_count: 0,
          });
        }
      }
      
      console.log('🔄 Daily progress reset for user:', userId);
    } catch (error) {
      console.error('Error resetting daily progress:', error);
      throw error;
    }
  }

  // Manual method to reschedule all notifications for a user (for bulk operations)
  async rescheduleAllNotifications(userId: string): Promise<void> {
    try {
      console.log('🔄 Manually rescheduling all notifications for user:', userId);
      
      // Check notification permissions first
      const permissionStatus = await notificationService.checkPermissions();
      if (permissionStatus !== 'granted') {
        console.log('⚠️ Notification permissions not granted, skipping scheduling');
        return;
      }

      const activeGoals = await this.getActiveGoals(userId);
      await notificationService.scheduleGoalNotifications(activeGoals);
      
      console.log('✅ All notifications rescheduled successfully');
    } catch (error) {
      console.error('Error manually rescheduling notifications:', error);
      throw error;
    }
  }
}

export const goalsService = new GoalsService();
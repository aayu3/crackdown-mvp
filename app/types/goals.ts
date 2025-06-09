// app/types/goals.ts
import { Timestamp } from 'firebase/firestore';

// Goal Type - extensible for future types
export type GoalType = 'task' | 'incremental';

// Days of the week (0 = Sunday, 6 = Saturday)
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Notification frequency for individual goals
export type GoalNotificationFrequency = 0 | 1 | 2 | 3;

// Goal Document (stored in Firestore)
export interface Goal {
  // Firestore document ID (not stored in document itself)
  id: string;
  
  // User reference
  user_id: string;
  
  // Basic goal info
  goal_name: string;
  goal_type: GoalType;
  target_count: number | null; // For incremental goals, daily target (null for task goals)
  active: boolean; // Is goal currently active
  icon: string | null; // Emoji/icon for UI (default null for simplicity)
  
  // Scheduling
  created_date: Timestamp;
  repeat: DayOfWeek[]; // e.g., [1, 2, 3, 4, 5] for weekdays
  
  // Progress tracking
  goal_streak: number;
  total_completions: number;
  
  // Daily state (resets based on date)
  day_count: number; // For incremental goals
  completed: boolean; // For task goals or when incremental target reached
  last_day_completed: Timestamp | null; // null if never completed
  
  // Notification settings
  daily_reminders: GoalNotificationFrequency; // 0-3 reminders per day for this specific goal
  reminders: string[]; // Pregenerated reminder messages (length matches daily_reminders)
  notification_times: GoalNotificationTimes[]; // Custom times set by user (length matches daily_reminders)
}

// Helper type for notification scheduling
export interface GoalNotificationTimes {
  hour: number;
  minute: number;
  label: string;
}

// Notification schedule configurations for goals
export const GOAL_NOTIFICATION_SCHEDULES: Record<GoalNotificationFrequency, GoalNotificationTimes[]> = {
  0: [], // No notifications for this goal
  1: [
    { hour: 12, minute: 0, label: 'Midday Check-in' }
  ],
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

// Helper function to get notification times for a goal (uses custom times if set, otherwise defaults)
export const getGoalNotificationTimes = (goal: Goal): GoalNotificationTimes[] => {
  // If goal has custom notification times, use those
  if (goal.notification_times && goal.notification_times.length === goal.daily_reminders) {
    return goal.notification_times;
  }
  
  // Otherwise, fall back to default schedule
  return GOAL_NOTIFICATION_SCHEDULES[goal.daily_reminders] || [];
};

// Helper function to get frequency description for goals
export const getGoalFrequencyDescription = (frequency: GoalNotificationFrequency): string => {
  switch (frequency) {
    case 0:
      return 'No reminders';
    case 1:
      return '1 reminder per day (12 PM)';
    case 2:
      return '2 reminders per day (10 AM, 3 PM)';
    case 3:
      return '3 reminders per day (9 AM, 12 PM, 4 PM)';
    default:
      return 'Unknown';
  }
};

// Helper function to generate goal-specific notification messages
export const generateGoalNotificationMessage = (
  goalName: string, 
  goalType: GoalType, 
  targetCount: number | null, 
  timeLabel: string
): string => {
  const goalEmoji = goalType === 'task' ? '✅' : '📊';
  
  // Simple message templates - could be replaced with AI-generated ones later
  const templates = {
    morning: [
      `${goalEmoji} Ready to tackle "${goalName}" today?`,
      `${goalEmoji} Morning! Time to work on "${goalName}"`,
      `${goalEmoji} Start strong with "${goalName}" today!`,
    ],
    midday: [
      `${goalEmoji} How's "${goalName}" going today?`,
      `${goalEmoji} Midday check: "${goalName}" progress time!`,
      `${goalEmoji} Half the day done - how about "${goalName}"?`,
    ],
    afternoon: [
      `${goalEmoji} Final push for "${goalName}" today!`,
      `${goalEmoji} Don't forget about "${goalName}" before evening!`,
      `${goalEmoji} Last chance to nail "${goalName}" today!`,
    ]
  };
  
  // Determine time category
  let timeCategory: keyof typeof templates = 'midday';
  if (timeLabel.toLowerCase().includes('morning') || timeLabel.toLowerCase().includes('start')) {
    timeCategory = 'morning';
  } else if (timeLabel.toLowerCase().includes('afternoon') || timeLabel.toLowerCase().includes('finish') || timeLabel.toLowerCase().includes('push')) {
    timeCategory = 'afternoon';
  }
  
  // Pick a random template
  const categoryTemplates = templates[timeCategory];
  const randomTemplate = categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
  
  return randomTemplate;
};

// Helper function to generate default reminder messages for a goal
export const generateDefaultReminders = (
  goalName: string,
  goalType: GoalType,
  frequency: GoalNotificationFrequency
): string[] => {
  if (frequency === 0) return [];
  
  const times = GOAL_NOTIFICATION_SCHEDULES[frequency] || [];
  const reminders: string[] = [];
  
  // Default fallback message for frequency 1
  if (frequency === 1) {
    return ["Still messing around? Better hop to it!"];
  }
  
  // For frequency 2 and 3, use the notification message generator
  for (let i = 0; i < frequency; i++) {
    if (i === 0 && frequency > 1) {
      // First reminder uses default sarcastic message
      reminders.push("Still messing around? Better hop to it!");
    } else {
      // Generate context-appropriate messages for other time slots
      const timeSlot = times[i];
      const message = generateGoalNotificationMessage(goalName, goalType, null, timeSlot.label);
      reminders.push(message);
    }
  }
  
  return reminders;
};

// Helper function to generate default notification times for a goal
export const generateDefaultNotificationTimes = (
  frequency: GoalNotificationFrequency
): GoalNotificationTimes[] => {
  return GOAL_NOTIFICATION_SCHEDULES[frequency] || [];
};

// Helper function to create notification times for testing (1 minute intervals from now)
export const generateTestNotificationTimes = (
  frequency: GoalNotificationFrequency
): GoalNotificationTimes[] => {
  if (frequency === 0) return [];
  
  const now = new Date();
  const times: GoalNotificationTimes[] = [];
  
  for (let i = 0; i < frequency; i++) {
    const testTime = new Date(now.getTime() + ((i + 1) * 60 * 1000)); // Each notification 1 minute apart
    times.push({
      hour: testTime.getHours(),
      minute: testTime.getMinutes(),
      label: `Test ${i + 1} (${testTime.getHours()}:${testTime.getMinutes().toString().padStart(2, '0')})`
    });
  }
  
  return times;
};

// Helper function to validate that reminders array matches frequency
export const validateReminders = (reminders: string[], frequency: GoalNotificationFrequency): boolean => {
  return reminders.length === frequency;
};

// Helper function to get reminder message for a specific time slot
export const getReminderForTimeSlot = (
  goal: Goal,
  timeSlotIndex: number
): string => {
  // Validate that we have a reminder for this time slot
  if (timeSlotIndex >= 0 && timeSlotIndex < goal.reminders.length) {
    return goal.reminders[timeSlotIndex];
  }
  
  // Fallback to default message if index is out of bounds
  return `Time to work on "${goal.goal_name}"!`;
};
// app/types/goals.ts

import { Timestamp } from 'firebase/firestore';

// Base interface for all documents
export interface BaseDocument {
  id: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: string;
}

// Goal Types
export type GoalType = 'reminder' | 'counter';

export type GoalStatus = 'active' | 'completed' | 'paused';

// Flexible Goal Document
export interface Goal extends BaseDocument {
  user_id: string;
  title: string;
  description?: string;
  type: GoalType;
  status: GoalStatus;
  
  // For reminder goals: just track if completed today
  // For counter goals: track progress toward daily target
  daily_target: number | null; // Only for counter goals (e.g., 8 glasses, 5 stretches)
  current_count: number; // Today's progress (0 for reminders, count for counters)
  
  // Tracking
  date_created: string; // "YYYY-MM-DD" when goal was created
  last_completed?: Timestamp; // When last marked complete/incremented
  last_reset: Timestamp; // When daily counter was last reset
  
  // Weekly tracking
  weekly_completions: number; // Days this week the goal was completed
  total_completions: number; // All-time days completed
  
  // Settings
  reminder_time?: string; // "09:00" format for daily reminder
  icon?: string; // Emoji or icon identifier
  color?: string; // Hex color for UI
  
  // Metadata for extensibility
  metadata?: Record<string, any>;
}

// Daily Log Entry - when user completes/increments a goal
export interface GoalLog extends BaseDocument {
  user_id: string;
  goal_id: string;
  goal_title: string; // Denormalized for easier querying
  
  // What happened
  action_type: 'complete' | 'increment'; // Complete for reminders, increment for counters
  increment_amount?: number; // For counter goals (default 1)
  note?: string;
  
  // When
  timestamp: Timestamp;
  date_string: string; // "YYYY-MM-DD" for easy daily querying
}

// User Profile with Goal Metrics
export interface UserProfile extends BaseDocument {
  // Basic Info
  email: string;
  display_name: string;
  //avatar_url?: string;
  
  // Goal Metrics - All Time
  total_goals_created: number;
  total_goals_completed: number; // Goals that reached their daily target
  total_actions_logged: number; // Total increments/completions across all goals
  
  // Goal Metrics - This Week
  weekly_goals_completed: number; // Goals completed this week
  weekly_actions_logged: number; // Actions logged this week
  current_weekly_streak: number; // Consecutive days with at least one goal completed
  best_weekly_streak: number; // Best weekly streak ever
  
  // Tracking
  last_weekly_reset: Timestamp;
  last_active: Timestamp;
  
  // Settings
  preferences: {
    notifications_enabled: boolean;
    default_reminder_time: string; // "09:00"
    timezone: string;
  };
}

// Weekly Leaderboard Entry
export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  
  // This week's stats
  goals_completed: number; // Number of goals that hit their daily target this week
  total_actions: number; // Total actions/increments this week
  active_days: number; // Days this week they logged any activity
  
  // Ranking
  rank: number;
  score: number; // Calculated score for ranking (could be goals_completed * 10 + total_actions)
}

// Weekly Leaderboard Document
export interface WeeklyLeaderboard extends BaseDocument {
  week_key: string; // "2025-W22"
  week_start: Timestamp;
  week_end: Timestamp;
  
  entries: LeaderboardEntry[]; // Top 100 users
  total_participants: number;
  last_updated: Timestamp;
}

// Helper types
export type CreateGoalInput = Omit<Goal, keyof BaseDocument | 'user_id' | 'current_count' | 'last_reset' | 'weekly_completions' | 'total_completions' |'date_created' | 'last_completed'>;;
export type UpdateGoalInput = Partial<Pick<Goal, 'title' | 'description' | 'daily_target' | 'reminder_time' | 'icon' | 'color' | 'status'>>;
export type CreateGoalLogInput = Omit<GoalLog, keyof BaseDocument | 'user_id' | 'goal_title' | 'date_string'>;
export type UpdateUserProfileInput = Partial<Omit<UserProfile, keyof BaseDocument>>;
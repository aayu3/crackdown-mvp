// app/hooks/useGoals.ts

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { goalService } from '../services/goalsService';
import {
    CreateGoalInput,
    Goal,
    GoalLog,
    UpdateGoalInput,
    UserProfile,
    WeeklyLeaderboard,
} from '../types/goals';

export interface UseGoalsReturn {
  // Goals data
  goals: Goal[];
  todaysLogs: GoalLog[];
  
  // Leaderboard
  weeklyLeaderboard: WeeklyLeaderboard | null;
  userRank: {
    rank: number;
    goalsCompleted: number;
    totalActions: number;
    activeDays: number;
    totalParticipants: number;
    score: number;
  } | null;
  
  // User profile
  userProfile: UserProfile | null;
  
  // Derived stats
  todaysCompletedGoals: number;
  todaysTotalActions: number;
  weeklyStats: {
    goalsCompleted: number;
    actionsLogged: number;
    currentStreak: number;
  };
  
  // State
  loading: boolean;
  error: string | null;
  
  // Actions
  createGoal: (goalData: CreateGoalInput) => Promise<string>;
  updateGoal: (goalId: string, updates: UpdateGoalInput) => Promise<void>;
  completeReminder: (goalId: string, note?: string) => Promise<void>;
  incrementCounter: (goalId: string, amount?: number, note?: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

export const useGoals = (realTime: boolean = true): UseGoalsReturn => {
  const { user, userProfile } = useAuth();
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [todaysLogs, setTodaysLogs] = useState<GoalLog[]>([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<WeeklyLeaderboard | null>(null);
  const [userRank, setUserRank] = useState<{
    rank: number;
    goalsCompleted: number;
    totalActions: number;
    activeDays: number;
    totalParticipants: number;
    score: number;
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived values
  const todaysCompletedGoals = goals.filter(goal => {
    if (goal.type === 'reminder') {
      return goal.current_count >= 1;
    } else {
      return goal.current_count >= (goal.daily_target || 1);
    }
  }).length;

  const todaysTotalActions = todaysLogs.length;

  const weeklyStats = {
    goalsCompleted: userProfile?.weekly_goals_completed || 0,
    actionsLogged: userProfile?.weekly_actions_logged || 0,
    currentStreak: userProfile?.current_weekly_streak || 0,
  };

  // Load all data
  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Load leaderboard
      const leaderboard = await goalService.getWeeklyLeaderboard();
      setWeeklyLeaderboard(leaderboard);

      // Load user rank
      const rank = await goalService.getUserWeeklyRank(user.uid);
      setUserRank(rank);

      // Load goals and logs if not using real-time
      if (!realTime) {
        const userGoals = await goalService.getUserGoals(user.uid, 'active');
        setGoals(userGoals);
        
        const logs = await goalService.getTodaysGoalLogs(user.uid);
        setTodaysLogs(logs);
      }

    } catch (err) {
      console.error('Error loading goals data:', err);
      setError('Failed to load goals data');
    } finally {
      setLoading(false);
    }
  }, [user, realTime]);

  // Set up real-time listeners
  useEffect(() => {
    if (!user || !realTime) return;

    const unsubscribeGoals = goalService.onUserGoalsChange(user.uid, (userGoals) => {
      setGoals(userGoals);
      setLoading(false);
    });

    const unsubscribeLogs = goalService.onTodaysLogsChange(user.uid, (logs) => {
      setTodaysLogs(logs);
    });

    return () => {
      unsubscribeGoals();
      unsubscribeLogs();
    };
  }, [user, realTime]);

  // Load data when user changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create goal
  const createGoal = useCallback(async (goalData: CreateGoalInput): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const goalId = await goalService.createGoal(user.uid, goalData);
      
      if (!realTime) {
        await loadData();
      }
      
      return goalId;
    } catch (err) {
      console.error('Error creating goal:', err);
      throw err;
    }
  }, [user, realTime, loadData]);

  // Update goal
  const updateGoal = useCallback(async (goalId: string, updates: UpdateGoalInput): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      await goalService.updateGoal(user.uid, goalId, updates);
      
      if (!realTime) {
        await loadData();
      }
    } catch (err) {
      console.error('Error updating goal:', err);
      throw err;
    }
  }, [user, realTime, loadData]);

  // Complete reminder goal
  const completeReminder = useCallback(async (goalId: string, note?: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      await goalService.completeReminderGoal(user.uid, goalId);
      
      if (!realTime) {
        await loadData();
      }
    } catch (err) {
      console.error('Error completing reminder:', err);
      throw err;
    }
  }, [user, realTime, loadData]);

  // Increment counter goal
  const incrementCounter = useCallback(async (goalId: string, amount: number = 1, note?: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      await goalService.incrementCounterGoal(user.uid, goalId, amount);
      
      if (!realTime) {
        await loadData();
      }
    } catch (err) {
      console.error('Error incrementing counter:', err);
      throw err;
    }
  }, [user, realTime, loadData]);

  // Refresh all data
  const refreshData = useCallback(async (): Promise<void> => {
    await loadData();
  }, [loadData]);

  return {
    // Goals data
    goals,
    todaysLogs,
    
    // Leaderboard
    weeklyLeaderboard,
    userRank,
    
    // User profile
    userProfile,
    
    // Derived stats
    todaysCompletedGoals,
    todaysTotalActions,
    weeklyStats,
    
    // State
    loading,
    error,
    
    // Actions
    createGoal,
    updateGoal,
    completeReminder,
    incrementCounter,
    refreshData,
  };
};
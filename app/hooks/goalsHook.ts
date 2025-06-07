// app/hooks/goalsHook.ts

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { goalsService } from '../services/goalsService';
import { DayOfWeek, Goal, GoalNotificationFrequency, GoalNotificationTimes, GoalType } from '../types/goals';

export const useGoals = () => {
  const { user, isLoggedIn } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load goals from Firebase
  const loadGoals = useCallback(async () => {
    if (!user?.uid) {
      setGoals([]);
      setActiveGoals([]);
      setCompletedGoals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const userGoals = await goalsService.getUserGoals(user.uid);
      setGoals(userGoals);
      
      // Separate active and completed goals
      const active = userGoals.filter(goal => goal.active && !goal.completed);
      const completed = userGoals.filter(goal => goal.active && goal.completed);
      
      setActiveGoals(active);
      setCompletedGoals(completed);
    } catch (err) {
      console.error('Error loading goals:', err);
      setError('Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Load goals when user changes or component mounts
  useEffect(() => {
    if (isLoggedIn) {
      loadGoals();
    }
  }, [isLoggedIn, loadGoals]);

  // Create a new goal
  const createGoal = useCallback(async (goalData: {
    goal_name: string;
    goal_type: GoalType;
    target_count: number | null;
    icon?: string;
    repeat: DayOfWeek[];
    daily_reminders?: GoalNotificationFrequency;
    notification_times?: GoalNotificationTimes[];
  }) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      setError(null);
      const goalId = await goalsService.createGoal(user.uid, goalData);
      await loadGoals(); // Refresh the goals list
      return goalId;
    } catch (err) {
      console.error('Error creating goal:', err);
      setError('Failed to create goal');
      throw err;
    }
  }, [user?.uid, loadGoals]);

  // Update a goal
  const updateGoal = useCallback(async (
    goalId: string,
    updates: Partial<Omit<Goal, 'id' | 'user_id' | 'created_date'>>
  ) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      setError(null);
      await goalsService.updateGoal(user.uid, goalId, updates);
      await loadGoals(); // Refresh the goals list
    } catch (err) {
      console.error('Error updating goal:', err);
      setError('Failed to update goal');
      throw err;
    }
  }, [user?.uid, loadGoals]);

  // Toggle task completion
  const toggleTaskCompletion = useCallback(async (goalId: string) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      setError(null);
      await goalsService.toggleTaskCompletion(user.uid, goalId);
      await loadGoals(); // Refresh the goals list
    } catch (err) {
      console.error('Error toggling task completion:', err);
      setError('Failed to update task');
      throw err;
    }
  }, [user?.uid, loadGoals]);

  // Update incremental goal count
  const updateIncrementalCount = useCallback(async (goalId: string, newCount: number) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      setError(null);
      await goalsService.updateIncrementalCount(user.uid, goalId, newCount);
      await loadGoals(); // Refresh the goals list
    } catch (err) {
      console.error('Error updating incremental count:', err);
      setError('Failed to update count');
      throw err;
    }
  }, [user?.uid, loadGoals]);

  // Delete a goal
  const deleteGoal = useCallback(async (goalId: string) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      setError(null);
      await goalsService.deleteGoal(user.uid, goalId);
      await loadGoals(); // Refresh the goals list
    } catch (err) {
      console.error('Error deleting goal:', err);
      setError('Failed to delete goal');
      throw err;
    }
  }, [user?.uid, loadGoals]);

  // Deactivate a goal
  const deactivateGoal = useCallback(async (goalId: string) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      setError(null);
      await goalsService.deactivateGoal(user.uid, goalId);
      await loadGoals(); // Refresh the goals list
    } catch (err) {
      console.error('Error deactivating goal:', err);
      setError('Failed to deactivate goal');
      throw err;
    }
  }, [user?.uid, loadGoals]);

  // Reactivate a goal
  const reactivateGoal = useCallback(async (goalId: string) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      setError(null);
      await goalsService.reactivateGoal(user.uid, goalId);
      await loadGoals(); // Refresh the goals list
    } catch (err) {
      console.error('Error reactivating goal:', err);
      setError('Failed to reactivate goal');
      throw err;
    }
  }, [user?.uid, loadGoals]);

  // Refresh goals manually
  const refreshGoals = useCallback(() => {
    loadGoals();
  }, [loadGoals]);

  return {
    // Data
    goals,
    activeGoals,
    completedGoals,
    loading,
    error,
    
    // Actions
    createGoal,
    updateGoal,
    toggleTaskCompletion,
    updateIncrementalCount,
    deleteGoal,
    deactivateGoal,
    reactivateGoal,
    refreshGoals,
  };
};
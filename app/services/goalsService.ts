// app/services/goalService.ts

import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import {
  CreateGoalInput,
  Goal,
  GoalLog,
  UpdateGoalInput,
  UpdateUserProfileInput,
  UserProfile,
  WeeklyLeaderboard
} from '../types/goals';

class GoalService {
  
  // Helper to get current week key (YYYY-WXX format)
  private getWeekKey(date: Date = new Date()): string {
    const year = date.getFullYear();
    const weekNum = this.getWeekNumber(date);
    return `${year}-W${String(weekNum).padStart(2, '0')}`;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private getDateString(date: Date = new Date()): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  private isSameWeek(date1: Date, date2: Date): boolean {
    return this.getWeekKey(date1) === this.getWeekKey(date2);
  }

  // USER PROFILE METHODS
  async createUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const now = Timestamp.now();
    
    const defaultProfile: Omit<UserProfile, 'id'> = {
      email: profileData.email || '',
      display_name: profileData.display_name || '',
      //avatar_url: profileData.avatar_url,
      
      // Goal metrics
      total_goals_created: 0,
      total_goals_completed: 0,
      total_actions_logged: 0,
      weekly_goals_completed: 0,
      weekly_actions_logged: 0,
      current_weekly_streak: 0,
      best_weekly_streak: 0,
      
      // Tracking
      last_weekly_reset: now,
      last_active: now,
      
      // Settings
      preferences: {
        notifications_enabled: true,
        default_reminder_time: '09:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      
      // Base fields
      created_at: now,
      updated_at: now,
      created_by: userId,
      
      // Override with provided data
      ...profileData,
    };

    await setDoc(userRef, defaultProfile);
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const profile = { id: userSnap.id, ...userSnap.data() } as UserProfile;
      
      // Check if we need to reset weekly counters
      const now = new Date();
      const lastReset = profile.last_weekly_reset.toDate();
      
      if (!this.isSameWeek(lastReset, now)) {
        const resetData = {
          weekly_goals_completed: 0,
          weekly_actions_logged: 0,
          current_weekly_streak: 0,
          last_weekly_reset: Timestamp.now(),
          updated_at: Timestamp.now(),
        };
        
        await updateDoc(userRef, resetData);
        return { ...profile, ...resetData };
      }
      
      return profile;
    }
    return null;
  }

  async updateUserProfile(userId: string, updates: UpdateUserProfileInput): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updated_at: Timestamp.now(),
    });
  }

  // GOAL METHODS
  async createGoal(userId: string, goalData: CreateGoalInput): Promise<string> {
    const batch = writeBatch(db);
    const now = Timestamp.now();
    const dateString = this.getDateString();
    
    // Create goal
    const goalRef = doc(collection(db, 'users', userId, 'goals'));
    const goalDoc: Omit<Goal, 'id'> = {
      user_id: userId,
      current_count: 0,
      last_reset: now,
      weekly_completions: 0,
      total_completions: 0,
      created_at: now,
      updated_at: now,
      created_by: userId,
      ...goalData,
      date_created: dateString
    };
    batch.set(goalRef, goalDoc);
    
    // Update user profile
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {
      total_goals_created: increment(1),
      last_active: now,
      updated_at: now,
    });
    
    await batch.commit();
    return goalRef.id;
  }

  async getUserGoals(userId: string, status?: string): Promise<Goal[]> {
    let q = query(
      collection(db, 'users', userId, 'goals'),
      orderBy('created_at', 'desc')
    );
    
    if (status) {
      q = query(q, where('status', '==', status));
    }

    const snapshot = await getDocs(q);
    const goals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Goal[];

    // Check if any goals need daily reset
    const now = new Date();
    const goalsToUpdate: Goal[] = [];
    
    for (const goal of goals) {
      const lastReset = goal.last_reset.toDate();
      if (!this.isSameDay(lastReset, now)) {
        goalsToUpdate.push({
          ...goal,
          current_count: 0,
          last_reset: Timestamp.now(),
        });
      }
    }
    
    // Update goals that need daily reset
    if (goalsToUpdate.length > 0) {
      const batch = writeBatch(db);
      for (const goal of goalsToUpdate) {
        const goalRef = doc(db, 'users', userId, 'goals', goal.id);
        batch.update(goalRef, {
          current_count: 0,
          last_reset: Timestamp.now(),
          updated_at: Timestamp.now(),
        });
      }
      await batch.commit();
      
      // Return updated goals
      return goals.map(goal => {
        const updated = goalsToUpdate.find(g => g.id === goal.id);
        return updated || goal;
      });
    }
    
    return goals;
  }

  async updateGoal(userId: string, goalId: string, updates: UpdateGoalInput): Promise<void> {
    const goalRef = doc(db, 'users', userId, 'goals', goalId);
    await updateDoc(goalRef, {
      ...updates,
      updated_at: Timestamp.now(),
    });
  }

  // GOAL ACTION METHODS (Complete/Increment)
  async completeReminderGoal(userId: string, goalId: string): Promise<void> {
    const batch = writeBatch(db);
    const now = Timestamp.now();
    const dateString = this.getDateString();
    
    // Get goal to check if already completed today
    const goalRef = doc(db, 'users', userId, 'goals', goalId);
    const goalSnap = await getDoc(goalRef);
    if (!goalSnap.exists()) throw new Error('Goal not found');
    
    const goal = { id: goalSnap.id, ...goalSnap.data() } as Goal;
    if (goal.type !== 'reminder') throw new Error('Goal is not a reminder type');
    if (goal.current_count >= 1) throw new Error('Reminder already completed today');
    
    // Update goal
    batch.update(goalRef, {
      current_count: 1,
      last_completed: now,
      weekly_completions: increment(1),
      total_completions: increment(1),
      updated_at: now,
    });
    
    // Log the action
    const logRef = doc(collection(db, 'users', userId, 'goalLogs'));
    const logData: Omit<GoalLog, 'id'> = {
      user_id: userId,
      goal_id: goalId,
      goal_title: goal.title,
      action_type: 'complete',
      timestamp: now,
      date_string: dateString,
      created_at: now,
      updated_at: now,
      created_by: userId,
    };
    batch.set(logRef, logData);
    
    // Update user profile
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {
      total_goals_completed: increment(1),
      total_actions_logged: increment(1),
      weekly_goals_completed: increment(1),
      weekly_actions_logged: increment(1),
      last_active: now,
      updated_at: now,
    });
    
    await batch.commit();
  }

  async incrementCounterGoal(userId: string, goalId: string, amount: number = 1,): Promise<void> {
    const batch = writeBatch(db);
    const now = Timestamp.now();
    const dateString = this.getDateString();
    
    // Get goal
    const goalRef = doc(db, 'users', userId, 'goals', goalId);
    const goalSnap = await getDoc(goalRef);
    if (!goalSnap.exists()) throw new Error('Goal not found');
    
    const goal = { id: goalSnap.id, ...goalSnap.data() } as Goal;
    if (goal.type !== 'counter') throw new Error('Goal is not a counter type');
    
    const newCount = goal.current_count + amount;
    const dailyTarget = goal.daily_target || 1;
    const wasCompleted = goal.current_count >= dailyTarget;
    const isNowCompleted = newCount >= dailyTarget;
    
    // Update goal
    const goalUpdates: any = {
      current_count: newCount,
      last_completed: now,
      updated_at: now,
    };
    
    // If goal just reached target for first time today
    if (!wasCompleted && isNowCompleted) {
      goalUpdates.weekly_completions = increment(1);
      goalUpdates.total_completions = increment(1);
    }
    
    batch.update(goalRef, goalUpdates);
    
    // Log the action
    const logRef = doc(collection(db, 'users', userId, 'goalLogs'));
    const logData: Omit<GoalLog, 'id'> = {
      user_id: userId,
      goal_id: goalId,
      goal_title: goal.title,
      action_type: 'increment',
      increment_amount: amount,
      timestamp: now,
      date_string: dateString,
      created_at: now,
      updated_at: now,
      created_by: userId,
    };
    batch.set(logRef, logData);
    
    // Update user profile
    const userUpdates: any = {
      total_actions_logged: increment(1),
      weekly_actions_logged: increment(1),
      last_active: now,
      updated_at: now,
    };
    
    // If goal just completed for first time today
    if (!wasCompleted && isNowCompleted) {
      userUpdates.total_goals_completed = increment(1);
      userUpdates.weekly_goals_completed = increment(1);
    }
    
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, userUpdates);
    
    await batch.commit();
  }

  // Get today's goal logs
  async getTodaysGoalLogs(userId: string, goalId?: string): Promise<GoalLog[]> {
    const dateString = this.getDateString();
    let q = query(
      collection(db, 'users', userId, 'goalLogs'),
      where('date_string', '==', dateString),
      orderBy('timestamp', 'desc')
    );
    
    if (goalId) {
      q = query(q, where('goal_id', '==', goalId));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GoalLog[];
  }

  // LEADERBOARD METHODS
  async getWeeklyLeaderboard(weekKey?: string): Promise<WeeklyLeaderboard | null> {
    const targetWeek = weekKey || this.getWeekKey();
    const leaderboardRef = doc(db, 'weeklyLeaderboards', targetWeek);
    const leaderboardSnap = await getDoc(leaderboardRef);
    
    if (leaderboardSnap.exists()) {
      return { id: leaderboardSnap.id, ...leaderboardSnap.data() } as WeeklyLeaderboard;
    }
    return null;
  }

  async getUserWeeklyRank(userId: string, weekKey?: string): Promise<{
    rank: number;
    goalsCompleted: number;
    totalActions: number;
    activeDays: number;
    totalParticipants: number;
    score: number;
  } | null> {
    const leaderboard = await this.getWeeklyLeaderboard(weekKey);
    if (!leaderboard) return null;

    const userEntry = leaderboard.entries.find(entry => entry.user_id === userId);
    if (userEntry) {
      return {
        rank: userEntry.rank,
        goalsCompleted: userEntry.goals_completed,
        totalActions: userEntry.total_actions,
        activeDays: userEntry.active_days,
        totalParticipants: leaderboard.total_participants,
        score: userEntry.score,
      };
    }

    // User not in top rankings
    return {
      rank: Math.max(101, leaderboard.total_participants),
      goalsCompleted: 0,
      totalActions: 0,
      activeDays: 0,
      totalParticipants: leaderboard.total_participants,
      score: 0,
    };
  }

  // Real-time listeners
  onUserGoalsChange(userId: string, callback: (goals: Goal[]) => void) {
    const q = query(
      collection(db, 'users', userId, 'goals'),
      where('status', '==', 'active'),
      orderBy('created_at', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const goals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Goal[];
      callback(goals);
    });
  }

  onTodaysLogsChange(userId: string, callback: (logs: GoalLog[]) => void) {
    const dateString = this.getDateString();
    const q = query(
      collection(db, 'users', userId, 'goalLogs'),
      where('date_string', '==', dateString),
      orderBy('timestamp', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GoalLog[];
      callback(logs);
    });
  }

  // This would be called by a Cloud Function weekly
  async generateWeeklyLeaderboard(weekKey?: string): Promise<void> {
    console.log(`Generating weekly leaderboard for ${weekKey || this.getWeekKey()}`);
    
    // In production, this would:
    // 1. Query all users' weekly stats
    // 2. Calculate scores (e.g., goals_completed * 10 + total_actions)
    // 3. Sort by score and assign ranks
    // 4. Store top 100 in weeklyLeaderboards collection
    
    const targetWeek = weekKey || this.getWeekKey();
    const now = new Date();
    
    const leaderboardData: Omit<WeeklyLeaderboard, 'id'> = {
      week_key: targetWeek,
      week_start: Timestamp.fromDate(now), // Would calculate actual week start
      week_end: Timestamp.fromDate(now),   // Would calculate actual week end
      entries: [], // Would populate with actual user data
      total_participants: 0,
      last_updated: Timestamp.now(),
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      created_by: 'system',
    };
    
    const leaderboardRef = doc(db, 'weeklyLeaderboards', targetWeek);
    await setDoc(leaderboardRef, leaderboardData);
  }
}

export const goalService = new GoalService();
// app/services/historyService.ts

import {
  collection,
  getDocs,
  orderBy,
  query,
  where
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { GoalLog } from '../types/goals';
import { goalService } from './goalsService';

export interface DayStats {
  date: string; // "YYYY-MM-DD"
  goals_completed: number;
  total_actions: number;
  unique_goals: number; // Number of different goals worked on
}

export interface WeekStats {
  week_key: string; // "2025-W22"
  week_start: Date;
  week_end: Date;
  days: DayStats[];
  total_goals_completed: number;
  total_actions: number;
  active_days: number; // Days with at least one action
  avg_goals_per_day: number;
  avg_actions_per_day: number;
}

export interface AllTimeStats {
  total_active_days: number;
  total_goals_completed: number;
  total_actions: number;
  avg_goals_per_day: number;
  avg_actions_per_day: number;
  best_day: {
    date: string;
    goals_completed: number;
    actions: number;
  } | null;
  current_streak: number;
  longest_streak: number;
  first_activity_date: string | null;
}

export interface UserHistoryData {
  yesterday: DayStats | null;
  current_week: WeekStats;
  previous_week: WeekStats | null;
  all_time: AllTimeStats;
}

class HistoryService {

  private getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getWeekKey(date: Date): string {
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

  private getWeekDates(weekKey: string): { start: Date; end: Date } {
    const [year, week] = weekKey.split('-W');
    const weekNum = parseInt(week);
    
    // Calculate week start (Monday)
    const jan1 = new Date(parseInt(year), 0, 1);
    const weekStart = new Date(jan1);
    weekStart.setDate(jan1.getDate() + (weekNum - 1) * 7 - jan1.getDay() + 1);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return { start: weekStart, end: weekEnd };
  }

  // Get logs for a specific date range
  private async getLogsInRange(
    userId: string, 
    startDate: string, 
    endDate: string
  ): Promise<GoalLog[]> {
    const q = query(
      collection(db, 'users', userId, 'goalLogs'),
      where('date_string', '>=', startDate),
      where('date_string', '<=', endDate),
      orderBy('date_string', 'asc'),
      orderBy('timestamp', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GoalLog[];
  }

  // Calculate stats for a single day
  private calculateDayStats(logs: GoalLog[], date: string): DayStats {
    const dayLogs = logs.filter(log => log.date_string === date);
    
    const goalsCompleted = new Set<string>();
    const uniqueGoals = new Set<string>();
    let totalActions = 0;

    for (const log of dayLogs) {
      uniqueGoals.add(log.goal_id);
      totalActions++;
      
      // For counter goals, we need to check if they reached their target
      // For reminder goals, any completion counts
      if (log.action_type === 'complete') {
        goalsCompleted.add(log.goal_id);
      }
      // For increment actions, we'd need goal data to know if target was reached
      // For now, we'll approximate based on the log action
    }

    return {
      date,
      goals_completed: goalsCompleted.size,
      total_actions: totalActions,
      unique_goals: uniqueGoals.size,
    };
  }

  // Calculate stats for a week
  private calculateWeekStats(logs: GoalLog[], weekKey: string): WeekStats {
    const { start, end } = this.getWeekDates(weekKey);
    
    // Generate all 7 days of the week
    const days: DayStats[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dateString = this.getDateString(date);
      days.push(this.calculateDayStats(logs, dateString));
    }

    const totalGoalsCompleted = days.reduce((sum, day) => sum + day.goals_completed, 0);
    const totalActions = days.reduce((sum, day) => sum + day.total_actions, 0);
    const activeDays = days.filter(day => day.total_actions > 0).length;

    return {
      week_key: weekKey,
      week_start: start,
      week_end: end,
      days,
      total_goals_completed: totalGoalsCompleted,
      total_actions: totalActions,
      active_days: activeDays,
      avg_goals_per_day: activeDays > 0 ? totalGoalsCompleted / activeDays : 0,
      avg_actions_per_day: activeDays > 0 ? totalActions / activeDays : 0,
    };
  }

  // Get comprehensive user history
  async getUserHistory(userId: string): Promise<UserHistoryData> {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    
    const currentWeekKey = this.getWeekKey(now);
    const previousWeek = new Date(now);
    previousWeek.setDate(now.getDate() - 7);
    const previousWeekKey = this.getWeekKey(previousWeek);

    // Get logs for current week and previous week
    const { start: currentWeekStart } = this.getWeekDates(currentWeekKey);
    const { start: previousWeekStart } = this.getWeekDates(previousWeekKey);
    
    const startDate = this.getDateString(previousWeekStart);
    const endDate = this.getDateString(now);
    
    const recentLogs = await this.getLogsInRange(userId, startDate, endDate);

    // Calculate yesterday's stats
    const yesterdayStats = this.calculateDayStats(recentLogs, this.getDateString(yesterday));
    
    // Calculate current week stats
    const currentWeekStats = this.calculateWeekStats(recentLogs, currentWeekKey);
    
    // Calculate previous week stats
    const previousWeekStats = this.calculateWeekStats(recentLogs, previousWeekKey);

    // Get all-time stats
    const allTimeStats = await this.getAllTimeStats(userId);

    return {
      yesterday: yesterdayStats.total_actions > 0 ? yesterdayStats : null,
      current_week: currentWeekStats,
      previous_week: previousWeekStats.total_actions > 0 ? previousWeekStats : null,
      all_time: allTimeStats,
    };
  }

  // Get all-time statistics from user profile (super efficient!)
  private async getAllTimeStats(userId: string): Promise<AllTimeStats> {
    // Get user profile which already has all the stats we need!
    const userProfile = await goalService.getUserProfile(userId);
    
    if (!userProfile) {
      return {
        total_active_days: 0,
        total_goals_completed: 0,
        total_actions: 0,
        avg_goals_per_day: 0,
        avg_actions_per_day: 0,
        best_day: null,
        current_streak: 0,
        longest_streak: 0,
        first_activity_date: null,
      };
    }

    // All stats are already in the profile - super fast!
    const totalDaysActive = userProfile.total_active_days || 0;
    const totalGoalsCompleted = userProfile.total_goals_completed;
    
    // Calculate averages
    const avgGoalsPerDay = totalDaysActive > 0 ? totalGoalsCompleted / totalDaysActive : 0;
    
    // Best day info
    const bestDay = userProfile.best_day_goals > 0 ? {
      date: userProfile.best_day_date || 'Unknown',
      goals_completed: userProfile.best_day_goals,
    } : null;

    return {
      total_active_days: totalDaysActive,
      total_goals_completed: totalGoalsCompleted,
      avg_goals_per_day: avgGoalsPerDay,
      best_day: bestDay,
      current_streak: userProfile.current_weekly_streak,
      longest_streak: userProfile.best_weekly_streak,
      first_activity_date: userProfile.first_activity_date || null,
    };
  }

  // Get weekly leaderboard history (last 4 weeks)
  async getLeaderboardHistory(): Promise<any[]> {
    // This would fetch multiple weeks of leaderboard data
    // For now, just return empty array - implement based on your leaderboard structure
    return [];
  }
}

export const historyService = new HistoryService();
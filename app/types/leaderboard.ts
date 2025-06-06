import { Timestamp } from 'firebase/firestore';

// Weekly Leaderboard Document (stored in Firestore)
export interface WeeklyLeaderboard {
  // Firestore document ID (not stored in document itself)
  id: string; // e.g., "2025-W22"
  
  // Week boundaries
  week_start: Timestamp;
  week_end: Timestamp;
  
  // Top 10 users for this week
  entries: LeaderboardEntry[];
  
  // Update tracking
  last_updated: Timestamp;
}

// Individual leaderboard entry
export interface LeaderboardEntry {
  user_id: string; // For finding and updating users
  username: string; // For display
  goals_completed: number; // Weekly goal count
  rank: number; // Position 1-10
}
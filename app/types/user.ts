// app/types/user.ts

import { Timestamp } from 'firebase/firestore';

// User Profile Document (stored in Firestore)
export interface UserProfile {
  // Firestore document ID (not stored in document itself)
  id: string;
  
  // Basic user info
  username: string;
  username_lower: string; // Lowercase version for case-insensitive queries
  firstname: string;
  lastname: string;
  email: string;
  icon: string | null; // Profile icon/avatar URL (null for default)
  
  // Activity tracking
  days_active: number; // Total days user has been active
  streak: number; // Current consecutive days active
  last_active_day: Timestamp | null; // Last day user was active (null if never active)
  
  // Account creation
  created: Timestamp;
}
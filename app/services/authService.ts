// app/services/authService.ts

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { UserProfile } from '../types/user';

class AuthService {
  
  // Check if username is already taken (case-insensitive)
  async isUsernameTaken(username: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'users'),
        where('username_lower', '==', username.toLowerCase())
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking username:', error);
      return true; // Assume taken on error for safety
    }
  }

  // Check if email is already taken (case-insensitive)
  async isEmailTaken(email: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'users'),
        where('email', '==', email.toLowerCase())
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking email:', error);
      return true; // Assume taken on error for safety
    }
  }

  // Check if both username and email are available
  async checkAvailability(username: string, email: string): Promise<{
    usernameAvailable: boolean;
    emailAvailable: boolean;
  }> {
    try {
      const [usernameAvailable, emailAvailable] = await Promise.all([
        this.isUsernameTaken(username).then(taken => !taken),
        this.isEmailTaken(email).then(taken => !taken)
      ]);
      
      return { usernameAvailable, emailAvailable };
    } catch (error) {
      console.error('Error checking availability:', error);
      return { usernameAvailable: false, emailAvailable: false };
    }
  }

  // Find user by username or email
  async findUserByUsernameOrEmail(usernameOrEmail: string): Promise<UserProfile | null> {
    try {
      // Check if it looks like an email
      const isEmail = usernameOrEmail.includes('@');
      
      if (isEmail) {
        // Search by email
        const q = query(
          collection(db, 'users'),
          where('email', '==', usernameOrEmail.toLowerCase())
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          return { id: doc.id, ...doc.data() } as UserProfile;
        }
      } else {
        // Search by username (use lowercase field for consistency)
        const q = query(
          collection(db, 'users'),
          where('username_lower', '==', usernameOrEmail.toLowerCase())
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          return { id: doc.id, ...doc.data() } as UserProfile;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  }

  // Create user profile
  async createUserProfile(
    userId: string,
    userData: {
      username: string;
      firstname: string;
      lastname: string;
      email: string;
    }
  ): Promise<void> {
    const now = Timestamp.now();
    
    const userProfile: Omit<UserProfile, 'id'> = {
      username: userData.username, // Store original case
      username_lower: userData.username.toLowerCase(), // Store lowercase for queries
      firstname: userData.firstname,
      lastname: userData.lastname,
      email: userData.email.toLowerCase(),
      icon: null,
      days_active: 1,
      streak: 1,
      last_active_day: now,
      created: now,
    };

    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, userProfile);
  }

  // Get user profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() } as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Update user activity (call on daily login)
  async updateUserActivity(userId: string): Promise<void> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) return;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Get last active day
      const lastActiveDate = userProfile.last_active_day?.toDate();
      const lastActiveDay = lastActiveDate ? 
        new Date(lastActiveDate.getFullYear(), lastActiveDate.getMonth(), lastActiveDate.getDate()) :
        null;

      // Check if this is a new day
      if (!lastActiveDay || lastActiveDay.getTime() !== today.getTime()) {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
        let newStreak = 1; // Reset to 1 for today
        
        // If they were active yesterday, continue the streak
        if (lastActiveDay && lastActiveDay.getTime() === yesterday.getTime()) {
          newStreak = userProfile.streak + 1;
        }
        
        // Update the profile
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          days_active: userProfile.days_active + 1,
          streak: newStreak,
          last_active_day: Timestamp.now(),
        });

        console.log(`Updated user activity: days_active=${userProfile.days_active + 1}, streak=${newStreak}`);
      }
    } catch (error) {
      console.error('Error updating user activity:', error);
    }
  }

  // Additional helper method for updating user profile
  async updateUserProfile(
    userId: string, 
    updates: Partial<Omit<UserProfile, 'id' | 'created'>>
  ): Promise<void> {
    try {
      // If username is being updated, also update username_lower
      if (updates.username) {
        updates.username_lower = updates.username.toLowerCase();
      }
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, updates);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Method to check if user needs activity update (call on app startup)
  async shouldUpdateActivity(userId: string): Promise<boolean> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile || !userProfile.last_active_day) return true;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastActiveDate = userProfile.last_active_day.toDate();
      const lastActiveDay = new Date(
        lastActiveDate.getFullYear(), 
        lastActiveDate.getMonth(), 
        lastActiveDate.getDate()
      );

      return lastActiveDay.getTime() !== today.getTime();
    } catch (error) {
      console.error('Error checking activity update:', error);
      return false;
    }
  }
}

export const authService = new AuthService();
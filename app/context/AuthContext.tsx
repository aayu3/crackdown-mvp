// app/contexts/AuthContext.tsx

import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../../firebaseConfig';
import { authService } from '../services/authService';
import { UserProfile } from '../types/user';


interface AuthContextType {
  // State
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  
  // Computed properties
  isLoggedIn: boolean;
  username: string | null;
  email: string | null;
  
  // Methods
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, firstname: string, lastname: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkPermissions = async (): Promise<string> => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return 'unknown';
    }
  };

  // Load user profile from Firestore
  const loadUserProfile = async (firebaseUser: User | null) => {
    if (firebaseUser) {
      try {
        const profile = await authService.getUserProfile(firebaseUser.uid);
        setUserProfile(profile);
        
        // Update user activity if needed
        if (profile && await authService.shouldUpdateActivity(firebaseUser.uid)) {
          await authService.updateUserActivity(firebaseUser.uid);
          // Reload profile to get updated activity data
          const updatedProfile = await authService.getUserProfile(firebaseUser.uid);
          setUserProfile(updatedProfile);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        setUserProfile(null);
      }
    } else {
      setUserProfile(null);
    }
  };

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      await loadUserProfile(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Login with username/email
  const login = async (usernameOrEmail: string, password: string): Promise<void> => {
    try {
      let email = usernameOrEmail;
      
      // If it's not an email, find the user's email by username
      if (!usernameOrEmail.includes('@')) {
        const userProfile = await authService.findUserByUsernameOrEmail(usernameOrEmail);
        if (!userProfile) {
          throw new Error('User not found');
        }
        email = userProfile.email;
      }
      
      await signInWithEmailAndPassword(auth, email, password);
      const permissionStatus = await checkPermissions();
      if (permissionStatus !== 'granted') {
              const { status } = await Notifications.requestPermissionsAsync();
              console.log('Permission status:', status);
        

      }
      console.log(permissionStatus)
      router.push('/(tabs)/goals')
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Register new user
  const register = async (
    username: string, 
    firstname: string, 
    lastname: string, 
    email: string, 
    password: string
  ): Promise<void> => {
    try {
      // Check if username and email are available
      const availability = await authService.checkAvailability(username, email);
      
      if (!availability.usernameAvailable && !availability.emailAvailable) {
        throw new Error('Username and email are already taken');
      } else if (!availability.usernameAvailable) {
        throw new Error('Username is already taken');
      } else if (!availability.emailAvailable) {
        throw new Error('Email is already taken');
      }

      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile
      await authService.createUserProfile(userCredential.user.uid, {
        username,
        firstname,
        lastname,
        email
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      router.push('/(auth)/login'); // Redirect to login page after logout
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    // State
    user,
    userProfile,
    loading,
    
    // Computed properties
    isLoggedIn: !!user,
    username: userProfile?.username || null,
    email: user?.email || null,
    
    // Methods
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
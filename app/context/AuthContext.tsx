import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    User
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../../firebaseConfig'; // Adjust the import based on your Firebase config file
import { goalService } from '../services/goalsService';
import { UserProfile } from '../types/goals'; // Updated import
import AuthContextType from './AuthContextInterface'; // Import the interface for type safety

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (firebaseUser: User | null) => {
    if (firebaseUser) {
      try {
        let profile = await goalService.getUserProfile(firebaseUser.uid);
        
        // Create profile if it doesn't exist
        if (!profile) {
          await goalService.createUserProfile(firebaseUser.uid, {
            email: firebaseUser.email || '',
            display_name: firebaseUser.displayName || 'User',
          });
          profile = await goalService.getUserProfile(firebaseUser.uid);
        }
        
        setUserProfile(profile);
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
    console.log('Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', { user: !!firebaseUser, email: firebaseUser?.email });
      setUser(firebaseUser);
      await loadUserProfile(firebaseUser);
      setLoading(false);
    });

    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  // Memoize the auth functions to prevent recreation on every render
  const login = useMemo(() => async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const register = useMemo(() => async (username:string, email: string, password: string) => {
    try {
      console.log('Attempting registration for:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile immediately after registration
      await goalService.createUserProfile(userCredential.user.uid, {
        email: email,
        display_name: username || 'User',
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }, []);

  const logout = useMemo(() => async () => {
    try {
      console.log('Attempting logout');
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }, []);

  const refreshProfile = useMemo(() => async () => {
    if (user) {
      await loadUserProfile(user);
    }
  }, [user]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<AuthContextType>(() => ({
    loggedIn: !!user,
    user,
    userProfile,
    username: userProfile?.display_name || user?.displayName || null,
    email: user?.email || null,
    loading,
    login,
    register,
    logout,
    refreshProfile
  }), [user, userProfile, loading, login, register, logout, refreshProfile]);

  console.log('AuthProvider providing value:', { loggedIn: !!user, loading });

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
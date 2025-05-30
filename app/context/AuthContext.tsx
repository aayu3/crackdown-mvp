import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    User
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../../firebaseConfig'; // Adjust the import based on your Firebase config file
import AuthContextType from './AuthContextInterface'; // Import the interface for type safety

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for authentication state changes
  useEffect(() => {
    console.log('Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('Auth state changed:', { user: !!firebaseUser, email: firebaseUser?.email });
      setUser(firebaseUser);
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

  const register = useMemo(() => async (email: string, password: string) => {
    try {
      console.log('Attempting registration for:', email);
      await createUserWithEmailAndPassword(auth, email, password);
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

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<AuthContextType>(() => ({
    loggedIn: !!user,
    user,
    username: user?.displayName || null,
    email: user?.email || null,
    loading,
    login,
    register,
    logout,
  }), [user, loading, login, register, logout]);

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
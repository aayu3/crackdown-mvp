import React, { createContext, useContext, useState } from 'react';
import { AuthContextType } from './AuthContextInterface';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("guest");
  const [email, setEmail] = useState<string |null>(null)
  const login = () => setLoggedIn(true)
  const logout = () => setLoggedIn(false) 
  return (
    <AuthContext.Provider
      value={{ loggedIn, username, email, login, logout }}
    >
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
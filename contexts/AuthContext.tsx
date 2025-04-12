import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { xtreamApi, XtreamCredentials, AuthResponse } from '../services/api/xtreamCodesApi';
import { router } from 'expo-router';
import { saveUser } from '../services/UserManager';

interface AuthContextType {
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (credentials: XtreamCredentials) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  authData: AuthResponse | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authData, setAuthData] = useState<AuthResponse | null>(null);

  useEffect(() => {
    // Check if user is already logged in on app start
    const checkLoginStatus = async () => {
      try {
        const loggedIn = await xtreamApi.isLoggedIn();
        setIsLoggedIn(loggedIn);
      } catch (error) {
        console.error('Error checking login status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  const login = async (credentials: XtreamCredentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await xtreamApi.login(credentials);
      setAuthData(response);
      setIsLoggedIn(true);
      
      // Save the user credentials for the user list
      await saveUser({
        username: credentials.username,
        password: credentials.password,
        serverUrl: credentials.serverUrl
      });
      
      // Navigate to main app
      router.replace("/");
    } catch (error: any) {
      setError(error.message || 'Failed to login. Please check your credentials.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    
    try {
      await xtreamApi.logout();
      setIsLoggedIn(false);
      setAuthData(null);
      
      // Navigate to login
      router.replace('/(auth)');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    isLoading,
    isLoggedIn,
    login,
    logout,
    error,
    authData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 
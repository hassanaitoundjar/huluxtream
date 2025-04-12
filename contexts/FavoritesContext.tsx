import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Channel, Movie, Series } from '../services/api/xtreamCodesApi';
import { xtreamApi } from '../services/api/xtreamCodesApi';

// Base Storage key
const FAVORITES_STORAGE_KEY_BASE = 'huluxtream_favorites';

// Type for favorite items
export type FavoriteItem = {
  id: number;
  name: string;
  type: 'live' | 'movie' | 'series';
  imageUrl?: string;
  data: Channel | Movie | Series;
};

// Context type
interface FavoritesContextType {
  favorites: FavoriteItem[];
  addFavorite: (item: FavoriteItem) => Promise<void>;
  removeFavorite: (id: number, type: string) => Promise<void>;
  isFavorite: (id: number, type: string) => boolean;
  isLoading: boolean;
  clearFavorites: () => Promise<void>;
}

// Create context
const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

// Hook for using the context
export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

// Provider props
interface FavoritesProviderProps {
  children: ReactNode;
}

// Helper to get user-specific storage key
const getUserStorageKey = async (): Promise<string> => {
  try {
    // Check if logged in first
    const isLoggedIn = await xtreamApi.isLoggedIn();
    if (isLoggedIn) {
      const userInfo = xtreamApi.getUserInfo();
      if (userInfo && userInfo.username) {
        return `${FAVORITES_STORAGE_KEY_BASE}_${userInfo.username}`;
      }
    }
  } catch (error) {
    console.error('Error getting user info:', error);
  }
  
  // Default key if not logged in or error
  return FAVORITES_STORAGE_KEY_BASE;
};

// Provider component
export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string>('');

  // Monitor user changes and reload favorites when user changes
  useEffect(() => {
    const checkCurrentUser = async () => {
      try {
        const isLoggedIn = await xtreamApi.isLoggedIn();
        if (isLoggedIn) {
          const userInfo = xtreamApi.getUserInfo();
          if (userInfo && userInfo.username && userInfo.username !== currentUser) {
            setCurrentUser(userInfo.username);
            loadFavorites();
          }
        }
      } catch (error) {
        console.error('Error checking current user:', error);
      }
    };

    checkCurrentUser();
  }, [currentUser]);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  // Load favorites from storage
  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const storageKey = await getUserStorageKey();
      const storedFavorites = await AsyncStorage.getItem(storageKey);
      
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      } else {
        // If we switched users and have no favorites for this user, reset state
        setFavorites([]);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save favorites to storage
  const saveFavorites = async (updatedFavorites: FavoriteItem[]) => {
    try {
      const storageKey = await getUserStorageKey();
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(updatedFavorites)
      );
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  };

  // Add a favorite
  const addFavorite = async (item: FavoriteItem) => {
    // Check if already exists
    if (isFavorite(item.id, item.type)) {
      return; // Already exists
    }
    
    const updatedFavorites = [...favorites, item];
    setFavorites(updatedFavorites);
    await saveFavorites(updatedFavorites);
  };

  // Remove a favorite
  const removeFavorite = async (id: number, type: string) => {
    const updatedFavorites = favorites.filter(
      item => !(item.id === id && item.type === type)
    );
    setFavorites(updatedFavorites);
    await saveFavorites(updatedFavorites);
  };

  // Check if an item is a favorite
  const isFavorite = (id: number, type: string): boolean => {
    return favorites.some(item => item.id === id && item.type === type);
  };

  // Clear all favorites
  const clearFavorites = async () => {
    try {
      const storageKey = await getUserStorageKey();
      await AsyncStorage.removeItem(storageKey);
      setFavorites([]);
    } catch (error) {
      console.error('Failed to clear favorites:', error);
    }
  };

  // Context value
  const value = {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    isLoading,
    clearFavorites,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}; 
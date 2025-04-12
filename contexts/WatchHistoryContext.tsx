import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Movie } from '../services/api/xtreamCodesApi';

// Storage key
const WATCH_HISTORY_STORAGE_KEY = 'huluxtream_watch_history';

// Type for watch history items
export type WatchHistoryItem = {
  id: number;
  name: string;
  type: 'movie'; // Can be expanded to include 'series' later
  imageUrl?: string;
  lastWatched: number; // Timestamp
  watchedAt: number; // Position in the video (milliseconds)
  duration: number; // Total duration (milliseconds)
  data: Movie;
};

// Context type
type WatchHistoryContextType = {
  watchHistory: WatchHistoryItem[];
  addToWatchHistory: (item: WatchHistoryItem) => Promise<void>;
  removeFromWatchHistory: (id: number, type: string) => Promise<void>;
  clearWatchHistory: () => Promise<void>;
  updateWatchProgress: (id: number, type: string, position: number, duration: number) => Promise<void>;
  isInWatchHistory: (id: number, type: string) => boolean;
  isLoading: boolean;
};

// Create context
const WatchHistoryContext = createContext<WatchHistoryContextType | undefined>(undefined);

// Custom hook to use the context
export const useWatchHistory = () => {
  const context = useContext(WatchHistoryContext);
  if (!context) {
    throw new Error('useWatchHistory must be used within a WatchHistoryProvider');
  }
  return context;
};

// Props for the provider
type WatchHistoryProviderProps = {
  children: ReactNode;
};

// Provider component
export const WatchHistoryProvider: React.FC<WatchHistoryProviderProps> = ({ children }) => {
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load watch history on mount
  useEffect(() => {
    loadWatchHistory();
  }, []);

  // Load watch history from storage
  const loadWatchHistory = async () => {
    try {
      const storedWatchHistory = await AsyncStorage.getItem(WATCH_HISTORY_STORAGE_KEY);
      if (storedWatchHistory) {
        setWatchHistory(JSON.parse(storedWatchHistory));
      }
    } catch (error) {
      console.error('Failed to load watch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save watch history to storage
  const saveWatchHistory = async (updatedWatchHistory: WatchHistoryItem[]) => {
    try {
      await AsyncStorage.setItem(
        WATCH_HISTORY_STORAGE_KEY,
        JSON.stringify(updatedWatchHistory)
      );
    } catch (error) {
      console.error('Failed to save watch history:', error);
    }
  };

  // Add an item to watch history
  const addToWatchHistory = async (item: WatchHistoryItem) => {
    // Remove if exists (to update and move to top)
    const filteredHistory = watchHistory.filter(
      existingItem => !(existingItem.id === item.id && existingItem.type === item.type)
    );
    
    // Add new item at the beginning
    const updatedWatchHistory = [item, ...filteredHistory];
    
    // Limit to 20 items to avoid excessive storage
    const limitedHistory = updatedWatchHistory.slice(0, 20);
    
    setWatchHistory(limitedHistory);
    await saveWatchHistory(limitedHistory);
  };

  // Remove an item from watch history
  const removeFromWatchHistory = async (id: number, type: string) => {
    const updatedWatchHistory = watchHistory.filter(
      item => !(item.id === id && item.type === type)
    );
    setWatchHistory(updatedWatchHistory);
    await saveWatchHistory(updatedWatchHistory);
  };

  // Clear entire watch history
  const clearWatchHistory = async () => {
    setWatchHistory([]);
    await saveWatchHistory([]);
  };

  // Update the watch progress for an item
  const updateWatchProgress = async (id: number, type: string, position: number, duration: number) => {
    const itemIndex = watchHistory.findIndex(
      item => item.id === id && item.type === type
    );
    
    if (itemIndex === -1) {
      // Item not in history yet
      return;
    }
    
    // Create a copy of the history
    const updatedWatchHistory = [...watchHistory];
    
    // Update the item
    updatedWatchHistory[itemIndex] = {
      ...updatedWatchHistory[itemIndex],
      watchedAt: position,
      duration,
      lastWatched: Date.now(),
    };
    
    // Move the item to the top of the list
    const updatedItem = updatedWatchHistory.splice(itemIndex, 1)[0];
    updatedWatchHistory.unshift(updatedItem);
    
    setWatchHistory(updatedWatchHistory);
    await saveWatchHistory(updatedWatchHistory);
  };

  // Check if an item is in watch history
  const isInWatchHistory = (id: number, type: string): boolean => {
    return watchHistory.some(item => item.id === id && item.type === type);
  };

  // Context value
  const value = {
    watchHistory,
    addToWatchHistory,
    removeFromWatchHistory,
    clearWatchHistory,
    updateWatchProgress,
    isInWatchHistory,
    isLoading,
  };

  return (
    <WatchHistoryContext.Provider value={value}>
      {children}
    </WatchHistoryContext.Provider>
  );
}; 
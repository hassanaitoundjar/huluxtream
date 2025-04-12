import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_USERS_KEY = 'huluxtream_saved_users';

export interface SavedUser {
  username: string;
  password: string;
  serverUrl: string;
  lastLogin: number; // timestamp
}

/**
 * Save a user to the list of saved users
 */
export const saveUser = async (user: Omit<SavedUser, 'lastLogin'>): Promise<void> => {
  try {
    // Get current saved users
    const savedUsers = await getSavedUsers();
    
    // Update or add the user
    const updatedUsers = savedUsers.filter(u => u.username !== user.username);
    updatedUsers.push({
      ...user,
      lastLogin: Date.now()
    });
    
    // Sort by most recent login
    updatedUsers.sort((a, b) => b.lastLogin - a.lastLogin);
    
    // Save back to storage
    await AsyncStorage.setItem(SAVED_USERS_KEY, JSON.stringify(updatedUsers));
  } catch (error) {
    console.error('Error saving user:', error);
  }
};

/**
 * Get all saved users
 */
export const getSavedUsers = async (): Promise<SavedUser[]> => {
  try {
    const data = await AsyncStorage.getItem(SAVED_USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting saved users:', error);
    return [];
  }
};

/**
 * Remove a user from the saved users list
 */
export const removeUser = async (username: string): Promise<void> => {
  try {
    const savedUsers = await getSavedUsers();
    const updatedUsers = savedUsers.filter(user => user.username !== username);
    await AsyncStorage.setItem(SAVED_USERS_KEY, JSON.stringify(updatedUsers));
  } catch (error) {
    console.error('Error removing user:', error);
  }
};

/**
 * Clear all saved users
 */
export const clearAllUsers = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SAVED_USERS_KEY);
  } catch (error) {
    console.error('Error clearing users:', error);
  }
}; 
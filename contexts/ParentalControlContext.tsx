import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { xtreamApi } from '../services/api/xtreamCodesApi';

// Base storage keys
const PARENTAL_CONTROL_ENABLED_KEY_BASE = 'huluxtream_parental_control_enabled';
const PARENTAL_CONTROL_PIN_KEY_BASE = 'huluxtream_parental_control_pin';
const RESTRICTED_CATEGORIES_KEY_BASE = 'huluxtream_restricted_categories';

// Define restricted content categories (IDs would match your content provider's categories)
const ADULT_CATEGORIES = ['18', '82', '83', '84']; // Example category IDs for adult content

// Context type
interface ParentalControlContextType {
  isEnabled: boolean;
  pinCode: string;
  restrictedCategories: string[];
  enableParentalControl: () => Promise<void>;
  disableParentalControl: () => Promise<void>;
  setPIN: (pin: string) => Promise<void>;
  verifyPIN: (pin: string) => boolean;
  isCategoryRestricted: (categoryId: string) => boolean;
  addRestrictedCategory: (categoryId: string) => Promise<void>;
  removeRestrictedCategory: (categoryId: string) => Promise<void>;
  authenticateWithBiometrics: () => Promise<boolean>;
  clearSettings: () => Promise<void>;
}

// Create context
const ParentalControlContext = createContext<ParentalControlContextType | undefined>(undefined);

// Hook for using the context
export const useParentalControl = () => {
  const context = useContext(ParentalControlContext);
  if (context === undefined) {
    throw new Error('useParentalControl must be used within a ParentalControlProvider');
  }
  return context;
};

// Provider props
interface ParentalControlProviderProps {
  children: ReactNode;
}

// Helper to get user-specific storage key
const getUserPrefix = async (): Promise<string> => {
  try {
    // Check if logged in first
    const isLoggedIn = await xtreamApi.isLoggedIn();
    if (isLoggedIn) {
      const userInfo = xtreamApi.getUserInfo();
      if (userInfo && userInfo.username) {
        return `${userInfo.username}_`;
      }
    }
  } catch (error) {
    console.error('Error getting user info:', error);
  }
  
  // Default empty prefix if not logged in or error
  return '';
};

// Get user-specific storage keys
const getUserStorageKeys = async () => {
  const prefix = await getUserPrefix();
  return {
    enabledKey: `${prefix}${PARENTAL_CONTROL_ENABLED_KEY_BASE}`,
    pinKey: `${prefix}${PARENTAL_CONTROL_PIN_KEY_BASE}`,
    categoriesKey: `${prefix}${RESTRICTED_CATEGORIES_KEY_BASE}`
  };
};

// Provider component
export const ParentalControlProvider: React.FC<ParentalControlProviderProps> = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [restrictedCategories, setRestrictedCategories] = useState<string[]>(ADULT_CATEGORIES);
  const [currentUser, setCurrentUser] = useState<string>('');

  // Monitor user changes and reload settings when user changes
  useEffect(() => {
    const checkCurrentUser = async () => {
      try {
        const isLoggedIn = await xtreamApi.isLoggedIn();
        if (isLoggedIn) {
          const userInfo = xtreamApi.getUserInfo();
          if (userInfo && userInfo.username && userInfo.username !== currentUser) {
            setCurrentUser(userInfo.username);
            loadSettings();
          }
        }
      } catch (error) {
        console.error('Error checking current user:', error);
      }
    };

    checkCurrentUser();
  }, [currentUser]);

  // Load saved settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Load settings from storage
  const loadSettings = async () => {
    try {
      const { enabledKey, pinKey, categoriesKey } = await getUserStorageKeys();
      
      const storedIsEnabled = await AsyncStorage.getItem(enabledKey);
      const storedPinCode = await AsyncStorage.getItem(pinKey);
      const storedRestrictedCategories = await AsyncStorage.getItem(categoriesKey);

      if (storedIsEnabled) setIsEnabled(storedIsEnabled === 'true');
      if (storedPinCode) setPinCode(storedPinCode);
      if (storedRestrictedCategories) {
        setRestrictedCategories(JSON.parse(storedRestrictedCategories));
      } else {
        // Set default adult categories for new users
        setRestrictedCategories(ADULT_CATEGORIES);
      }
    } catch (error) {
      console.error('Error loading parental control settings:', error);
    }
  };

  // Enable parental controls
  const enableParentalControl = async () => {
    try {
      const { enabledKey } = await getUserStorageKeys();
      setIsEnabled(true);
      await AsyncStorage.setItem(enabledKey, 'true');
    } catch (error) {
      console.error('Error enabling parental control:', error);
    }
  };

  // Disable parental controls
  const disableParentalControl = async () => {
    try {
      const { enabledKey } = await getUserStorageKeys();
      setIsEnabled(false);
      await AsyncStorage.setItem(enabledKey, 'false');
    } catch (error) {
      console.error('Error disabling parental control:', error);
    }
  };

  // Set PIN code
  const setPIN = async (pin: string) => {
    try {
      const { pinKey } = await getUserStorageKeys();
      setPinCode(pin);
      await AsyncStorage.setItem(pinKey, pin);
    } catch (error) {
      console.error('Error setting PIN:', error);
    }
  };

  // Verify PIN code
  const verifyPIN = (pin: string) => {
    return pin === pinCode;
  };

  // Check if a category is restricted
  const isCategoryRestricted = (categoryId: string) => {
    return isEnabled && restrictedCategories.includes(categoryId);
  };

  // Add a category to restricted list
  const addRestrictedCategory = async (categoryId: string) => {
    try {
      if (!restrictedCategories.includes(categoryId)) {
        const updatedCategories = [...restrictedCategories, categoryId];
        setRestrictedCategories(updatedCategories);
        
        const { categoriesKey } = await getUserStorageKeys();
        await AsyncStorage.setItem(categoriesKey, JSON.stringify(updatedCategories));
      }
    } catch (error) {
      console.error('Error adding restricted category:', error);
    }
  };

  // Remove a category from restricted list
  const removeRestrictedCategory = async (categoryId: string) => {
    try {
      const updatedCategories = restrictedCategories.filter(id => id !== categoryId);
      setRestrictedCategories(updatedCategories);
      
      const { categoriesKey } = await getUserStorageKeys();
      await AsyncStorage.setItem(categoriesKey, JSON.stringify(updatedCategories));
    } catch (error) {
      console.error('Error removing restricted category:', error);
    }
  };

  // Clear all parental control settings
  const clearSettings = async () => {
    try {
      const { enabledKey, pinKey, categoriesKey } = await getUserStorageKeys();
      await AsyncStorage.removeItem(enabledKey);
      await AsyncStorage.removeItem(pinKey);
      await AsyncStorage.removeItem(categoriesKey);
      
      setIsEnabled(false);
      setPinCode('');
      setRestrictedCategories(ADULT_CATEGORIES);
    } catch (error) {
      console.error('Error clearing parental control settings:', error);
    }
  };

  // Authenticate with biometrics
  const authenticateWithBiometrics = async (): Promise<boolean> => {
    try {
      // Check if device supports biometric authentication
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        console.log('Device does not support biometric authentication');
        return false;
      }

      // Check if any biometrics are enrolled
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        console.log('No biometrics enrolled on this device');
        return false;
      }

      // Authenticate
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access restricted content',
        fallbackLabel: 'Use PIN instead',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  };

  // Context value
  const value = {
    isEnabled,
    pinCode,
    restrictedCategories,
    enableParentalControl,
    disableParentalControl,
    setPIN,
    verifyPIN,
    isCategoryRestricted,
    addRestrictedCategory,
    removeRestrictedCategory,
    authenticateWithBiometrics,
    clearSettings,
  };

  return (
    <ParentalControlContext.Provider value={value}>
      {children}
    </ParentalControlContext.Provider>
  );
}; 
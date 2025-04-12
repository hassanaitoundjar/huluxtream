import { useState, useEffect } from 'react';
import { Dimensions, Platform, ScaledSize } from 'react-native';

// Define constants for screen sizes
const TABLET_BREAKPOINT = 768;
const TV_BREAKPOINT = 1200;

interface ScreenSizeHook {
  isTV: boolean;
  isTablet: boolean;
  isPhone: boolean;
  width: number;
  height: number;
}

export const useScreenSize = (): ScreenSizeHook => {
  const [dimensions, setDimensions] = useState<ScaledSize>(Dimensions.get('window'));
  
  useEffect(() => {
    // Handle screen dimension changes
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    
    return () => {
      // Clean up subscription
      subscription.remove();
    };
  }, []);
  
  const { width, height } = dimensions;
  
  // Detect if running on TV platform (e.g., Android TV, Apple TV)
  const isTV = Platform.isTV || Platform.OS === 'android' && width >= TV_BREAKPOINT;
  
  // Detect if it's a tablet
  const isTablet = width >= TABLET_BREAKPOINT && width < TV_BREAKPOINT;
  
  // Anything else is considered a phone
  const isPhone = !isTV && !isTablet;
  
  return {
    isTV,
    isTablet,
    isPhone,
    width,
    height
  };
}; 
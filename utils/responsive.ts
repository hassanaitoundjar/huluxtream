import { Dimensions, Platform, PixelRatio, ScaledSize } from 'react-native';

// Get device window dimensions
const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

// Device type detection (rough estimation)
const isTV = Platform.isTV || (Platform.OS === 'android' && WINDOW_WIDTH > 1200);
const isTablet = !isTV && WINDOW_WIDTH > 768;
const isPhone = !isTV && !isTablet;

// Base dimensions to scale from (design specs)
const baseWidth = 375; // Base width (iPhone 8/X design spec)
const baseHeight = 812; // Base height (iPhone X design spec)

// Responsive width and height percentages
const widthPercentage = WINDOW_WIDTH / baseWidth;
const heightPercentage = WINDOW_HEIGHT / baseHeight;

// Use the shorter of the two to ensure content fits on screen
const scale = Math.min(widthPercentage, heightPercentage);

// For text scaling
const fontScale = (size: number) => {
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

// For dimensions scaling
const horizontalScale = (size: number) => size * widthPercentage;
const verticalScale = (size: number) => size * heightPercentage;
const moderateScale = (size: number, factor = 0.5) => size + (horizontalScale(size) - size) * factor;

// TV specific adjustments
const tvScale = (size: number) => isTV ? size * 1.5 : size;
const tvFontScale = (size: number) => isTV ? size * 1.3 : fontScale(size);

// Padding and margin that looks good on all devices
const responsiveSpacing = (size: number) => {
  if (isTV) return size * 2;
  if (isTablet) return size * 1.5;
  return moderateScale(size);
};

// Get appropriate touch target size based on platform
const getTouchableSize = () => {
  if (isTV) return 70;   // Larger for TV remote navigation
  if (isTablet) return 60;  // Medium for tablet touch
  return 44;  // Standard minimum touch target for phones
};

// Screen dimension change listener
const listenToScreenDimensionChanges = (callback: (dimensions: ScaledSize) => void) => {
  return Dimensions.addEventListener('change', ({ window }) => {
    callback(window);
  });
};

// Device type getters
const getDeviceType = () => {
  return { isTV, isTablet, isPhone };
};

// Get dimensions values
const getScreenDimensions = () => {
  return { width: WINDOW_WIDTH, height: WINDOW_HEIGHT };
};

// Create dynamic grid columns based on screen size
const getGridColumns = () => {
  if (isTV) return 5;
  if (isTablet) return 4;
  if (WINDOW_WIDTH > 480) return 3; // Larger phones
  return 2; // Small phones
};

// Calculate item width based on number of columns, with spacing
const getItemWidth = (columns: number, spacing: number = 10) => {
  const totalSpacing = spacing * (columns + 1);
  return (WINDOW_WIDTH - totalSpacing) / columns;
};

export {
  fontScale,
  horizontalScale,
  verticalScale,
  moderateScale,
  tvScale,
  tvFontScale,
  responsiveSpacing,
  getTouchableSize,
  getDeviceType,
  getScreenDimensions,
  listenToScreenDimensionChanges,
  getGridColumns,
  getItemWidth,
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  isTV,
  isTablet,
  isPhone
}; 
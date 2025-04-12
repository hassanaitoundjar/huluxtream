import {
  fontScale,
  tvFontScale,
  responsiveSpacing,
  isTV,
  isTablet,
  isPhone,
  getTouchableSize,
  WINDOW_WIDTH,
  WINDOW_HEIGHT
} from '@/utils/responsive';

// App theme with responsive values for different device types
const theme = {
  // Colors
  colors: {
    primary: '#1ce783',
    secondary: '#0f1014',
    background: '#0f1014',
    card: '#1a1c20',
    cardLight: '#2a2c30',
    text: '#ffffff',
    textSecondary: '#aaaaaa',
    textMuted: '#777777',
    border: '#333333',
    error: '#ff5252',
    warning: '#FFC107',
    success: '#4CAF50',
  },

  // Typography
  typography: {
    // Font size variations for different device types
    fontSize: {
      tiny: tvFontScale(10),
      small: tvFontScale(12),
      body: tvFontScale(14),
      subtitle: tvFontScale(16),
      title: tvFontScale(18),
      large: tvFontScale(20),
      xlarge: tvFontScale(24),
      xxlarge: tvFontScale(28),
      heading: tvFontScale(isTV ? 36 : isTablet ? 32 : 28),
    },
    fontWeight: {
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      heavy: '800',
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.7,
    },
  },

  // Spacing
  spacing: {
    xs: responsiveSpacing(4),
    s: responsiveSpacing(8),
    m: responsiveSpacing(16),
    l: responsiveSpacing(24),
    xl: responsiveSpacing(32),
    xxl: responsiveSpacing(48),
  },

  // Borders
  borders: {
    radius: {
      small: isTV ? 8 : 4,
      medium: isTV ? 12 : 8,
      large: isTV ? 20 : 16,
      pill: 999,
    },
    width: {
      thin: 1,
      medium: 2,
      thick: 4,
    },
  },

  // Sizing
  sizing: {
    touchable: {
      minHeight: getTouchableSize(),
      icon: isTV ? 42 : 24,
      smallIcon: isTV ? 24 : 16,
      largeIcon: isTV ? 60 : 32,
    },
    header: {
      height: isTV ? 100 : isTablet ? 80 : 60,
    },
    tabBar: {
      height: isTV ? 80 : isTablet ? 70 : 60,
    },
    card: {
      width: isTablet ? WINDOW_WIDTH / 4 - 20 : isPhone ? WINDOW_WIDTH / 2 - 20 : WINDOW_WIDTH / 5 - 20,
      aspectRatio: 2/3,
    },
  },

  // Shadows
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4, 
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
  },

  // Animation presets
  animations: {
    fast: 200,
    normal: 350,
    slow: 500,
  },

  // Device specific overrides
  device: {
    isTV,
    isTablet,
    isPhone,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
  },
};

export default theme; 
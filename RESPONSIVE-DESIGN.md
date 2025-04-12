# Responsive Design System

This document outlines the responsive design system implemented in the HuluxTream application to ensure proper display and functionality across various device types, including phones, tablets, TVs, and other smart devices.

## Overview

The responsive design system automatically adapts the UI based on device characteristics, ensuring an optimal experience whether the app is being used on a small smartphone or a large TV with remote control navigation.

## Components

### 1. Responsive Utilities (`utils/responsive.ts`)

This file contains core functions for responsive design:

- Device detection (TV, tablet, phone)
- Responsive scaling for dimensions
- Font scaling
- Spacing adjustments for different screen sizes
- Touch target sizing
- Grid layout calculations

### 2. Theme System (`styles/theme.ts`)

A centralized theme that provides responsive values for:

- Typography
- Spacing
- Border radii
- Element sizing
- Color palette
- Shadows and effects

## Using the Responsive System

### Responsive Dimensions

```javascript
import { 
  getGridColumns, 
  getItemWidth, 
  WINDOW_WIDTH, 
  WINDOW_HEIGHT 
} from '@/utils/responsive';

// Calculate grid layout
const NUM_COLUMNS = getGridColumns(); // Automatically determines optimal column count
const ITEM_WIDTH = getItemWidth(NUM_COLUMNS, 10); // Width with 10px spacing
```

### Responsive Fonts

```javascript
import { fontScale, tvFontScale } from '@/utils/responsive';

// In your styles
const styles = StyleSheet.create({
  title: {
    fontSize: tvFontScale(18), // Automatically scales for TV displays
  },
  body: {
    fontSize: fontScale(14), // General screen size scaling
  }
});
```

### Responsive Spacing

```javascript
import { responsiveSpacing } from '@/utils/responsive';

// In your styles
const styles = StyleSheet.create({
  container: {
    padding: responsiveSpacing(16), // Adapts padding for device size
    margin: responsiveSpacing(8),
  }
});
```

### Device-Specific Adjustments

```javascript
import { isTV, isTablet, isPhone } from '@/utils/responsive';

// Conditional rendering
{isTV && <TVSpecificComponent />}
{isTablet && <TabletLayout />}
{isPhone && <PhoneLayout />}

// In styles
const styles = StyleSheet.create({
  header: {
    height: isTV ? 100 : (isTablet ? 80 : 60),
  }
});
```

### Using the Theme

```javascript
import theme from '@/styles/theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.m,
    borderRadius: theme.borders.radius.medium,
  },
  heading: {
    fontSize: theme.typography.fontSize.large,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  }
});
```

## TV-Specific Considerations

For TV devices, we make several specific adjustments:

1. **Focus Management**: We use `hasTVPreferredFocus` prop to control initial focus
2. **Larger Touch Targets**: All interactive elements are enlarged
3. **Simplified Navigation**: Fewer columns and more straightforward UI patterns
4. **Font Scaling**: Text is enlarged for readability at a distance
5. **Remote-Friendly**: Controls are adapted for D-pad navigation

```javascript
<TouchableOpacity
  style={styles.button}
  hasTVPreferredFocus={isTV}
  onPress={handlePress}
>
  <Text style={{ fontSize: tvFontScale(16) }}>Press Me</Text>
</TouchableOpacity>
```

## Responsive Component Examples

The following components have been updated to be fully responsive:

1. `app/(main)/(tabs)/series.tsx` - Grid layout example
2. `app/movie-details.tsx` - Detail layout example
3. `app/(main)/(tabs)/favorites.tsx` - Card and list layout example

## Adding Responsive Design to New Components

When creating new components:

1. Import needed utilities from `@/utils/responsive`
2. Use dynamic values for dimensions, font sizes, and spacing
3. Consider device type variations using conditional styles
4. Test across multiple device sizes
5. Ensure TV navigation works properly with focus management

## Testing Responsive Design

Test your components on:

1. Small phones (< 375px width)
2. Large phones (> 390px width)
3. Tablets (> 768px width)
4. TVs (connected to Android/Apple TV)

You can simulate different screen sizes using React Native's Dimensions API:

```javascript
import { Dimensions } from 'react-native';
const dimensions = Dimensions.get('window');
console.log(`Current dimensions: ${dimensions.width}x${dimensions.height}`);
```

## Best Practices

1. **Never hardcode pixel values** - Use responsive utilities instead
2. **Consider different input methods** - Touch, remote, keyboard
3. **Test on actual devices** when possible
4. **Use relative units** rather than absolute when possible
5. **Consider orientation changes** by listening to dimension changes 
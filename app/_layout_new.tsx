import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '../contexts/AuthContext';
import { FavoritesProvider } from '../contexts/FavoritesContext';
import { ParentalControlProvider } from '../contexts/ParentalControlContext';
import { WatchHistoryProvider } from '../contexts/WatchHistoryContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <FavoritesProvider>
        <ParentalControlProvider>
          <WatchHistoryProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack screenOptions={{ animation: 'fade' }}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(main)" options={{ headerShown: false }} />
                <Stack.Screen name="player" options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="live-player-route" options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="vod-player-route" options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="series-player-route" options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="movie-details" options={{ headerShown: false }} />
                <Stack.Screen name="series-details" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
              </Stack>
              <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            </ThemeProvider>
          </WatchHistoryProvider>
        </ParentalControlProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
} 
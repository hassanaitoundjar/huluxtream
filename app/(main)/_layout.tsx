import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function MainLayout() {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !isLoggedIn) {
      router.replace('/(auth)');
    }
  }, [isLoggedIn, isLoading, router]);

  // Show nothing while checking authentication
  if (isLoading || !isLoggedIn) {
    return null;
  }
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
} 
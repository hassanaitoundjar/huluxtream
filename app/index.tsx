import { Redirect } from 'expo-router';

export default function Index() {
  // By default, redirect to the home screen or main tab
  return <Redirect href="/(main)/(tabs)" />;
} 
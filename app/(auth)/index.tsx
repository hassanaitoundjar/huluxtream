import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, StatusBar } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function WelcomeScreen() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to main app if already logged in
    if (isLoggedIn) {
      router.replace('/(main)/(tabs)');
    }
  }, [isLoggedIn, router]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.backgroundImage, {backgroundColor: '#0f1014'}]}>
        <LinearGradient
          colors={['rgba(15,16,20,1)', 'rgba(26,28,32,0.9)', 'rgba(15,16,20,1)']}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>HuluXtream</Text>
            </View>
            
            <View style={styles.taglineContainer}>
              <Text style={styles.tagline}>
                Your Ultimate IPTV Experience
              </Text>
              <Text style={styles.subtitle}>
                Watch Live TV, Movies, and Series anytime, anywhere.
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.button}
                onPress={() => router.push('/login')}
              >
                <Text style={styles.buttonText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 80,
  },
  content: {
    padding: 20,
    height: '100%',
    justifyContent: 'space-between',
    paddingTop: 100,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#1ce783', // Hulu green color
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  taglineContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  tagline: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    paddingHorizontal: 40,
    marginTop: 20,
  },
  button: {
    backgroundColor: '#1ce783', // Hulu green color
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonIcon: {
    marginLeft: 10,
    color: '#000000',
  },
}); 
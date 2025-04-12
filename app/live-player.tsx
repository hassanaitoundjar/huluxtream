import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform,
  StatusBar,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { xtreamApi } from '../services/api/xtreamCodesApi';
import { useParentalControl } from '../contexts/ParentalControlContext';

const { width, height } = Dimensions.get('window');

export default function LivePlayerScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [channelCategory, setChannelCategory] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { isEnabled, isCategoryRestricted, authenticateWithBiometrics, verifyPIN } = useParentalControl();

  // Auto-hide controls after 5 seconds
  useEffect(() => {
    if (showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  // Function to prompt user for PIN
  const promptForPIN = () => {
    return new Promise<boolean>((resolve) => {
      Alert.prompt(
        'Parental Control',
        'This content is restricted. Please enter your PIN to continue.',
        [
          {
            text: 'Cancel',
            onPress: () => resolve(false),
            style: 'cancel',
          },
          {
            text: 'Submit',
            onPress: (pin) => {
              if (!pin) {
                resolve(false);
                return;
              }
              
              const isValid = verifyPIN(pin);
              resolve(isValid);
            },
          },
        ],
        'secure-text'
      );
    });
  };

  // Check if content is restricted and authenticate if needed
  const checkParentalRestrictions = async (categoryId: string) => {
    if (isEnabled && isCategoryRestricted(categoryId)) {
      // Try biometric authentication first if available
      let isAuthenticated = await authenticateWithBiometrics();
      
      // If biometrics failed or not available, prompt for PIN
      if (!isAuthenticated) {
        isAuthenticated = await promptForPIN();
      }
      
      // If authentication failed, navigate back
      if (!isAuthenticated) {
        setError('Access denied: Content restricted by parental controls');
        return false;
      }
    }
    // Either not restricted or authentication successful
    return true;
  };

  // Load the stream when component mounts
  useEffect(() => {
    const loadStream = async () => {
      try {
        if (!id) {
          throw new Error('Invalid stream parameters');
        }

        const streamId = Number(id);
        
        // First get the channel info to check its category
        const channels = await xtreamApi.getLiveStreams();
        const channel = channels.find(c => c.stream_id === streamId);
        
        if (!channel) {
          throw new Error('Channel not found');
        }
        
        // Store the category ID for parental control checks
        setChannelCategory(channel.category_id);
        
        // Check parental restrictions
        const isAllowed = await checkParentalRestrictions(channel.category_id);
        if (!isAllowed) {
          // Don't load the stream if not allowed
          router.back();
          return;
        }
        
        // Proceed with loading the stream
        const url = xtreamApi.getLiveStreamUrl(streamId);
        console.log('Live stream URL:', url);
        setStreamUrl(url);
      } catch (err: any) {
        console.error('Error loading live stream:', err);
        setError(err.message || 'Failed to load live stream');
      } finally {
        setLoading(false);
      }
    };

    loadStream();
  }, [id]);

  // Handle playback status updates
  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (status.isPlaying) {
        setIsPlaying(true);
        setLoading(false);
      } else {
        setIsPlaying(false);
      }
    } else if (status.error) {
      console.error('Video playback error:', status.error);
      setError(`Playback error: ${status.error}`);
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleError = () => {
    setError('Failed to play the live stream. The stream may be unavailable or your connection is unstable.');
    setLoading(false);
  };

  const restartStream = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (videoRef.current) {
        await videoRef.current.unloadAsync();
        await videoRef.current.loadAsync(
          { uri: streamUrl },
          { shouldPlay: true },
          false
        );
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error restarting stream:', err);
      setError('Failed to restart the stream.');
      setLoading(false);
    }
  };

  const tryExternalPlayer = async () => {
    if (!streamUrl) return;
    
    try {
      // Check if the device can open the URL
      const canOpen = await Linking.canOpenURL(streamUrl);
      
      if (canOpen) {
        Alert.alert(
          "Open External Player",
          "Would you like to open this stream in an external player?",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Open", 
              onPress: () => Linking.openURL(streamUrl) 
            }
          ]
        );
      } else {
        Alert.alert(
          "Stream URL",
          "Copy this URL to play in an external application:",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Copy URL", 
              onPress: () => {
                // In a real app, you would use Clipboard.setStringAsync(streamUrl)
                Alert.alert("URL:", streamUrl);
              } 
            }
          ]
        );
      }
    } catch (err) {
      console.error('External player error:', err);
      Alert.alert("Error", "Could not open external player.");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      <TouchableOpacity 
        style={styles.playerContainer} 
        activeOpacity={1}
        onPress={toggleControls}
      >
        {streamUrl ? (
          <View style={styles.playerWrapper}>
            <Video
              ref={videoRef}
              source={{ uri: streamUrl }}
              style={styles.videoPlayer}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={true}
              isLooping={false}
              onPlaybackStatusUpdate={onPlaybackStatusUpdate}
              onError={handleError}
              useNativeControls={false}
            />
          </View>
        ) : null}
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1ce783" />
            <Text style={styles.loadingText}>Loading live stream...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={30} color="#ff5252" />
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.errorButtons}>
              <TouchableOpacity style={styles.errorButton} onPress={handleBackPress}>
                <Text style={styles.errorButtonText}>Go Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.errorButton} onPress={restartStream}>
                <Text style={styles.errorButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
            
            {streamUrl && (
              <TouchableOpacity 
                style={[styles.errorButton, {marginTop: 10, backgroundColor: '#4285F4'}]}
                onPress={tryExternalPlayer}
              >
                <Text style={styles.errorButtonText}>Try External Player</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {showControls && !error && (
          <View style={styles.controlsOverlay}>
            <View style={styles.topControls}>
              <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.titleText}>{title || 'Live Stream'}</Text>
              <TouchableOpacity style={styles.fullscreenButton}>
                <Ionicons name="expand" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.centerControls}>
              <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={50}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.bottomControls}>
              <Text style={styles.liveIndicator}>● LIVE</Text>
              <TouchableOpacity style={styles.settingsButton}>
                <Ionicons name="settings-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  playerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  playerWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  errorButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  errorButton: {
    backgroundColor: '#1ce783',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginHorizontal: 10,
  },
  errorButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
    padding: 16,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'ios' ? 40 : 16,
  },
  backButton: {
    padding: 8,
  },
  titleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  fullscreenButton: {
    padding: 8,
  },
  centerControls: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  liveIndicator: {
    color: '#ff0000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  settingsButton: {
    padding: 8,
  },
}); 
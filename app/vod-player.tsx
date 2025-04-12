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
  Image,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { xtreamApi } from '../services/api/xtreamCodesApi';
import { useParentalControl } from '../contexts/ParentalControlContext';
import { useWatchHistory } from '../contexts/WatchHistoryContext';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export default function VodPlayerScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [movieDetails, setMovieDetails] = useState<any>(null);
  const [showMovieInfo, setShowMovieInfo] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<Video>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { isEnabled, isCategoryRestricted, authenticateWithBiometrics, verifyPIN } = useParentalControl();
  const { addToWatchHistory, updateWatchProgress } = useWatchHistory();

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
    const loadMovie = async () => {
      try {
        if (!id) {
          throw new Error('Invalid movie parameters');
        }

        const movieId = Number(id);
        
        // First get the movie info
        const movies = await xtreamApi.getVodStreams();
        const movie = movies.find(m => m.stream_id === movieId);
        
        if (!movie) {
          throw new Error('Movie not found');
        }
        
        // Check parental restrictions
        const isAllowed = await checkParentalRestrictions(movie.category_id);
        if (!isAllowed) {
          // Don't load the movie if not allowed
          router.back();
          return;
        }

        // Get detailed movie information
        try {
          const details = await xtreamApi.getVodInfo(movieId);
          setMovieDetails(details.info || details);
          
          // Add to watch history when starting to watch
          addToWatchHistory({
            id: movieId,
            name: title as string || movie.name,
            type: 'movie',
            imageUrl: movie.stream_icon,
            lastWatched: Date.now(),
            watchedAt: 0,
            duration: 0, // We'll update this when we get the actual duration
            data: movie
          });
        } catch (err) {
          console.warn('Could not fetch detailed movie info:', err);
          // Continue even if details can't be loaded
        }
        
        // Proceed with loading the stream
        const url = xtreamApi.getVodStreamUrl(movieId);
        console.log('VOD stream URL:', url);
        setStreamUrl(url);
      } catch (err: any) {
        console.error('Error loading VOD stream:', err);
        setError(err.message || 'Failed to load movie');
      } finally {
        setLoading(false);
      }
    };

    loadMovie();
    
    // Set up interval to periodically update watch progress
    progressUpdateIntervalRef.current = setInterval(() => {
      if (id && position > 0 && duration > 0) {
        updateWatchProgress(Number(id), 'movie', position, duration);
      }
    }, 10000); // Update every 10 seconds
    
    return () => {
      // Clear interval on unmount
      if (progressUpdateIntervalRef.current) {
        clearInterval(progressUpdateIntervalRef.current);
      }
      
      // Final update of watch progress when leaving
      if (id && position > 0 && duration > 0) {
        updateWatchProgress(Number(id), 'movie', position, duration);
      }
    };
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
      
      // Track position and duration for watch history
      if (status.positionMillis !== undefined) {
        setPosition(status.positionMillis);
      }
      
      if (status.durationMillis !== undefined && status.durationMillis > 0) {
        setDuration(status.durationMillis);
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

  const toggleMovieInfo = () => {
    setShowMovieInfo(!showMovieInfo);
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleError = () => {
    setError('Failed to play the movie. The stream may be unavailable or your connection is unstable.');
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

  // Render movie info overlay
  const renderMovieInfo = () => {
    if (!movieDetails) return null;
    
    return (
      <BlurView intensity={80} style={styles.movieInfoContainer}>
        <View style={styles.movieInfoContent}>
          <TouchableOpacity style={styles.closeButton} onPress={toggleMovieInfo}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          
          <ScrollView style={styles.infoScrollView}>
            <Text style={styles.movieTitle}>{movieDetails.name || title}</Text>
            
            <View style={styles.movieMetadata}>
              {movieDetails.releasedate && (
                <Text style={styles.metadataItem}>{movieDetails.releasedate.substring(0, 4)}</Text>
              )}
              {movieDetails.duration && (
                <Text style={styles.metadataItem}>{movieDetails.duration}</Text>
              )}
              {movieDetails.rating && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#FFC107" />
                  <Text style={styles.rating}>{movieDetails.rating}/10</Text>
                </View>
              )}
            </View>
            
            {movieDetails.genre && (
              <View style={styles.genreContainer}>
                <Text style={styles.genreLabel}>Genres: </Text>
                <Text style={styles.genreText}>{movieDetails.genre}</Text>
              </View>
            )}
            
            {movieDetails.plot && (
              <View style={styles.plotContainer}>
                <Text style={styles.plotLabel}>Plot</Text>
                <Text style={styles.plotText}>{movieDetails.plot}</Text>
              </View>
            )}
            
            {movieDetails.cast && (
              <View style={styles.castContainer}>
                <Text style={styles.castLabel}>Cast</Text>
                <Text style={styles.castText}>{movieDetails.cast}</Text>
              </View>
            )}
            
            {movieDetails.director && (
              <View style={styles.directorContainer}>
                <Text style={styles.directorLabel}>Director</Text>
                <Text style={styles.directorText}>{movieDetails.director}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </BlurView>
    );
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
            <Text style={styles.loadingText}>Loading movie...</Text>
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
              <Text style={styles.titleText}>{title || 'Movie'}</Text>
              <TouchableOpacity style={styles.infoButton} onPress={toggleMovieInfo}>
                <Ionicons name="information-circle-outline" size={28} color="#fff" />
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
              <View />
              <TouchableOpacity style={styles.settingsButton}>
                <Ionicons name="settings-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showMovieInfo && renderMovieInfo()}
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
  infoButton: {
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
  settingsButton: {
    padding: 8,
  },
  movieInfoContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  movieInfoContent: {
    width: '90%',
    height: '80%',
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderRadius: 10,
    padding: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  infoScrollView: {
    marginTop: 30,
  },
  movieTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  movieMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  metadataItem: {
    color: '#aaa',
    marginRight: 15,
    fontSize: 14,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 14,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  genreLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  genreText: {
    color: '#fff',
    fontSize: 14,
  },
  plotContainer: {
    marginBottom: 15,
  },
  plotLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  plotText: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
  },
  castContainer: {
    marginBottom: 15,
  },
  castLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  castText: {
    color: '#ddd',
    fontSize: 14,
  },
  directorContainer: {
    marginBottom: 15,
  },
  directorLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  directorText: {
    color: '#ddd',
    fontSize: 14,
  },
}); 
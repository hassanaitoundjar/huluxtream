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
import { xtreamApi } from '@/services/api/xtreamCodesApi';
import { useParentalControl } from '@/contexts/ParentalControlContext';
import { useWatchHistory } from '@/contexts/WatchHistoryContext';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export default function SeriesPlayerScreen() {
  const { seriesId, episodeId, title, season, episode } = useLocalSearchParams<{ 
    seriesId: string; 
    episodeId: string;
    title: string;
    season: string;
    episode: string;
  }>();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [episodeDetails, setEpisodeDetails] = useState<any>(null);
  const [seriesDetails, setSeriesDetails] = useState<any>(null);
  const [showEpisodeInfo, setShowEpisodeInfo] = useState(false);
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
    const loadEpisode = async () => {
      try {
        if (!seriesId || !episodeId) {
          throw new Error('Invalid episode parameters');
        }

        const sId = Number(seriesId);
        
        // First get the series info to get category_id for parental control
        const seriesInfo = await xtreamApi.getSeriesInfo(sId);
        setSeriesDetails(seriesInfo.info || seriesInfo);
        
        // Check parental restrictions
        const isAllowed = await checkParentalRestrictions(seriesInfo.info.category_id);
        if (!isAllowed) {
          // Don't load the episode if not allowed
          router.back();
          return;
        }

        // Find the current episode details
        let currentEpisode = null;
        if (seriesInfo.episodes && season) {
          const seasonEpisodes = seriesInfo.episodes[season];
          if (seasonEpisodes) {
            currentEpisode = seasonEpisodes.find((ep: any) => ep.id === episodeId);
            if (currentEpisode) {
              setEpisodeDetails(currentEpisode);
              
              // Add to watch history when starting to watch
              addToWatchHistory({
                id: sId,
                name: title as string || `${seriesInfo.info.name} - S${season}E${episode}`,
                type: 'movie', // Reusing movie type for now, can be expanded later
                imageUrl: seriesInfo.info.cover,
                lastWatched: Date.now(),
                watchedAt: 0,
                duration: 0, // We'll update this when we get the actual duration
                data: {
                  ...seriesInfo.info,
                  stream_id: sId,
                  episode_info: currentEpisode
                }
              });
            }
          }
        }
        
        // If we can't find the episode or there's no episode data
        if (!currentEpisode) {
          console.warn("Episode not found in series data");
        }
        
        // Try HLS format first, which is more widely supported
        let url = xtreamApi.getSeriesStreamUrl(sId, episodeId, 'm3u8');
        console.log('Series episode stream URL (HLS):', url);
        setStreamUrl(url);
      } catch (err: any) {
        console.error('Error loading episode stream:', err);
        setError(err.message || 'Failed to load episode');
      } finally {
        setLoading(false);
      }
    };

    loadEpisode();
    
    // Set up interval to periodically update watch progress
    progressUpdateIntervalRef.current = setInterval(() => {
      if (seriesId && position > 0 && duration > 0) {
        updateWatchProgress(Number(seriesId), 'movie', position, duration);
      }
    }, 10000); // Update every 10 seconds
    
    return () => {
      // Clear interval on unmount
      if (progressUpdateIntervalRef.current) {
        clearInterval(progressUpdateIntervalRef.current);
      }
      
      // Final update of watch progress when leaving
      if (seriesId && position > 0 && duration > 0) {
        updateWatchProgress(Number(seriesId), 'movie', position, duration);
      }
    };
  }, [seriesId, episodeId]);

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
      // Try external player automatically if internal player fails
      tryExternalPlayer();
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

  const toggleEpisodeInfo = () => {
    setShowEpisodeInfo(!showEpisodeInfo);
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleError = () => {
    setError('Failed to play the episode. The stream may be unavailable or your connection is unstable.');
    setLoading(false);
  };

  const restartStream = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try different formats in sequence: m3u8 (HLS), ts, mp4
      const formats = ['m3u8', 'ts', 'mp4'];
      let currentFormatIndex = 0;
      
      // Determine current format from URL
      const currentFormat = streamUrl.split('.').pop() || 'mp4';
      const currentIndex = formats.indexOf(currentFormat);
      
      // Start with the next format after the current one
      if (currentIndex >= 0) {
        currentFormatIndex = (currentIndex + 1) % formats.length;
      }
      
      // Get the next format to try
      const newFormat = formats[currentFormatIndex];
      console.log(`Trying format: ${newFormat}`);
      
      // Generate new URL with the next format
      const sId = Number(seriesId);
      const newUrl = xtreamApi.getSeriesStreamUrl(sId, episodeId as string, newFormat as any);
      console.log(`New stream URL: ${newUrl}`);
      
      // Update the stream URL
      setStreamUrl(newUrl);
      
      // Reload the video with the new URL
      if (videoRef.current) {
        await videoRef.current.unloadAsync();
        await videoRef.current.loadAsync(
          { uri: newUrl },
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

  // Render episode info overlay
  const renderEpisodeInfo = () => {
    if (!episodeDetails || !seriesDetails) return null;
    
    return (
      <BlurView intensity={80} style={styles.episodeInfoContainer}>
        <View style={styles.episodeInfoContent}>
          <TouchableOpacity style={styles.closeButton} onPress={toggleEpisodeInfo}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          
          <ScrollView style={styles.infoScrollView}>
            <Text style={styles.seriesTitle}>{seriesDetails.name}</Text>
            <Text style={styles.episodeTitle}>
              S{season}E{episode}: {episodeDetails.title || `Episode ${episodeDetails.episode_num}`}
            </Text>
            
            <View style={styles.episodeMetadata}>
              {episodeDetails.info?.releasedate && (
                <Text style={styles.metadataItem}>{episodeDetails.info.releasedate.substring(0, 4)}</Text>
              )}
              {episodeDetails.info?.duration && (
                <Text style={styles.metadataItem}>{episodeDetails.info.duration}</Text>
              )}
              {episodeDetails.info?.rating && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#FFC107" />
                  <Text style={styles.rating}>{episodeDetails.info.rating}/10</Text>
                </View>
              )}
            </View>
            
            {episodeDetails.info?.plot && (
              <View style={styles.plotContainer}>
                <Text style={styles.plotLabel}>Plot</Text>
                <Text style={styles.plotText}>{episodeDetails.info.plot}</Text>
              </View>
            )}
            
            {seriesDetails.genre && (
              <View style={styles.genreContainer}>
                <Text style={styles.genreLabel}>Genre: </Text>
                <Text style={styles.genreText}>{seriesDetails.genre}</Text>
              </View>
            )}
            
            {seriesDetails.cast && (
              <View style={styles.castContainer}>
                <Text style={styles.castLabel}>Cast</Text>
                <Text style={styles.castText}>{seriesDetails.cast}</Text>
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
            <Text style={styles.loadingText}>Loading episode...</Text>
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
              <Text style={styles.titleText}>
                {title || (seriesDetails ? `${seriesDetails.name} - S${season}E${episode}` : 'Episode')}
              </Text>
              <TouchableOpacity style={styles.infoButton} onPress={toggleEpisodeInfo}>
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

        {showEpisodeInfo && renderEpisodeInfo()}
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
  episodeInfoContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeInfoContent: {
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
  seriesTitle: {
    color: '#aaa',
    fontSize: 18,
    marginBottom: 4,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  episodeMetadata: {
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
}); 
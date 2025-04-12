import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { xtreamApi } from '@/services/api/xtreamCodesApi';
import YoutubeIframe from 'react-native-youtube-iframe';
import { useFavorites } from '@/contexts/FavoritesContext';
import {
  fontScale,
  tvFontScale,
  responsiveSpacing,
  getTouchableSize,
  isTV,
  isTablet,
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  moderateScale
} from '@/utils/responsive';

// Use responsive dimensions
const { width, height } = { width: WINDOW_WIDTH, height: WINDOW_HEIGHT };

export default function MovieDetailsScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movieDetails, setMovieDetails] = useState<any>(null);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [playing, setPlaying] = useState(false);
  const router = useRouter();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    const loadMovieDetails = async () => {
      try {
        if (!id) {
          throw new Error('Invalid movie ID');
        }

        const movieId = Number(id);
        
        // Fetch detailed movie information
        const details = await xtreamApi.getVodInfo(movieId);
        setMovieDetails(details.info || details);
        
        // Check favorite status
        setIsFavorited(isFavorite(movieId, 'movie'));
        
        // Check for trailer
        if (details.info?.youtube_trailer) {
          // Extract YouTube ID
          const trailerIdOrUrl = details.info.youtube_trailer;
          // If it's a full URL, extract the ID
          if (trailerIdOrUrl.includes('youtu.be/') || trailerIdOrUrl.includes('youtube.com/')) {
            const idMatch = trailerIdOrUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?/]+)/);
            if (idMatch && idMatch[1]) {
              setYoutubeId(idMatch[1]);
            }
          } else {
            // Assume it's already an ID
            setYoutubeId(trailerIdOrUrl);
          }
        }
      } catch (err: any) {
        console.error('Error loading movie details:', err);
        setError(err.message || 'Failed to load movie details');
      } finally {
        setLoading(false);
      }
    };

    loadMovieDetails();
  }, [id, isFavorite]);

  useEffect(() => {
    // Pause the video when modal is closed
    if (!showTrailer) {
      setPlaying(false);
    } else {
      setPlaying(true);
    }
  }, [showTrailer]);

  const handlePlayMovie = () => {
    router.push({
      pathname: "/vod-player-route",
      params: { 
        id: id as string, 
        title: title as string,
      }
    });
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleTrailerPress = () => {
    setShowTrailer(true);
  };

  const closeTrailer = () => {
    setShowTrailer(false);
  };

  const onStateChange = useCallback((state: string) => {
    if (state === 'ended') {
      setPlaying(false);
    }
  }, []);

  const hasTrailer = !!youtubeId;

  const handleFavoriteToggle = async () => {
    try {
      const movieId = Number(id);
      
      if (isFavorited) {
        await removeFavorite(movieId, 'movie');
        setIsFavorited(false);
      } else {
        await addFavorite({
          id: movieId,
          name: title as string || movieDetails.name,
          type: 'movie',
          imageUrl: movieDetails.movie_image,
          data: movieDetails
        });
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={isTV ? 'large' : 'large'} color="#1ce783" />
        <Text style={[styles.loadingText, { fontSize: tvFontScale(16) }]}>Loading movie details...</Text>
      </View>
    );
  }

  if (error || !movieDetails) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={isTV ? 80 : 50} color="#ff5252" />
        <Text style={[styles.errorText, { fontSize: tvFontScale(16) }]}>{error || 'Movie details not available'}</Text>
        <TouchableOpacity 
          style={[styles.backButton, { 
            paddingVertical: responsiveSpacing(12),
            paddingHorizontal: responsiveSpacing(24),
            borderRadius: moderateScale(8)
          }]} 
          onPress={handleBackPress}
          hasTVPreferredFocus={isTV}
        >
          <Text style={[styles.backButtonText, { fontSize: tvFontScale(16) }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView style={styles.scrollView}>
        <View style={[styles.headerContainer, { height: isTV ? height * 0.5 : (isTablet ? height * 0.45 : height * 0.4) }]}>
          <Image
            source={
              movieDetails.movie_image
                ? { uri: movieDetails.movie_image }
                : { uri: 'https://via.placeholder.com/800x450/333/ccc?text=No+Image' }
            }
            style={styles.headerImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(15, 16, 20, 0.9)', '#0f1014']}
            style={styles.headerGradient}
          />
          <TouchableOpacity 
            style={[styles.backButtonHeader, { 
              top: Platform.OS === 'ios' ? 50 : (isTV ? 30 : 20),
              padding: responsiveSpacing(8),
              borderRadius: moderateScale(20)
            }]} 
            onPress={handleBackPress}
            hasTVPreferredFocus={isTV}
          >
            <Ionicons name="chevron-back" size={isTV ? 42 : 28} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.favoriteButton, { 
              top: Platform.OS === 'ios' ? 50 : (isTV ? 30 : 20),
              padding: responsiveSpacing(8),
              borderRadius: moderateScale(20)
            }]} 
            onPress={handleFavoriteToggle}
          >
            <Ionicons 
              name={isFavorited ? "heart" : "heart-outline"} 
              size={isTV ? 42 : 28} 
              color={isFavorited ? "#ff5252" : "#fff"} 
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.detailsContainer, { padding: responsiveSpacing(20) }]}>
          <Text style={[styles.title, { 
            fontSize: tvFontScale(28),
            marginBottom: responsiveSpacing(12)
          }]}>
            {title || movieDetails.name}
          </Text>
          
          <View style={[styles.metaContainer, { marginBottom: responsiveSpacing(24) }]}>
            {movieDetails.releasedate && (
              <Text style={[styles.metaItem, { 
                fontSize: tvFontScale(14),
                marginRight: responsiveSpacing(16)
              }]}>
                {movieDetails.releasedate.substring(0, 4)}
              </Text>
            )}
            {movieDetails.duration && (
              <Text style={[styles.metaItem, { 
                fontSize: tvFontScale(14),
                marginRight: responsiveSpacing(16)
              }]}>
                {movieDetails.duration}
              </Text>
            )}
            {movieDetails.rating && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={isTV ? 24 : 16} color="#FFC107" />
                <Text style={[styles.rating, { fontSize: tvFontScale(14) }]}>
                  {movieDetails.rating}/10
                </Text>
              </View>
            )}
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={[styles.playButton, {
                height: getTouchableSize(),
                borderRadius: moderateScale(8),
                marginRight: responsiveSpacing(12)
              }]}
              onPress={handlePlayMovie}
              hasTVPreferredFocus={true}
            >
              <Ionicons name="play" size={isTV ? 33 : 22} color="#000" />
              <Text style={[styles.playButtonText, { 
                fontSize: tvFontScale(16),
                marginLeft: responsiveSpacing(8)
              }]}>
                Play
              </Text>
            </TouchableOpacity>

            {hasTrailer && (
              <TouchableOpacity 
                style={[styles.trailerButton, {
                  height: getTouchableSize(),
                  borderRadius: moderateScale(8)
                }]}
                onPress={handleTrailerPress}
              >
                <Ionicons name="play-circle-outline" size={isTV ? 33 : 22} color="#fff" />
                <Text style={[styles.trailerButtonText, { 
                  fontSize: tvFontScale(16),
                  marginLeft: responsiveSpacing(8)
                }]}>
                  Watch Trailer
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {movieDetails.plot && (
            <View style={[styles.sectionContainer, { marginTop: responsiveSpacing(24) }]}>
              <Text style={[styles.sectionTitle, { fontSize: tvFontScale(18) }]}>Plot</Text>
              <Text style={[styles.plotText, { fontSize: tvFontScale(15) }]}>{movieDetails.plot}</Text>
            </View>
          )}

          {movieDetails.genre && (
            <View style={[styles.sectionContainer, { marginTop: responsiveSpacing(20) }]}>
              <Text style={[styles.sectionTitle, { fontSize: tvFontScale(18) }]}>Genre</Text>
              <Text style={[styles.sectionText, { fontSize: tvFontScale(15) }]}>{movieDetails.genre}</Text>
            </View>
          )}

          {movieDetails.cast && (
            <View style={[styles.sectionContainer, { marginTop: responsiveSpacing(20) }]}>
              <Text style={[styles.sectionTitle, { fontSize: tvFontScale(18) }]}>Cast</Text>
              <Text style={[styles.sectionText, { fontSize: tvFontScale(15) }]}>{movieDetails.cast}</Text>
            </View>
          )}

          {movieDetails.director && (
            <View style={[styles.sectionContainer, { marginTop: responsiveSpacing(20) }]}>
              <Text style={[styles.sectionTitle, { fontSize: tvFontScale(18) }]}>Director</Text>
              <Text style={[styles.sectionText, { fontSize: tvFontScale(15) }]}>{movieDetails.director}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Trailer Modal */}
      <Modal
        visible={showTrailer}
        transparent={true}
        animationType="fade"
        onRequestClose={closeTrailer}
      >
        <View style={styles.trailerModalContainer}>
          <View style={styles.trailerModalContent}>
            <TouchableOpacity 
              style={[styles.closeTrailerButton, { padding: responsiveSpacing(10) }]} 
              onPress={closeTrailer}
              hasTVPreferredFocus={isTV}
            >
              <Ionicons name="close" size={isTV ? 42 : 28} color="#fff" />
            </TouchableOpacity>
            
            {youtubeId ? (
              <YoutubeIframe
                height={width * (isTV ? 0.6 : 0.75)}
                width={width}
                play={playing}
                videoId={youtubeId}
                onChangeState={onStateChange}
                webViewProps={{
                  androidLayerType: 'hardware',
                }}
              />
            ) : (
              <View style={styles.trailerUnavailableContainer}>
                <Ionicons name="videocam-off" size={isTV ? 75 : 50} color="#666" />
                <Text style={[styles.trailerUnavailableText, { fontSize: tvFontScale(16) }]}>
                  Trailer not available for playback
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1014',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f1014',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f1014',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#1ce783',
  },
  backButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  backButtonHeader: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  detailsContainer: {
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    color: '#aaa',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    color: '#fff',
    marginLeft: 4,
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1ce783',
    paddingHorizontal: 24,
    flex: 1,
  },
  playButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  trailerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    flex: 1,
  },
  trailerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  favoriteButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sectionContainer: {
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  plotText: {
    color: '#ddd',
    lineHeight: 22,
  },
  sectionText: {
    color: '#ddd',
  },
  trailerModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trailerModalContent: {
    width: '100%',
    position: 'relative',
  },
  closeTrailerButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  trailerUnavailableContainer: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  trailerUnavailableText: {
    color: '#999',
    marginTop: 16,
  },
}); 
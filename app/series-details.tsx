import React, { useState, useEffect, useCallback } from 'react';
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
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { xtreamApi, Episode } from '@/services/api/xtreamCodesApi';
import YoutubeIframe from 'react-native-youtube-iframe';
import { useFavorites } from '@/contexts/FavoritesContext';

const { width, height } = Dimensions.get('window');

export default function SeriesDetailsScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seriesDetails, setSeriesDetails] = useState<any>(null);
  const [seasons, setSeasons] = useState<{ [key: string]: Episode[] }>({});
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [playing, setPlaying] = useState(false);
  const router = useRouter();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    const loadSeriesDetails = async () => {
      try {
        if (!id) {
          throw new Error('Invalid series ID');
        }

        const seriesId = Number(id);
        
        // Fetch detailed series information
        const details = await xtreamApi.getSeriesInfo(seriesId);
        setSeriesDetails(details.info || details);
        
        // Check favorite status
        setIsFavorited(isFavorite(seriesId, 'series'));
        
        // Organize episodes by season
        const episodesBySeason: { [key: string]: Episode[] } = {};
        if (details.episodes) {
          Object.keys(details.episodes).forEach(seasonNum => {
            episodesBySeason[seasonNum] = details.episodes[seasonNum];
          });
          
          // Set the first season as selected by default
          const seasonKeys = Object.keys(episodesBySeason);
          if (seasonKeys.length > 0) {
            setSelectedSeason(seasonKeys[0]);
          }
        }
        
        setSeasons(episodesBySeason);
        
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
        console.error('Error loading series details:', err);
        setError(err.message || 'Failed to load series details');
      } finally {
        setLoading(false);
      }
    };

    loadSeriesDetails();
  }, [id, isFavorite]);

  useEffect(() => {
    // Pause the video when modal is closed
    if (!showTrailer) {
      setPlaying(false);
    } else {
      setPlaying(true);
    }
  }, [showTrailer]);

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

  const handleFavoriteToggle = async () => {
    try {
      const seriesId = Number(id);
      
      if (isFavorited) {
        await removeFavorite(seriesId, 'series');
        setIsFavorited(false);
      } else {
        await addFavorite({
          id: seriesId,
          name: title as string || seriesDetails.name,
          type: 'series',
          imageUrl: seriesDetails.cover,
          data: seriesDetails
        });
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleEpisodePress = (episode: Episode) => {
    router.push({
      pathname: "/series-player-route",
      params: { 
        seriesId: id as string,
        episodeId: episode.id,
        title: episode.title || `${title} - S${episode.info.season}E${episode.episode_num}`,
        season: episode.info.season,
        episode: episode.episode_num
      }
    });
  };

  const hasTrailer = !!youtubeId;

  const renderSeasonTab = (seasonNumber: string) => (
    <TouchableOpacity
      style={[
        styles.seasonTab,
        selectedSeason === seasonNumber && styles.selectedSeasonTab
      ]}
      onPress={() => setSelectedSeason(seasonNumber)}
    >
      <Text 
        style={[
          styles.seasonTabText,
          selectedSeason === seasonNumber && styles.selectedSeasonTabText
        ]}
      >
        Season {seasonNumber}
      </Text>
    </TouchableOpacity>
  );

  const renderEpisodeItem = ({ item }: { item: Episode }) => (
    <TouchableOpacity
      style={styles.episodeItem}
      onPress={() => handleEpisodePress(item)}
    >
      <View style={styles.episodeNumber}>
        <Text style={styles.episodeNumberText}>{item.episode_num}</Text>
      </View>
      <View style={styles.episodeDetails}>
        <Text style={styles.episodeTitle}>
          {item.title || `Episode ${item.episode_num}`}
        </Text>
        {item.info?.duration && (
          <Text style={styles.episodeDuration}>{item.info.duration}</Text>
        )}
        {item.info?.plot && (
          <Text style={styles.episodePlot} numberOfLines={2}>
            {item.info.plot}
          </Text>
        )}
      </View>
      <Ionicons name="play-circle-outline" size={24} color="#1ce783" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1ce783" />
        <Text style={styles.loadingText}>Loading series details...</Text>
      </View>
    );
  }

  if (error || !seriesDetails) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={50} color="#ff5252" />
        <Text style={styles.errorText}>{error || 'Series details not available'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.headerContainer}>
          <Image
            source={
              seriesDetails.cover
                ? { uri: seriesDetails.cover }
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
            style={styles.backButtonHeader} 
            onPress={handleBackPress}
          >
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.favoriteButton} 
            onPress={handleFavoriteToggle}
          >
            <Ionicons 
              name={isFavorited ? "heart" : "heart-outline"} 
              size={28} 
              color={isFavorited ? "#ff5252" : "#fff"} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{title || seriesDetails.name}</Text>
          
          <View style={styles.metaContainer}>
            {seriesDetails.release_date && (
              <Text style={styles.metaItem}>{seriesDetails.release_date.substring(0, 4)}</Text>
            )}
            {seriesDetails.episode_run_time && (
              <Text style={styles.metaItem}>{seriesDetails.episode_run_time}</Text>
            )}
            {seriesDetails.rating && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFC107" />
                <Text style={styles.rating}>{seriesDetails.rating}/10</Text>
              </View>
            )}
          </View>

          <View style={styles.buttonsContainer}>
            {hasTrailer && (
              <TouchableOpacity 
                style={styles.trailerButton}
                onPress={handleTrailerPress}
              >
                <Ionicons name="play-circle-outline" size={22} color="#fff" />
                <Text style={styles.trailerButtonText}>Watch Trailer</Text>
              </TouchableOpacity>
            )}
          </View>

          {seriesDetails.plot && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Plot</Text>
              <Text style={styles.plotText}>{seriesDetails.plot}</Text>
            </View>
          )}

          {seriesDetails.genre && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Genre</Text>
              <Text style={styles.sectionText}>{seriesDetails.genre}</Text>
            </View>
          )}

          {seriesDetails.cast && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Cast</Text>
              <Text style={styles.sectionText}>{seriesDetails.cast}</Text>
            </View>
          )}

          {seriesDetails.director && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Director</Text>
              <Text style={styles.sectionText}>{seriesDetails.director}</Text>
            </View>
          )}

          {/* Seasons and Episodes */}
          {Object.keys(seasons).length > 0 && (
            <View style={styles.seasonsContainer}>
              <Text style={styles.sectionTitle}>Episodes</Text>
              
              {/* Season tabs */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.seasonTabsContainer}
              >
                {Object.keys(seasons).map(seasonNum => (
                  renderSeasonTab(seasonNum)
                ))}
              </ScrollView>
              
              {/* Episodes list */}
              {selectedSeason && (
                <View style={styles.episodesContainer}>
                  <FlatList
                    data={seasons[selectedSeason]}
                    renderItem={renderEpisodeItem}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                  />
                </View>
              )}
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
              style={styles.closeTrailerButton} 
              onPress={closeTrailer}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            
            {youtubeId ? (
              <YoutubeIframe
                height={width * 0.75}
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
                <Ionicons name="videocam-off" size={50} color="#666" />
                <Text style={styles.trailerUnavailableText}>
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
    fontSize: 16,
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
    fontSize: 16,
  },
  backButton: {
    backgroundColor: '#1ce783',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    height: height * 0.4,
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
    top: 50,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  favoriteButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  detailsContainer: {
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  metaItem: {
    color: '#aaa',
    fontSize: 14,
    marginRight: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
  },
  buttonsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  trailerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  trailerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  plotText: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 24,
  },
  sectionText: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 22,
  },
  seasonsContainer: {
    marginTop: 20,
  },
  seasonTabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  seasonTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedSeasonTab: {
    backgroundColor: '#1ce783',
  },
  seasonTabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedSeasonTabText: {
    color: '#000',
    fontWeight: 'bold',
  },
  episodesContainer: {
    marginTop: 8,
  },
  episodeItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  episodeNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  episodeNumberText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  episodeDetails: {
    flex: 1,
    marginRight: 8,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  episodeDuration: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
  },
  episodePlot: {
    color: '#aaa',
    fontSize: 12,
  },
  trailerModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trailerModalContent: {
    width: '100%',
    height: width * 0.75, // 16:9 aspect ratio
    backgroundColor: '#000',
    position: 'relative',
  },
  closeTrailerButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 5,
  },
  trailerUnavailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  trailerUnavailableText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
  },
}); 
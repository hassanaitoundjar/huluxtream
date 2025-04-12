import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useWatchHistory, WatchHistoryItem } from '../../../contexts/WatchHistoryContext';
import { xtreamApi, Channel, Movie, Series } from '../../../services/api/xtreamCodesApi';
import {
  getGridColumns,
  getItemWidth,
  tvFontScale,
  responsiveSpacing,
  isTV,
  isTablet,
  getTouchableSize,
  WINDOW_WIDTH,
  WINDOW_HEIGHT
} from '@/utils/responsive';

// Calculate responsive dimensions
const SPACING = responsiveSpacing(8);
const CARD_WIDTH = isTV 
  ? WINDOW_WIDTH * 0.18 
  : isTablet 
    ? WINDOW_WIDTH * 0.25 
    : WINDOW_WIDTH * 0.42;
const CARD_HEIGHT = CARD_WIDTH * 1.5;
const SECTION_PADDING = responsiveSpacing(16);

export default function HomeScreen() {
  const { logout } = useAuth();
  const { watchHistory } = useWatchHistory();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featuredContent, setFeaturedContent] = useState<Channel | Movie | Series | null>(null);
  const [liveChannels, setLiveChannels] = useState<Channel[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadContent = async () => {
    try {
      setError(null);
      
      // Fetch live channels
      const channels = await xtreamApi.getLiveStreams();
      setLiveChannels(channels.slice(0, 15)); // Limit to 15 channels
      
      // Fetch movies
      const vodContent = await xtreamApi.getVodStreams();
      setMovies(vodContent.slice(0, 15)); // Limit to 15 movies
      
      // Fetch series
      const seriesContent = await xtreamApi.getSeries();
      setSeries(seriesContent.slice(0, 15)); // Limit to 15 series

      // Set a random featured content (can be from any category)
      if (vodContent.length > 0) {
        setFeaturedContent(vodContent[Math.floor(Math.random() * Math.min(10, vodContent.length))]);
      } else if (channels.length > 0) {
        setFeaturedContent(channels[0]);
      }
    } catch (err: any) {
      console.error('Error loading content:', err);
      setError('Failed to load content. Please check your connection.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContent();
  };

  const handlePlayFeatured = () => {
    if (!featuredContent) return;

    if ('stream_type' in featuredContent) {
      if (featuredContent.stream_type === 'live') {
        router.push({
          pathname: '/live-player-route',
          params: { 
            id: featuredContent.stream_id, 
            title: featuredContent.name,
          }
        });
      } 
    } 
  };

  const handleLiveChannelPress = (channel: Channel) => {
    router.push({
      pathname: '/live-player-route',
      params: { 
        id: channel.stream_id, 
        title: channel.name,
      }
    });
  };

  const handleWatchHistoryItemPress = (item: WatchHistoryItem) => {
    if (item.type === 'movie') {
      router.push({
        pathname: '/movie-details',
        params: { 
          id: item.id.toString(), 
          title: item.name,
        }
      });
    }
  };

  const handleMoviePress = (movie: Movie) => {
    router.push({
      pathname: '/movie-details',
      params: { 
        id: movie.stream_id.toString(), 
        title: movie.name,
      }
    });
  };

  const handleSeriesPress = (series: Series) => {
    router.push({
      pathname: '/series-details',
      params: { 
        id: series.series_id.toString(), 
        title: series.name,
      }
    });
  };

  const renderFeaturedContent = () => {
    if (!featuredContent) return null;
    
    const title = 'name' in featuredContent ? featuredContent.name : '';
    const imageUrl = 
      'stream_icon' in featuredContent ? 
        featuredContent.stream_icon : 
        'cover' in featuredContent ? 
          featuredContent.cover : 
          null;
    
    return (
      <TouchableOpacity
        style={[styles.featuredContainer, { height: isTV ? 300 : (isTablet ? 250 : 220) }]}
        onPress={handlePlayFeatured}
        activeOpacity={0.9}
        hasTVPreferredFocus={isTV}
      >
        <ImageBackground
          source={imageUrl ? { uri: imageUrl } : { uri: 'https://via.placeholder.com/800x450/333/ccc?text=Featured' }}
          style={styles.featuredBackground}
          imageStyle={{ borderRadius: 8 }}
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.featuredGradient}
          >
            <View style={styles.featuredContent}>
              <Text style={[styles.featuredTitle, { fontSize: tvFontScale(22) }]}>{title}</Text>
              <View style={styles.featuredButtonContainer}>
                <TouchableOpacity 
                  style={[styles.playButton, { 
                    paddingVertical: responsiveSpacing(8),
                    paddingHorizontal: responsiveSpacing(16)
                  }]}
                  onPress={handlePlayFeatured}
                >
                  <Ionicons name="play" size={isTV ? 24 : 18} color="#000" />
                  <Text style={[styles.playButtonText, { fontSize: tvFontScale(14) }]}>Play</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  const renderLiveChannelItem = ({ item }: { item: Channel }) => (
    <TouchableOpacity
      style={[styles.cardContainer, { 
        width: CARD_WIDTH, 
        marginRight: SPACING 
      }]}
      onPress={() => handleLiveChannelPress(item)}
      hasTVPreferredFocus={false}
    >
      <Image
        source={
          item.stream_icon
            ? { uri: item.stream_icon }
            : { uri: 'https://via.placeholder.com/300x200/333/ccc?text=Live+TV' }
        }
        style={[styles.cardImage, { height: CARD_HEIGHT }]}
        resizeMode="cover"
      />
      <View style={styles.liveIndicator}>
        <Text style={styles.liveText}>LIVE</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { fontSize: tvFontScale(14) }]} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderMovieItem = ({ item }: { item: Movie }) => (
    <TouchableOpacity
      style={[styles.cardContainer, { 
        width: CARD_WIDTH, 
        marginRight: SPACING 
      }]}
      onPress={() => handleMoviePress(item)}
      hasTVPreferredFocus={false}
    >
      <Image
        source={
          item.stream_icon
            ? { uri: item.stream_icon }
            : { uri: 'https://via.placeholder.com/300x200/333/ccc?text=Movie' }
        }
        style={[styles.cardImage, { height: CARD_HEIGHT }]}
        resizeMode="cover"
      />
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { fontSize: tvFontScale(14) }]} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSeriesItem = ({ item }: { item: Series }) => (
    <TouchableOpacity
      style={[styles.cardContainer, { 
        width: CARD_WIDTH, 
        marginRight: SPACING 
      }]}
      onPress={() => handleSeriesPress(item)}
      hasTVPreferredFocus={false}
    >
      <Image
        source={
          item.cover
            ? { uri: item.cover }
            : { uri: 'https://via.placeholder.com/300x200/333/ccc?text=Series' }
        }
        style={[styles.cardImage, { height: CARD_HEIGHT }]}
        resizeMode="cover"
      />
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { fontSize: tvFontScale(14) }]} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderWatchHistoryItem = ({ item }: { item: WatchHistoryItem }) => {
    // Calculate progress percentage
    const progressPercentage = item.duration > 0 
      ? Math.min(100, (item.watchedAt / item.duration) * 100) 
      : 0;
      
    return (
      <TouchableOpacity
        style={[styles.cardContainer, { 
          width: CARD_WIDTH, 
          marginRight: SPACING 
        }]}
        onPress={() => handleWatchHistoryItemPress(item)}
        hasTVPreferredFocus={false}
      >
        <View style={styles.cardImageContainer}>
          <Image
            source={
              item.imageUrl
                ? { uri: item.imageUrl }
                : { uri: 'https://via.placeholder.com/300x200/333/ccc?text=Movie' }
            }
            style={[styles.cardImage, { height: CARD_HEIGHT }]}
            resizeMode="cover"
          />
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${progressPercentage}%` }
              ]} 
            />
          </View>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { fontSize: tvFontScale(14) }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.continueText, { fontSize: tvFontScale(12) }]}>
            Continue Watching
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={isTV ? "large" : "large"} color="#1ce783" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={isTV ? 70 : 50} color="#ff5252" />
        <Text style={[styles.errorText, { fontSize: tvFontScale(16) }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, {
            paddingVertical: responsiveSpacing(12),
            paddingHorizontal: responsiveSpacing(24),
            borderRadius: 8,
            marginTop: responsiveSpacing(16)
          }]} 
          onPress={loadContent}
          hasTVPreferredFocus={isTV}
        >
          <Text style={[styles.retryButtonText, { fontSize: tvFontScale(16) }]}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.logoutButton, { marginTop: responsiveSpacing(20) }]} 
          onPress={logout}
        >
          <Text style={[styles.logoutButtonText, { fontSize: tvFontScale(16) }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1ce783" />
        }
      >
        <View style={[styles.header, { 
          paddingHorizontal: SECTION_PADDING,
          paddingTop: Platform.OS === 'ios' ? 50 : (isTV ? 30 : 20),
          paddingBottom: responsiveSpacing(16)
        }]}>
          <Text style={[styles.headerTitle, { fontSize: tvFontScale(24) }]}>HuluXtream</Text>
          <TouchableOpacity onPress={logout}>
            <Ionicons name="log-out-outline" size={isTV ? 36 : 24} color="#fff" />
          </TouchableOpacity>
        </View>

        {renderFeaturedContent()}
        
        {watchHistory.length > 0 && (
          <View style={[styles.sectionContainer, { marginBottom: responsiveSpacing(24) }]}>
            <View style={[styles.sectionHeader, { 
              paddingHorizontal: SECTION_PADDING,
              marginBottom: responsiveSpacing(16)
            }]}>
              <Text style={[styles.sectionTitle, { fontSize: tvFontScale(20) }]}>Continue Watching</Text>
            </View>
            <FlatList
              data={watchHistory.slice(0, 10)}
              renderItem={renderWatchHistoryItem}
              keyExtractor={(item) => `history-${item.type}-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.listContent, { 
                paddingLeft: SECTION_PADDING,
                paddingRight: SECTION_PADDING / 2
              }]}
            />
          </View>
        )}
        
        {liveChannels.length > 0 && (
          <View style={[styles.sectionContainer, { marginBottom: responsiveSpacing(24) }]}>
            <View style={[styles.sectionHeader, { 
              paddingHorizontal: SECTION_PADDING,
              marginBottom: responsiveSpacing(16)
            }]}>
              <Text style={[styles.sectionTitle, { fontSize: tvFontScale(20) }]}>Live TV</Text>
              <TouchableOpacity onPress={() => router.push('/live')}>
                <Text style={[styles.seeAllText, { fontSize: tvFontScale(14) }]}>See All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={liveChannels}
              renderItem={renderLiveChannelItem}
              keyExtractor={(item) => `live-${item.stream_id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.listContent, { 
                paddingLeft: SECTION_PADDING,
                paddingRight: SECTION_PADDING / 2
              }]}
            />
          </View>
        )}

        {movies.length > 0 && (
          <View style={[styles.sectionContainer, { marginBottom: responsiveSpacing(24) }]}>
            <View style={[styles.sectionHeader, { 
              paddingHorizontal: SECTION_PADDING,
              marginBottom: responsiveSpacing(16)
            }]}>
              <Text style={[styles.sectionTitle, { fontSize: tvFontScale(20) }]}>Movies</Text>
              <TouchableOpacity onPress={() => router.push('/vod')}>
                <Text style={[styles.seeAllText, { fontSize: tvFontScale(14) }]}>See All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={movies.slice(0, 10)}
              renderItem={renderMovieItem}
              keyExtractor={(item) => `movie-${item.stream_id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.listContent, { 
                paddingLeft: SECTION_PADDING,
                paddingRight: SECTION_PADDING / 2
              }]}
            />
          </View>
        )}

        {series.length > 0 && (
          <View style={[styles.sectionContainer, { marginBottom: responsiveSpacing(24) }]}>
            <View style={[styles.sectionHeader, { 
              paddingHorizontal: SECTION_PADDING,
              marginBottom: responsiveSpacing(16)
            }]}>
              <Text style={[styles.sectionTitle, { fontSize: tvFontScale(20) }]}>Series</Text>
              <TouchableOpacity onPress={() => router.push('/(main)/(tabs)/series')}>
                <Text style={[styles.seeAllText, { fontSize: tvFontScale(14) }]}>See All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={series.slice(0, 10)}
              renderItem={renderSeriesItem}
              keyExtractor={(item) => `series-${item.series_id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.listContent, { 
                paddingLeft: SECTION_PADDING,
                paddingRight: SECTION_PADDING / 2
              }]}
            />
          </View>
        )}
       
      </ScrollView>
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
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1ce783',
  },
  retryButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 10,
  },
  logoutButtonText: {
    color: '#1ce783',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#1ce783',
  },
  featuredContainer: {
    margin: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  featuredBackground: {
    width: '100%',
    height: '100%',
  },
  featuredGradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  featuredContent: {
    padding: 16,
  },
  featuredTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  featuredButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: '#1ce783',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
  },
  playButtonText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  sectionContainer: {
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#fff',
  },
  seeAllText: {
    color: '#1ce783',
    fontWeight: '500',
  },
  listContent: {
  },
  cardContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1c20',
  },
  cardImage: {
    width: '100%',
    borderRadius: 8,
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ff0000',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  liveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 10,
  },
  cardContent: {
    padding: 8,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: '500',
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1ce783',
  },
  continueText: {
    color: '#1ce783',
    marginTop: 2,
  },
}); 
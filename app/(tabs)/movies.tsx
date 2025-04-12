import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  View as RNView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { xtreamApi } from '@/services/api/xtreamCodesApi';
import { useIsFocused } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { Movie, Category } from '@/services/api/xtreamCodesApi';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const ITEM_WIDTH = (width - 40) / NUM_COLUMNS;
const ITEM_HEIGHT = ITEM_WIDTH * 1.5;

// Create a custom interface that extends Category but makes parent_id optional
interface CategoryWithAll extends Omit<Category, 'parent_id'> {
  parent_id?: number;
}

export default function MoviesScreen() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const isFocused = useIsFocused();
  const router = useRouter();

  // Load movies
  const loadMovies = useCallback(async (categoryId?: string) => {
    try {
      setLoading(true);
      
      const moviesData = await xtreamApi.getVodStreams(categoryId || undefined);
      setMovies(moviesData);
      setFilteredMovies(moviesData);
      
      // Load categories if we don't have them yet
      if (categories.length === 0) {
        const categoriesData = await xtreamApi.getVodCategories();
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categories.length]);

  useEffect(() => {
    // Only load when the screen is focused
    if (isFocused) {
      loadMovies(selectedCategory || undefined);
    }
  }, [isFocused, loadMovies, selectedCategory]);

  // Filter movies when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMovies(movies);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = movies.filter(movie => 
        movie.name.toLowerCase().includes(query)
      );
      setFilteredMovies(filtered);
    }
  }, [searchQuery, movies]);

  // Handle pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadMovies(selectedCategory || undefined);
  };

  // Navigate to movie player
  const handleMoviePress = (movie: Movie) => {
    router.push({
      pathname: "/vod-player",
      params: {
        id: movie.stream_id.toString(),
        title: movie.name
      }
    });
  };

  // Handle category selection
  const handleCategoryPress = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setLoading(true);
    loadMovies(categoryId === 'all' ? undefined : categoryId || undefined);
  };

  // Render movie item
  const renderMovieItem = ({ item }: { item: Movie }) => (
    <TouchableOpacity
      style={styles.movieItem}
      onPress={() => handleMoviePress(item)}
      activeOpacity={0.8}
    >
      <RNView style={styles.movieImageContainer}>
        {item.stream_icon ? (
          <Image 
            source={{ uri: item.stream_icon }} 
            style={styles.movieImage}
            resizeMode="cover"
          />
        ) : (
          <RNView style={styles.noImageContainer}>
            <Ionicons name="film-outline" size={40} color="#666" />
          </RNView>
        )}
        
        <BlurView intensity={50} style={styles.movieInfoOverlay}>
          <ThemedText numberOfLines={2} style={styles.movieTitle}>
            {item.name}
          </ThemedText>
        </BlurView>
      </RNView>
    </TouchableOpacity>
  );

  // Render category item
  const renderCategoryItem = ({ item }: { item: CategoryWithAll }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item.category_id && styles.categoryButtonSelected,
      ]}
      onPress={() => handleCategoryPress(item.category_id)}
    >
      <ThemedText
        style={[
          styles.categoryButtonText,
          selectedCategory === item.category_id && styles.categoryButtonTextSelected,
        ]}
      >
        {item.category_name}
      </ThemedText>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Movies</ThemedText>
        <RNView style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </RNView>
      </ThemedView>

      {categories.length > 0 && (
        <FlatList
          data={[{ category_id: 'all', category_name: 'All' } as CategoryWithAll, ...categories]}
          keyExtractor={(item) => item.category_id.toString()}
          renderItem={renderCategoryItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesList}
          contentContainerStyle={styles.categoriesContent}
        />
      )}

      {loading ? (
        <RNView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1ce783" />
          <ThemedText style={styles.loadingText}>Loading Movies...</ThemedText>
        </RNView>
      ) : filteredMovies.length === 0 ? (
        <RNView style={styles.emptyContainer}>
          <Ionicons name="film-outline" size={50} color="#999" />
          <ThemedText style={styles.emptyText}>
            {searchQuery ? 'No movies match your search' : 'No movies available'}
          </ThemedText>
        </RNView>
      ) : (
        <FlatList
          data={filteredMovies}
          keyExtractor={(item) => item.stream_id.toString()}
          renderItem={renderMovieItem}
          numColumns={NUM_COLUMNS}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1ce783']}
              tintColor="#1ce783"
            />
          }
          contentContainerStyle={styles.moviesGridContent}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    marginTop: 12,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#000',
  },
  clearButton: {
    padding: 5,
  },
  categoriesList: {
    maxHeight: 50,
    marginBottom: 16,
  },
  categoriesContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  categoryButtonSelected: {
    backgroundColor: '#1ce783',
  },
  categoryButtonText: {
    color: '#666',
  },
  categoryButtonTextSelected: {
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  moviesGridContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  movieItem: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    marginHorizontal: 4,
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  movieImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  movieImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  movieInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  movieTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
}); 
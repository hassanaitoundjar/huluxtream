import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  View,
  Text,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { xtreamApi } from '@/services/api/xtreamCodesApi';
import { useIsFocused } from '@react-navigation/native';
import { Movie, Category } from '@/services/api/xtreamCodesApi';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const ITEM_WIDTH = (width - 40) / NUM_COLUMNS;
const ITEM_HEIGHT = ITEM_WIDTH * 1.5;

// Optimize movie image component to prevent re-renders
const MovieImage = React.memo(({ item }: { item: Movie }) => {
  const [isLoading, setIsLoading] = useState(true);
  
  return item.stream_icon ? (
    <View style={styles.movieImageWrapper}>
      {isLoading && (
        <View style={[styles.noImageContainer, styles.imagePlaceholder]}>
          <ActivityIndicator size="small" color="#1ce783" />
        </View>
      )}
      <Image 
        source={{ uri: item.stream_icon }} 
        style={styles.movieImage}
        resizeMode="cover"
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
      />
    </View>
  ) : (
    <View style={styles.noImageContainer}>
      <Ionicons name="film-outline" size={40} color="#666" />
    </View>
  );
});

// Optimize movie item component to prevent re-renders
const MovieItem = React.memo(({ item, onPress }: { item: Movie, onPress: (movie: Movie) => void }) => (
  <TouchableOpacity
    style={styles.movieItem}
    onPress={() => onPress(item)}
    activeOpacity={0.8}
  >
    <View style={styles.movieImageContainer}>
      <MovieImage item={item} />
      
      <View style={styles.movieInfoOverlay}>
        <Text numberOfLines={2} style={styles.movieTitle}>
          {item.name}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
));

export default function VodScreen() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const isFocused = useIsFocused();
  const router = useRouter();

  // Load movies with debounce
  const loadMovies = useCallback(async (categoryId?: string) => {
    try {
      if (!initialLoadComplete) {
        setLoading(true);
      }
      
      const moviesData = await xtreamApi.getVodStreams(categoryId || undefined);
      setMovies(moviesData);
      setFilteredMovies(moviesData);
      
      // Load categories if we don't have them yet
      if (categories.length === 0) {
        const categoriesData = await xtreamApi.getVodCategories();
        setCategories(categoriesData);
      }
      
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categories.length, initialLoadComplete]);

  useEffect(() => {
    // Only load when the screen is focused
    if (isFocused) {
      loadMovies(selectedCategory || undefined);
    }
  }, [isFocused, loadMovies, selectedCategory]);

  // Filter movies when search query changes (with debounce)
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (searchQuery.trim() === '') {
        setFilteredMovies(movies);
      } else {
        const query = searchQuery.toLowerCase();
        const filtered = movies.filter(movie => 
          movie.name.toLowerCase().includes(query)
        );
        setFilteredMovies(filtered);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(debounceTimeout);
  }, [searchQuery, movies]);

  // Handle pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMovies(selectedCategory || undefined);
  }, [loadMovies, selectedCategory]);

  // Navigate to movie player
  const handleMoviePress = useCallback((movie: Movie) => {
    router.push({
      pathname: "/movie-details",
      params: {
        id: movie.stream_id.toString(),
        title: movie.name
      }
    });
  }, [router]);

  // Handle category selection
  const handleCategoryPress = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
    loadMovies(categoryId || undefined);
  }, [loadMovies]);

  // Categorized and memoized data for flat list
  const memoCategoryButtons = useMemo(() => {
    return [{ category_id: null, category_name: 'All' }, ...categories];
  }, [categories]);

  // Render category item
  const renderCategoryItem = useCallback(({ item }: { item: Category | { category_id: string | null, category_name: string } }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item.category_id && styles.categoryButtonSelected,
      ]}
      onPress={() => handleCategoryPress(item.category_id)}
    >
      <Text
        style={[
          styles.categoryButtonText,
          selectedCategory === item.category_id && styles.categoryButtonTextSelected,
        ]}
      >
        {item.category_name}
      </Text>
    </TouchableOpacity>
  ), [selectedCategory, handleCategoryPress]);

  // Optimize the movie list with windowing and pagination
  const keyExtractor = useCallback((item: Movie) => item.stream_id.toString(), []);
  const getItemLayout = useCallback((_data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * Math.floor(index / NUM_COLUMNS),
    index,
  }), []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Movies</Text>
        <View style={styles.searchContainer}>
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
        </View>
      </View>

      {categories.length > 0 && (
        <FlatList
          data={memoCategoryButtons}
          keyExtractor={(item) => item.category_id?.toString() || 'all'}
          renderItem={renderCategoryItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesList}
          contentContainerStyle={styles.categoriesContent}
        />
      )}

      {loading && !initialLoadComplete ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1ce783" />
          <Text style={styles.loadingText}>Loading Movies...</Text>
        </View>
      ) : filteredMovies.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="film-outline" size={50} color="#999" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No movies match your search' : 'No movies available'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMovies}
          keyExtractor={keyExtractor}
          renderItem={({ item }) => (
            <MovieItem item={item} onPress={handleMoviePress} />
          )}
          numColumns={NUM_COLUMNS}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1ce783']}
              tintColor="#1ce783"
            />
          }
          getItemLayout={getItemLayout}
          initialNumToRender={12}
          maxToRenderPerBatch={9}
          windowSize={10}
          removeClippedSubviews={true}
          contentContainerStyle={styles.moviesGridContent}
          ListFooterComponent={loading && initialLoadComplete ? 
            <ActivityIndicator color="#1ce783" style={styles.footerLoader} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1014',
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1ce783',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1c20',
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
    color: '#fff',
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
    backgroundColor: '#1a1c20',
  },
  categoryButtonSelected: {
    backgroundColor: '#1ce783',
  },
  categoryButtonText: {
    color: '#fff',
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
    color: '#fff',
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
    paddingHorizontal: 10,
    paddingTop: 10,
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
    backgroundColor: '#1a1c20',
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  movieTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footerLoader: {
    marginTop: 12,
  },
  movieImageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    backgroundColor: '#1a1c20',
  },
}); 
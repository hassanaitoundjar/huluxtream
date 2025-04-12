import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { xtreamApi } from '@/services/api/xtreamCodesApi';
import { useIsFocused } from '@react-navigation/native';
import { Series, Category } from '@/services/api/xtreamCodesApi';
import {
  getGridColumns,
  getItemWidth,
  fontScale,
  responsiveSpacing,
  tvFontScale,
  isTV,
  isTablet,
  getTouchableSize,
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  listenToScreenDimensionChanges
} from '@/utils/responsive';

// Calculate responsive grid layout
const NUM_COLUMNS = getGridColumns();
const SPACING = responsiveSpacing(10);
const ITEM_WIDTH = getItemWidth(NUM_COLUMNS, SPACING);
const ITEM_HEIGHT = ITEM_WIDTH * 1.5;

// Memoized SeriesItem component
const SeriesItem = memo(({ 
  item, 
  onPress 
}: { 
  item: Series; 
  onPress: (series: Series) => void;
}) => (
  <TouchableOpacity
    style={[styles.seriesItem, { 
      width: ITEM_WIDTH, 
      height: ITEM_HEIGHT,
      margin: SPACING / 2
    }]}
    onPress={() => onPress(item)}
    activeOpacity={0.8}
    hasTVPreferredFocus={isTV}
  >
    <View style={styles.seriesImageContainer}>
      {item.cover ? (
        <Image 
          source={{ uri: item.cover }} 
          style={styles.seriesImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.noImageContainer}>
          <Ionicons name="desktop-outline" size={isTV ? 60 : 40} color="#666" />
        </View>
      )}
      
      <View style={styles.seriesInfoOverlay}>
        <Text numberOfLines={2} style={[styles.seriesTitle, { fontSize: tvFontScale(14) }]}>
          {item.name}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
));

// Memoized CategoryItem component
const CategoryItem = memo(({ 
  item, 
  isSelected, 
  onPress 
}: { 
  item: Category | { category_id: string | null, category_name: string }; 
  isSelected: boolean;
  onPress: (categoryId: string | null) => void;
}) => (
  <TouchableOpacity
    style={[
      styles.categoryButton,
      isSelected && styles.categoryButtonSelected,
      { 
        paddingHorizontal: responsiveSpacing(16),
        paddingVertical: responsiveSpacing(8),
        marginRight: responsiveSpacing(10),
        minWidth: isTV ? 150 : undefined
      }
    ]}
    onPress={() => onPress(item.category_id)}
    hasTVPreferredFocus={isTV && isSelected}
  >
    <Text
      style={[
        styles.categoryButtonText,
        isSelected && styles.categoryButtonTextSelected,
        { fontSize: tvFontScale(isTV ? 16 : 14) }
      ]}
    >
      {item.category_name}
    </Text>
  </TouchableOpacity>
));

export default function SeriesScreen() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dimensions, setDimensions] = useState({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT
  });
  const isFocused = useIsFocused();
  const router = useRouter();

  // Handle screen dimension changes
  useEffect(() => {
    const subscription = listenToScreenDimensionChanges((newDimensions) => {
      setDimensions({
        width: newDimensions.width,
        height: newDimensions.height
      });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Memoized filtered series list
  const filteredSeries = useMemo(() => {
    if (searchQuery.trim() === '') {
      return seriesList;
    } else {
      const query = searchQuery.toLowerCase();
      return seriesList.filter(series => 
        series.name.toLowerCase().includes(query)
      );
    }
  }, [searchQuery, seriesList]);

  // Load categories only once
  const loadCategories = useCallback(async () => {
    try {
      const categoriesData = await xtreamApi.getSeriesCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading series categories:', error);
    }
  }, []);

  // Load series
  const loadSeries = useCallback(async (categoryId?: string) => {
    try {
      setLoading(true);
      
      const seriesData = await xtreamApi.getSeries(categoryId || undefined);
      setSeriesList(seriesData);
    } catch (error) {
      console.error('Error loading series:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      await loadCategories();
      await loadSeries(selectedCategory || undefined);
    };
    
    if (isFocused) {
      loadInitialData();
    }
  }, [isFocused, loadCategories, loadSeries, selectedCategory]);

  // Memoized category data including "All" option
  const categoryData = useMemo(() => {
    return [{ category_id: null, category_name: 'All' }, ...categories];
  }, [categories]);

  // Handle pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSeries(selectedCategory || undefined);
  }, [loadSeries, selectedCategory]);

  // Navigate to series details
  const handleSeriesPress = useCallback((series: Series) => {
    router.push({
      pathname: "/series-details",
      params: {
        id: series.series_id.toString(),
        title: series.name
      }
    });
  }, [router]);

  // Handle category selection
  const handleCategoryPress = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setLoading(true);
    loadSeries(categoryId || undefined);
  }, [loadSeries]);

  // Memoized render item functions
  const renderSeriesItem = useCallback(({ item }: { item: Series }) => (
    <SeriesItem item={item} onPress={handleSeriesPress} />
  ), [handleSeriesPress]);

  const renderCategoryItem = useCallback(({ item }: { item: Category | { category_id: string | null, category_name: string } }) => (
    <CategoryItem 
      item={item} 
      isSelected={selectedCategory === item.category_id}
      onPress={handleCategoryPress} 
    />
  ), [selectedCategory, handleCategoryPress]);

  // Key extractors
  const keyExtractorSeries = useCallback((item: Series) => item.series_id.toString(), []);
  const keyExtractorCategories = useCallback((item: any) => item.category_id?.toString() || 'all', []);

  // Memoized empty component
  const EmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="desktop-outline" size={isTV ? 80 : 50} color="#999" />
      <Text style={[styles.emptyText, { fontSize: tvFontScale(16) }]}>
        {searchQuery ? 'No series match your search' : 'No series available'}
      </Text>
    </View>
  ), [searchQuery]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { 
        paddingTop: Platform.OS === 'ios' ? 50 : (isTV ? 30 : 20), 
        paddingHorizontal: responsiveSpacing(15),
        paddingBottom: responsiveSpacing(10)
      }]}>
        <Text style={[styles.headerTitle, { fontSize: tvFontScale(28) }]}>TV Series</Text>
        <View style={[styles.searchContainer, { height: getTouchableSize() }]}>
          <Ionicons name="search" size={isTV ? 30 : 20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { fontSize: tvFontScale(16) }]}
            placeholder="Search series..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={isTV ? 28 : 18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {categories.length > 0 && (
        <FlatList
          data={categoryData}
          keyExtractor={keyExtractorCategories}
          renderItem={renderCategoryItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.categoriesList, { paddingBottom: responsiveSpacing(10) }]}
          contentContainerStyle={[styles.categoriesContent, { paddingHorizontal: responsiveSpacing(15) }]}
        />
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size={isTV ? 'large' : 'large'} color="#1ce783" />
          <Text style={[styles.loadingText, { fontSize: tvFontScale(16) }]}>Loading Series...</Text>
        </View>
      ) : filteredSeries.length === 0 ? (
        EmptyComponent
      ) : (
        <FlatList
          data={filteredSeries}
          keyExtractor={keyExtractorSeries}
          renderItem={renderSeriesItem}
          numColumns={NUM_COLUMNS}
          key={`series-list-${NUM_COLUMNS}`} // Force re-render when column count changes
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1ce783']}
              tintColor="#1ce783"
            />
          }
          contentContainerStyle={[styles.listContent, { 
            paddingHorizontal: responsiveSpacing(10), 
            paddingTop: responsiveSpacing(10),
            paddingBottom: responsiveSpacing(20)
          }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={isTV ? 15 : 12}
          maxToRenderPerBatch={isTV ? 12 : 9}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1014',
  },
  header: {
    backgroundColor: '#1a1c20',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2c30',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
  },
  clearButton: {
    padding: 4,
  },
  categoriesList: {
    backgroundColor: '#1a1c20',
  },
  categoriesContent: {
  },
  categoryButton: {
    backgroundColor: '#2a2c30',
    borderRadius: 20,
  },
  categoryButtonSelected: {
    backgroundColor: '#1ce783',
  },
  categoryButtonText: {
    color: '#ddd',
    fontWeight: '500',
  },
  categoryButtonTextSelected: {
    color: '#000',
  },
  listContent: {
  },
  seriesItem: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#2a2c30',
  },
  seriesImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  seriesImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2c30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seriesInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  seriesTitle: {
    color: 'white',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyText: {
    color: '#999',
    marginTop: 15,
    textAlign: 'center',
  },
}); 
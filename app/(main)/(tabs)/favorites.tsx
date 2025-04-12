import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFavorites, FavoriteItem } from '@/contexts/FavoritesContext';
import {
  getGridColumns,
  getItemWidth,
  fontScale,
  tvFontScale,
  responsiveSpacing,
  isTV,
  isTablet,
  WINDOW_WIDTH,
  getTouchableSize,
  moderateScale
} from '@/utils/responsive';

// Calculate responsive grid layout
const NUM_COLUMNS = getGridColumns();
const SPACING = responsiveSpacing(10);
const ITEM_WIDTH = getItemWidth(NUM_COLUMNS, SPACING);
const ITEM_HEIGHT = ITEM_WIDTH * 1.5;

// Tab types
type TabType = 'all' | 'live' | 'movie' | 'series';

export default function FavoritesScreen() {
  const { favorites, isLoading, removeFavorite } = useFavorites();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const router = useRouter();

  // Filter favorites by type
  const filteredFavorites = favorites.filter(item => {
    if (activeTab === 'all') return true;
    return item.type === activeTab;
  });

  // Handle item press to navigate to details
  const handleItemPress = useCallback((item: FavoriteItem) => {
    switch (item.type) {
      case 'movie':
        router.push({
          pathname: "/movie-details",
          params: { id: item.id.toString(), title: item.name }
        });
        break;
      case 'series':
        router.push({
          pathname: "/series-details",
          params: { id: item.id.toString(), title: item.name }
        });
        break;
      case 'live':
        // Update with your actual route for live channels
        router.push({
          pathname: "/live-player-route",
          params: { id: item.id.toString(), title: item.name }
        });
        break;
    }
  }, [router]);

  // Handle removing a favorite
  const handleRemoveFavorite = useCallback((item: FavoriteItem) => {
    removeFavorite(item.id, item.type);
  }, [removeFavorite]);

  // Render each favorite item
  const renderItem = useCallback(({ item }: { item: FavoriteItem }) => (
    <View style={[styles.itemContainer, { 
      width: ITEM_WIDTH, 
      height: ITEM_HEIGHT,
      margin: SPACING / 2 
    }]}>
      <TouchableOpacity
        style={styles.itemTouchable}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
        hasTVPreferredFocus={isTV && favorites.indexOf(item) === 0}
      >
        <Image
          source={
            item.imageUrl
              ? { uri: item.imageUrl }
              : require('../../../assets/images/icon.png')
          }
          style={styles.itemImage}
          resizeMode="cover"
        />
        
        <View style={styles.itemOverlay}>
          <Text numberOfLines={2} style={[styles.itemTitle, { fontSize: tvFontScale(14) }]}>
            {item.name}
          </Text>
          
          <View style={styles.itemType}>
            <Text style={[styles.itemTypeText, { fontSize: tvFontScale(12) }]}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.removeButton, { 
            padding: responsiveSpacing(5),
            borderRadius: moderateScale(20)
          }]}
          onPress={() => handleRemoveFavorite(item)}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="close-circle" size={isTV ? 34 : 22} color="#ff5252" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  ), [handleItemPress, handleRemoveFavorite, favorites]);

  // Render tab button
  const renderTabButton = (label: string, tabName: TabType) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tabName && styles.activeTabButton,
        { 
          paddingVertical: responsiveSpacing(8),
          paddingHorizontal: responsiveSpacing(16),
          marginRight: responsiveSpacing(10),
          borderRadius: moderateScale(20),
          minWidth: isTV ? 100 : undefined
        }
      ]}
      onPress={() => setActiveTab(tabName)}
      hasTVPreferredFocus={isTV && tabName === 'all'}
    >
      <Text
        style={[
          styles.tabButtonText,
          activeTab === tabName && styles.activeTabText,
          { fontSize: tvFontScale(isTV ? 16 : 14) }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Empty state component
  const EmptyFavorites = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={isTV ? 80 : 50} color="#666" />
      <Text style={[styles.emptyText, { fontSize: tvFontScale(16) }]}>
        {activeTab === 'all'
          ? "You haven't added any favorites yet"
          : `No ${activeTab} favorites yet`}
      </Text>
      <Text style={[styles.emptySubText, { fontSize: tvFontScale(14) }]}>
        Add favorites by pressing the heart button while viewing content
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { 
        paddingTop: Platform.OS === 'ios' ? 50 : (isTV ? 30 : 20),
        paddingHorizontal: responsiveSpacing(15),
        paddingBottom: responsiveSpacing(10)
      }]}>
        <Text style={[styles.headerTitle, { fontSize: tvFontScale(28) }]}>My Favorites</Text>
      </View>

      <View style={[styles.tabsContainer, { 
        paddingHorizontal: responsiveSpacing(15),
        paddingBottom: responsiveSpacing(15)
      }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 20 }}
        >
          {renderTabButton('All', 'all')}
          {renderTabButton('Live TV', 'live')}
          {renderTabButton('Movies', 'movie')}
          {renderTabButton('Series', 'series')}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size={isTV ? 'large' : 'large'} color="#1ce783" />
          <Text style={[styles.loadingText, { fontSize: tvFontScale(16) }]}>Loading favorites...</Text>
        </View>
      ) : filteredFavorites.length === 0 ? (
        <EmptyFavorites />
      ) : (
        <FlatList
          data={filteredFavorites}
          renderItem={renderItem}
          key={`favorites-grid-${NUM_COLUMNS}`}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={[styles.listContent, { 
            paddingHorizontal: SPACING / 2,
            paddingTop: SPACING / 2,
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
  },
  tabsContainer: {
    backgroundColor: '#1a1c20',
  },
  tabButton: {
    backgroundColor: '#2a2c30',
  },
  activeTabButton: {
    backgroundColor: '#1ce783',
  },
  tabButtonText: {
    color: '#ddd',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000',
  },
  listContent: {
  },
  itemContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#2a2c30',
  },
  itemTouchable: {
    flex: 1,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  itemTitle: {
    color: 'white',
    fontWeight: '500',
  },
  itemType: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  itemTypeText: {
    color: '#ddd',
  },
  removeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubText: {
    color: '#666',
    textAlign: 'center',
  },
}); 
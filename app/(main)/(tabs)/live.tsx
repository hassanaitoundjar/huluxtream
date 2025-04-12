import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { xtreamApi, Channel, Category } from '../../../services/api/xtreamCodesApi';
import { useParentalControl } from '../../../contexts/ParentalControlContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width / 3 - 16;

export default function LiveScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isEnabled, isCategoryRestricted, authenticateWithBiometrics, verifyPIN } = useParentalControl();

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      // Load all channels initially or filter by category
      loadChannels(selectedCategory);
    }
  }, [selectedCategory, categories]);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const result = await xtreamApi.getLiveCategories();
      setCategories(result);
      
      // Select first category by default
      if (result.length > 0 && !selectedCategory) {
        setSelectedCategory(result[0].category_id);
      }
    } catch (err: any) {
      console.error('Error loading categories:', err);
      setError('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const loadChannels = async (categoryId: string | null) => {
    try {
      setIsLoading(true);
      const result = await xtreamApi.getLiveStreams(categoryId || undefined);
      setChannels(result);
    } catch (err: any) {
      console.error('Error loading channels:', err);
      setError('Failed to load channels');
    } finally {
      setIsLoading(false);
    }
  };

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
      
      return isAuthenticated;
    }
    // Either not restricted or authentication successful
    return true;
  };

  const handleChannelPress = async (channel: Channel) => {
    // Check parental restrictions before navigating
    const isAllowed = await checkParentalRestrictions(channel.category_id);
    
    if (!isAllowed) {
      Alert.alert('Access Denied', 'This content is restricted by parental controls.');
      return;
    }
    
    // If allowed, navigate to player
    router.push({
      pathname: '/live-player-route',
      params: {
        id: channel.stream_id,
        title: channel.name,
      },
    });
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item.category_id && styles.selectedCategory,
      ]}
      onPress={() => setSelectedCategory(item.category_id)}
    >
      <Text
        style={[
          styles.categoryName,
          selectedCategory === item.category_id && styles.selectedCategoryText,
        ]}
        numberOfLines={1}
      >
        {item.category_name}
      </Text>
    </TouchableOpacity>
  );

  const renderChannelItem = ({ item }: { item: Channel }) => (
    <TouchableOpacity
      style={styles.channelCard}
      onPress={() => handleChannelPress(item)}
    >
      <Image
        source={
          item.stream_icon
            ? { uri: item.stream_icon }
            : { uri: 'https://via.placeholder.com/300x200/333/ccc?text=Live+TV' }
        }
        style={styles.channelImage}
        resizeMode="contain"
      />
      <View style={styles.liveIndicator}>
        <Text style={styles.liveText}>LIVE</Text>
      </View>
      <Text style={styles.channelName} numberOfLines={2}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ff5252" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadCategories()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Live TV</Text>
      
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.category_id}
        contentContainerStyle={styles.categoriesList}
      />

      {isLoading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#1ce783" />
        </View>
      ) : (
        <FlatList
          data={channels}
          renderItem={renderChannelItem}
          keyExtractor={(item) => `${item.stream_id}`}
          numColumns={3}
          contentContainerStyle={styles.channelsList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1014',
    padding: 16,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1ce783',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  categoriesList: {
    paddingVertical: 8,
  },
  categoryItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedCategory: {
    backgroundColor: '#1ce783',
  },
  categoryName: {
    color: '#fff',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#000',
    fontWeight: 'bold',
  },
  channelsList: {
    paddingTop: 16,
  },
  channelCard: {
    width: CARD_WIDTH,
    margin: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1c20',
    padding: 8,
  },
  channelImage: {
    width: '100%',
    height: CARD_WIDTH * 0.6,
    borderRadius: 4,
    backgroundColor: '#0f1014',
  },
  channelName: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  liveIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ff0000',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
}); 
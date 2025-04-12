import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useParentalControl } from '../../../contexts/ParentalControlContext';
import { useFavorites } from '../../../contexts/FavoritesContext';
import { xtreamApi, Category } from '../../../services/api/xtreamCodesApi';
import { MaterialIcons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { logout } = useAuth();
  const { 
    isEnabled, 
    enableParentalControl,
    disableParentalControl,
    verifyPIN,
    setPIN, 
    restrictedCategories, 
    addRestrictedCategory, 
    removeRestrictedCategory,
    clearSettings,
  } = useParentalControl();
  
  const { clearFavorites } = useFavorites();
  
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showRestrictedCategories, setShowRestrictedCategories] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadStatus, setReloadStatus] = useState('Reload Content');
  const [userInfo, setUserInfo] = useState<{
    username: string;
    expDate: string;
    status: string;
    isActive: boolean;
    maxConnections: string;
  } | null>(null);
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pinAction, setPinAction] = useState('');

  // Load categories when the user toggles the restricted categories view
  const handleToggleRestrictedCategories = async () => {
    if (!showRestrictedCategories && categories.length === 0) {
      setIsLoadingCategories(true);
      try {
        // Load all category types
        const liveCategories = await xtreamApi.getLiveCategories();
        const vodCategories = await xtreamApi.getVodCategories();
        const seriesCategories = await xtreamApi.getSeriesCategories();
        
        setCategories([
          ...liveCategories,
          ...vodCategories,
          ...seriesCategories,
        ]);
      } catch (error) {
        console.error('Failed to load categories:', error);
        Alert.alert('Error', 'Failed to load content categories.');
      } finally {
        setIsLoadingCategories(false);
      }
    }
    
    setShowRestrictedCategories(!showRestrictedCategories);
  };

  // Toggle parental controls
  const handleToggleParentalControl = () => {
    if (!isEnabled) {
      // Turning on parental controls
      setPinModalVisible(true);
    } else {
      // Turning off requires PIN verification
      Alert.prompt(
        'Enter PIN',
        'Please enter your PIN to disable parental controls',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Submit',
            onPress: async (pin) => {
              if (!pin) return;
              
              const isValid = verifyPIN(pin);
              if (isValid) {
                disableParentalControl();
              } else {
                Alert.alert('Invalid PIN', 'The PIN you entered is incorrect.');
              }
            },
          },
        ],
        'secure-text'
      );
    }
  };

  // Handle PIN setup
  const handlePinSetup = async () => {
    setPinError('');
    
    if (newPin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    
    await setPIN(newPin);
    await enableParentalControl();
    setPinModalVisible(false);
    setCurrentPin('');
    setNewPin('');
  };

  // Toggle a category restriction
  const toggleCategoryRestriction = (category: Category) => {
    const isCategoryRestricted = restrictedCategories.includes(category.category_id);
    
    if (isCategoryRestricted) {
      removeRestrictedCategory(category.category_id);
    } else {
      addRestrictedCategory(category.category_id);
    }
  };

  // Handler to reload all content
  const handleReloadContent = async () => {
    if (isReloading) return;
    
    setIsReloading(true);
    setReloadStatus('Preparing to reload...');
    
    try {
      // Clear cache and reload fresh data
      setReloadStatus('Reloading content...');
      await xtreamApi.clearCache();
      
      // Show success message when done
      setReloadStatus('Content reloaded successfully');
      setTimeout(() => {
        setReloadStatus('Reload Content');
      }, 2000);
      
      Alert.alert('Success', 'Content reloaded successfully');
    } catch (error) {
      console.error('Failed to reload content:', error);
      setReloadStatus('Reload failed');
      setTimeout(() => {
        setReloadStatus('Reload Content');
      }, 2000);
      
      Alert.alert('Error', 'Failed to reload content. Please try again.');
    } finally {
      setIsReloading(false);
    }
  };

  // Function to identify adult content categories
  const identifyAdultContentCategories = async () => {
    try {
      setLoading(true);
      
      // Get all categories for different content types
      const liveCategories = await xtreamApi.getLiveCategories();
      const vodCategories = await xtreamApi.getVodCategories();
      const seriesCategories = await xtreamApi.getSeriesCategories();
      
      // Combine all categories
      const allCategories = [...liveCategories, ...vodCategories, ...seriesCategories];
      
      // Keywords that may indicate adult content
      const adultKeywords = ['adult', 'xxx', 'porn', '18+', 'mature', 'erotic'];
      
      // Filter categories that contain adult keywords
      const adultCategories = allCategories.filter(category => {
        const categoryName = category.category_name.toLowerCase();
        return adultKeywords.some(keyword => categoryName.includes(keyword.toLowerCase()));
      });
      
      // Get category IDs to restrict
      const categoryIdsToRestrict = adultCategories.map(category => category.category_id);
      
      // Update restricted categories
      if (categoryIdsToRestrict.length > 0) {
        await updateRestrictedCategories(categoryIdsToRestrict);
        console.log(`Restricted ${categoryIdsToRestrict.length} adult categories`);
      } else {
        console.log('No adult categories found to restrict');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error identifying adult categories:', error);
      setLoading(false);
    }
  };
  
  // Function to clear adult content restrictions
  const clearAdultContentRestrictions = async () => {
    try {
      // For simplicity, just disable parental control entirely
      await disableParentalControl();
    } catch (error) {
      console.error('Error clearing adult content restrictions:', error);
    }
  };
  
  // Function to update multiple restricted categories at once
  const updateRestrictedCategories = async (categoryIds: string[]) => {
    try {
      // First, remove all existing restricted categories
      for (const categoryId of restrictedCategories) {
        await removeRestrictedCategory(categoryId);
      }
      
      // Then add each new category to the restricted list
      for (const categoryId of categoryIds) {
        await addRestrictedCategory(categoryId);
      }
    } catch (error) {
      console.error('Error updating restricted categories:', error);
    }
  };

  // Handle toggling adult content filter
  const handleToggleAdultContentFilter = async () => {
    if (!isEnabled) {
      // Turning on adult content filter
      setPinModalVisible(true);
      setPinAction('enableAdultFilter');
    } else {
      // Prompting for PIN to disable filter
      setPinModalVisible(true);
      setPinAction('disableAdultFilter');
    }
  };

  // Handle PIN confirmation for adult content filter
  const handlePinConfirmation = async (pin: string) => {
    const isAuthenticated = await verifyPIN(pin);
    
    if (isAuthenticated) {
      if (pinAction === 'enableAdultFilter') {
        await enableParentalControl();
        await identifyAdultContentCategories();
      } else if (pinAction === 'disableAdultFilter') {
        await clearAdultContentRestrictions();
      }
    } else {
      Alert.alert('Invalid PIN', 'The PIN you entered is incorrect.');
    }
    
    setPinModalVisible(false);
  };

  // Fetch user information when component mounts
  useEffect(() => {
    fetchUserInfo();
  }, []);

  // Function to get user info from the API
  const fetchUserInfo = async () => {
    setIsLoadingUserInfo(true);
    try {
      const userInfoData = xtreamApi.getUserInfo();
      
      if (userInfoData) {
        const now = new Date();
        const expDate = userInfoData.exp_date ? new Date(userInfoData.exp_date) : null;
        const isActive = expDate ? expDate > now : false;
        
        setUserInfo({
          username: userInfoData.username,
          expDate: userInfoData.exp_date || 'Unknown',
          status: userInfoData.status || 'Unknown',
          isActive,
          maxConnections: userInfoData.max_connections || 'Unknown',
        });
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
    } finally {
      setIsLoadingUserInfo(false);
    }
  };

  // Function to format the expiration date
  const formatExpirationDate = (dateString: string): string => {
    try {
      // Check if it's Unix timestamp (numeric string)
      if (/^\d+$/.test(dateString)) {
        // Handle Unix timestamp (seconds since epoch)
        const timestamp = parseInt(dateString, 10) * 1000; // Convert to milliseconds
        const date = new Date(timestamp);
        
        // Check if date is valid
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString();
        }
      }
      
      // Check for YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString();
        }
      }
      
      // If we couldn't parse it as a date, return the original string
      return dateString;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Handle clearing favorites
  const handleClearFavorites = () => {
    Alert.alert(
      'Clear Favorites',
      'Are you sure you want to clear all your favorites? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearFavorites();
              Alert.alert('Success', 'All favorites have been cleared');
            } catch (error) {
              console.error('Failed to clear favorites:', error);
              Alert.alert('Error', 'Failed to clear favorites. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* User Info Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Account
          </Text>
        </View>

        {isLoadingUserInfo ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#1ce783" />
          </View>
        ) : userInfo ? (
          <View style={styles.userInfoContainer}>
            <View style={styles.userInfoItem}>
              <Text style={styles.userInfoLabel}>Username:</Text>
              <Text style={styles.userInfoValue}>{userInfo.username}</Text>
            </View>
            
            <View style={styles.userInfoItem}>
              <Text style={styles.userInfoLabel}>Status:</Text>
              <Text 
                style={[
                  styles.userInfoValue, 
                  {color: userInfo.isActive ? '#1ce783' : '#ff5252'}
                ]}
              >
                {userInfo.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            
            <View style={styles.userInfoItem}>
              <Text style={styles.userInfoLabel}>Expiration:</Text>
              <Text style={styles.userInfoValue}>
                {formatExpirationDate(userInfo.expDate)}
              </Text>
            </View>
            
            <View style={styles.userInfoItem}>
              <Text style={styles.userInfoLabel}>Max Connections:</Text>
              <Text style={styles.userInfoValue}>{userInfo.maxConnections}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Parental Control Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Parental Control
          </Text>
        </View>
        
        <View style={styles.menuItem}>
          <Text style={styles.menuItemText}>Parental Control</Text>
          <Switch
            value={isEnabled}
            onValueChange={handleToggleParentalControl}
            trackColor={{ false: '#3e3e3e', true: '#1ce78360' }}
            thumbColor={isEnabled ? '#1ce783' : '#f4f3f4'}
          />
        </View>
        
        {isEnabled && (
          <>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setPinAction('change');
                setPinModalVisible(true);
              }}
            >
              <Ionicons name="key-outline" size={24} color="#1ce783" />
              <Text style={styles.menuItemText}>Change PIN</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleToggleRestrictedCategories}
            >
              <Ionicons
                name={
                  showRestrictedCategories
                    ? 'chevron-down-outline'
                    : 'chevron-forward-outline'
                }
                size={24}
                color="#1ce783"
              />
              <Text style={styles.menuItemText}>Restricted Categories</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Data Management
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={handleClearFavorites}
        >
          <Ionicons name="trash-outline" size={24} color="#ff5252" />
          <Text style={styles.menuItemTextDanger}>Clear Favorites</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={handleReloadContent}
          disabled={isReloading}
        >
          <Ionicons 
            name={isReloading ? "reload-circle" : "reload-outline"} 
            size={24} 
            color={isReloading ? "#aaa" : "#1ce783"} 
          />
          <Text style={[
            styles.menuItemText,
            isReloading && { color: '#aaa' }
          ]}>
            {reloadStatus}
          </Text>
          {isReloading && <ActivityIndicator size="small" color="#1ce783" style={styles.menuItemIcon} />}
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.menuItem} onPress={logout}>
        <Ionicons name="log-out-outline" size={24} color="#ff5252" />
        <Text style={styles.menuItemTextDanger}>Logout</Text>
      </TouchableOpacity>

      {/* PIN Modal */}
      <Modal
        visible={pinModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isEnabled ? 'Change PIN' : 'Set PIN'}
            </Text>
            
            {isEnabled && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Current PIN</Text>
                <TextInput
                  style={styles.input}
                  value={currentPin}
                  onChangeText={setCurrentPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                  placeholder="Enter current PIN"
                  placeholderTextColor="#777"
                />
              </View>
            )}
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New PIN</Text>
              <TextInput
                style={styles.input}
                value={newPin}
                onChangeText={setNewPin}
                keyboardType="number-pad"
                maxLength={6}
                secureTextEntry
                placeholder="Enter new PIN"
                placeholderTextColor="#777"
              />
            </View>
            
            {pinError ? (
              <Text style={styles.errorText}>{pinError}</Text>
            ) : null}
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setPinModalVisible(false);
                  setCurrentPin('');
                  setNewPin('');
                  setPinError('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => handlePinConfirmation(currentPin)}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1c20',
  },
  sectionTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2c30',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2c30',
  },
  menuItemText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 16,
    flex: 1,
  },
  menuItemTextDanger: {
    fontSize: 16,
    color: '#ff5252',
    marginLeft: 16,
  },
  menuItemIcon: {
    marginLeft: 8,
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2c30',
  },
  switchItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchItemText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 16,
  },
  categoriesList: {
    padding: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2c30',
  },
  categoryName: {
    fontSize: 14,
    color: '#fff',
  },
  aboutItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2c30',
  },
  aboutLabel: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
  },
  aboutValue: {
    fontSize: 16,
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#1a1c20',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#272830',
    color: '#fff',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  errorText: {
    color: '#ff5252',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: '#ccc',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#1ce783',
  },
  confirmButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfoContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2c30',
  },
  userInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  userInfoLabel: {
    fontSize: 14,
    color: '#aaa',
  },
  userInfoValue: {
    fontSize: 16,
    color: '#fff',
  },
  userInfoError: {
    fontSize: 16,
    color: '#ff5252',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2c30',
  },
  refreshButton: {
    padding: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2c30',
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 16,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2c30',
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    fontSize: 16,
    color: '#fff',
  },
  logoutButton: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2c30',
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#ff5252',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
}); 
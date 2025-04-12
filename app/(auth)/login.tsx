import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { getSavedUsers, SavedUser, removeUser } from '../../services/UserManager';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [showUserList, setShowUserList] = useState(false);
  const [savedUsers, setSavedUsers] = useState<SavedUser[]>([]);
  const { login, isLoading, error } = useAuth();
  const router = useRouter();

  // Load saved users on component mount
  useEffect(() => {
    loadSavedUsers();
  }, []);

  const loadSavedUsers = async () => {
    const users = await getSavedUsers();
    setSavedUsers(users);
  };

  const handleLogin = async () => {
    if (!username || !password || !serverUrl) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await login({
        username,
        password,
        serverUrl,
      });
    } catch (err) {
      // Error is handled in AuthContext
    }
  };

  const toggleSecureEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  const handleSelectUser = (user: SavedUser) => {
    setUsername(user.username);
    setPassword(user.password);
    setServerUrl(user.serverUrl);
    setShowUserList(false);
  };

  const handleDeleteUser = async (user: SavedUser) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to remove ${user.username}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeUser(user.username);
            loadSavedUsers();
          },
        },
      ]
    );
  };

  const renderUserItem = ({ item }: { item: SavedUser }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleSelectUser(item)}
    >
      <View style={styles.userIconContainer}>
        <Text style={styles.userIconText}>{item.username.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        <Text style={styles.serverUrl}>{item.serverUrl}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteUserButton}
        onPress={() => handleDeleteUser(item)}
      >
        <Ionicons name="trash-outline" size={20} color="#ff5252" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1a1c20', '#17181c', '#0f1014']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.headerContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Sign In</Text>
              <View style={styles.placeholder} />
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.logoText}>HuluXtream</Text>
              <Text style={styles.subtitle}>
                Enter your IPTV provider credentials
              </Text>

              {error && <Text style={styles.errorText}>{error}</Text>}

              {savedUsers.length > 0 && (
                <TouchableOpacity
                  style={styles.userListButton}
                  onPress={() => setShowUserList(true)}
                >
                  <Ionicons name="people" size={20} color="#1ce783" style={styles.userListIcon} />
                  <Text style={styles.userListText}>Choose from saved users</Text>
                </TouchableOpacity>
              )}

              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#aaa" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#aaa"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#aaa" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#aaa"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secureTextEntry}
                />
                <TouchableOpacity onPress={toggleSecureEntry} style={styles.secureButton}>
                  <Ionicons
                    name={secureTextEntry ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#aaa"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="server-outline" size={20} color="#aaa" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Server URL (e.g., http://example.com:8080)"
                  placeholderTextColor="#aaa"
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.loginButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* User List Modal */}
        <Modal
          visible={showUserList}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowUserList(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Saved Users</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowUserList(false)}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={savedUsers}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.username}
                contentContainerStyle={styles.userList}
              />
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1014',
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    marginBottom: 40,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  formContainer: {
    paddingHorizontal: 32,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1ce783', // Hulu green color
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 30,
  },
  errorText: {
    color: '#ff5252',
    textAlign: 'center',
    marginBottom: 16,
  },
  userListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(28, 231, 131, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  userListIcon: {
    marginRight: 8,
  },
  userListText: {
    color: '#1ce783',
    fontSize: 16,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#fff',
    fontSize: 16,
  },
  secureButton: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: '#1ce783', // Hulu green color
    borderRadius: 8,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1a1c20',
    borderRadius: 12,
    width: '100%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2c30',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  userList: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2c30',
  },
  userIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1ce783',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userIconText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  serverUrl: {
    color: '#aaa',
    fontSize: 12,
  },
  deleteUserButton: {
    padding: 8,
  },
}); 
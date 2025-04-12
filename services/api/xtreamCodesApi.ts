import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants for storage keys
const AUTH_STORAGE_KEY = 'huluxtream_auth';
const VOD_CACHE_KEY = 'huluxtream_vod_cache';
const VOD_CATEGORIES_CACHE_KEY = 'huluxtream_vod_categories_cache';
const SERIES_CACHE_KEY = 'huluxtream_series_cache';
const SERIES_CATEGORIES_CACHE_KEY = 'huluxtream_series_categories_cache';
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Types
export interface XtreamCredentials {
  username: string;
  password: string;
  serverUrl: string;
}

export interface AuthResponse {
  user_info: {
    username: string;
    password: string;
    message: string;
    auth: number;
    status: string;
    exp_date: string;
    is_trial: string;
    active_cons: string;
    created_at: string;
    max_connections: string;
    allowed_output_formats: string[];
  };
  server_info: {
    url: string;
    port: string;
    https_port: string;
    server_protocol: string;
    rtmp_port: string;
    timezone: string;
    timestamp_now: number;
    time_now: string;
  };
}

export interface Category {
  category_id: string;
  category_name: string;
  parent_id: number;
  category_type?: 'live' | 'movie' | 'series';
}

export interface Channel {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

export interface Movie {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
}

export interface Series {
  series_id: number;
  name: string;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  release_date: string;
  last_modified: string;
  rating: string;
  rating_5based: number;
  backdrop_path: string;
  youtube_trailer: string;
  episode_run_time: string;
  category_id: string;
}

export interface Episode {
  id: string;
  episode_num: number;
  title: string;
  container_extension: string;
  info: {
    tmdb_id: number;
    releasedate: string;
    plot: string;
    duration_secs: number;
    duration: string;
    movie_image: string;
    bitrate: number;
    rating: number;
    season: number;
  };
}

class XtreamCodesApi {
  private credentials: XtreamCredentials | null = null;
  private authData: AuthResponse | null = null;

  // Add cache properties
  private vodCache: { 
    data: Movie[]; 
    timestamp: number; 
    categoryId?: string;
  } | null = null;
  
  private vodCategoriesCache: { 
    data: Category[]; 
    timestamp: number;
  } | null = null;
  
  // Add series cache properties
  private seriesCache: { 
    data: Series[]; 
    timestamp: number; 
    categoryId?: string;
  } | null = null;
  
  private seriesCategoriesCache: { 
    data: Category[]; 
    timestamp: number;
  } | null = null;

  constructor() {
    this.loadCredentials();
    this.loadCaches(); // Load caches on initialization
  }

  private async loadCredentials() {
    try {
      const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        const parsed = JSON.parse(storedAuth);
        this.credentials = parsed.credentials;
        this.authData = parsed.authData;
      }
    } catch (error) {
      console.error('Failed to load auth data:', error);
    }
  }

  private async saveCredentials() {
    try {
      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          credentials: this.credentials,
          authData: this.authData,
        })
      );
    } catch (error) {
      console.error('Failed to save auth data:', error);
    }
  }

  // Load caches from AsyncStorage
  private async loadCaches() {
    try {
      const [vodCacheStr, vodCategoriesCacheStr, seriesCacheStr, seriesCategoriesCacheStr] = await Promise.all([
        AsyncStorage.getItem(VOD_CACHE_KEY),
        AsyncStorage.getItem(VOD_CATEGORIES_CACHE_KEY),
        AsyncStorage.getItem(SERIES_CACHE_KEY),
        AsyncStorage.getItem(SERIES_CATEGORIES_CACHE_KEY)
      ]);
      
      if (vodCacheStr) {
        this.vodCache = JSON.parse(vodCacheStr);
      }
      
      if (vodCategoriesCacheStr) {
        this.vodCategoriesCache = JSON.parse(vodCategoriesCacheStr);
      }
      
      if (seriesCacheStr) {
        this.seriesCache = JSON.parse(seriesCacheStr);
      }
      
      if (seriesCategoriesCacheStr) {
        this.seriesCategoriesCache = JSON.parse(seriesCategoriesCacheStr);
      }
    } catch (error) {
      console.error('Failed to load caches:', error);
    }
  }

  // Save VOD cache to AsyncStorage
  private async saveVodCache(movies: Movie[], categoryId?: string) {
    try {
      const cacheObject = {
        data: movies,
        timestamp: Date.now(),
        categoryId
      };
      
      this.vodCache = cacheObject;
      await AsyncStorage.setItem(VOD_CACHE_KEY, JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Failed to save VOD cache:', error);
    }
  }

  // Save VOD categories cache to AsyncStorage
  private async saveVodCategoriesCache(categories: Category[]) {
    try {
      const cacheObject = {
        data: categories,
        timestamp: Date.now()
      };
      
      this.vodCategoriesCache = cacheObject;
      await AsyncStorage.setItem(VOD_CATEGORIES_CACHE_KEY, JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Failed to save VOD categories cache:', error);
    }
  }

  // Save series cache to AsyncStorage
  private async saveSeriesCache(series: Series[], categoryId?: string) {
    try {
      const cacheObject = {
        data: series,
        timestamp: Date.now(),
        categoryId
      };
      
      this.seriesCache = cacheObject;
      await AsyncStorage.setItem(SERIES_CACHE_KEY, JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Failed to save series cache:', error);
    }
  }

  // Save series categories cache to AsyncStorage
  private async saveSeriesCategoriesCache(categories: Category[]) {
    try {
      const cacheObject = {
        data: categories,
        timestamp: Date.now()
      };
      
      this.seriesCategoriesCache = cacheObject;
      await AsyncStorage.setItem(SERIES_CATEGORIES_CACHE_KEY, JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Failed to save series categories cache:', error);
    }
  }

  // Check if cache is valid (not expired)
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < CACHE_EXPIRY_TIME;
  }

  async login(credentials: XtreamCredentials): Promise<AuthResponse> {
    try {
      // Clean up server URL (remove trailing slashes)
      const serverUrl = credentials.serverUrl.replace(/\/+$/, '');
      
      const response = await axios.get(`${serverUrl}/player_api.php`, {
        params: {
          username: credentials.username,
          password: credentials.password,
        },
      });

      if (response.data?.user_info?.auth === 0) {
        throw new Error('Authentication failed. Please check your credentials.');
      }

      this.credentials = {
        ...credentials,
        serverUrl,
      };
      this.authData = response.data;
      
      await this.saveCredentials();
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async isLoggedIn(): Promise<boolean> {
    return !!(this.credentials && this.authData);
  }

  async logout() {
    // Get the username before clearing credentials
    const userInfo = this.getUserInfo();
    const username = userInfo?.username;
    
    // Clear credentials
    this.credentials = null;
    this.authData = null;
    
    // Clear caches
    this.vodCache = null;
    this.vodCategoriesCache = null;
    this.seriesCache = null;
    this.seriesCategoriesCache = null;
    
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    await AsyncStorage.removeItem(VOD_CACHE_KEY);
    await AsyncStorage.removeItem(VOD_CATEGORIES_CACHE_KEY);
    await AsyncStorage.removeItem(SERIES_CACHE_KEY);
    await AsyncStorage.removeItem(SERIES_CATEGORIES_CACHE_KEY);

    // Clear user-specific data if we have a username
    if (username) {
      try {
        // Clear user-specific favorites
        const favoritesKey = `huluxtream_favorites_${username}`;
        await AsyncStorage.removeItem(favoritesKey);
        
        // Clear user-specific parental control settings
        const pcEnabledKey = `${username}_huluxtream_parental_control_enabled`;
        const pcPinKey = `${username}_huluxtream_parental_control_pin`;
        const pcCategoriesKey = `${username}_huluxtream_restricted_categories`;
        
        await AsyncStorage.removeItem(pcEnabledKey);
        await AsyncStorage.removeItem(pcPinKey);
        await AsyncStorage.removeItem(pcCategoriesKey);
        
        console.log(`Cleared user-specific data for ${username}`);
      } catch (error) {
        console.error('Error clearing user-specific data:', error);
      }
    }
  }

  private ensureAuthenticated() {
    if (!this.credentials || !this.authData) {
      throw new Error('Not authenticated. Please login first.');
    }
  }

  private get apiUrl(): string {
    this.ensureAuthenticated();
    return `${this.credentials!.serverUrl}/player_api.php`;
  }

  async getLiveCategories(): Promise<Category[]> {
    this.ensureAuthenticated();
    
    const response = await axios.get(this.apiUrl, {
      params: {
        username: this.credentials!.username,
        password: this.credentials!.password,
        action: 'get_live_categories',
      },
    });
    
    // Add category type for filtering purposes
    return response.data.map((category: Category) => ({
      ...category,
      category_type: 'live',
    }));
  }

  async getVodCategories(): Promise<Category[]> {
    this.ensureAuthenticated();
    
    // Check cache first
    if (this.vodCategoriesCache && this.isCacheValid(this.vodCategoriesCache.timestamp)) {
      console.log('Using cached VOD categories');
      return this.vodCategoriesCache.data;
    }
    
    // If no valid cache, fetch from API
    console.log('Fetching VOD categories from API');
    const response = await axios.get(this.apiUrl, {
      params: {
        username: this.credentials!.username,
        password: this.credentials!.password,
        action: 'get_vod_categories',
      },
    });
    
    const categories = response.data.map((category: Category) => ({
      ...category,
      category_type: 'movie',
    }));
    
    // Cache the results
    this.saveVodCategoriesCache(categories);
    
    return categories;
  }

  async getSeriesCategories(): Promise<Category[]> {
    this.ensureAuthenticated();
    
    // Check cache first
    if (this.seriesCategoriesCache && this.isCacheValid(this.seriesCategoriesCache.timestamp)) {
      console.log('Using cached series categories');
      return this.seriesCategoriesCache.data;
    }
    
    // If no valid cache, fetch from API
    console.log('Fetching series categories from API');
    const response = await axios.get(this.apiUrl, {
      params: {
        username: this.credentials!.username,
        password: this.credentials!.password,
        action: 'get_series_categories',
      },
    });
    
    const categories = response.data.map((category: Category) => ({
      ...category,
      category_type: 'series',
    }));
    
    // Cache the results
    this.saveSeriesCategoriesCache(categories);
    
    return categories;
  }

  async getLiveStreams(category_id?: string): Promise<Channel[]> {
    this.ensureAuthenticated();
    
    const params: Record<string, string> = {
      username: this.credentials!.username,
      password: this.credentials!.password,
      action: 'get_live_streams',
    };

    if (category_id) {
      params.category_id = category_id;
    }
    
    const response = await axios.get(this.apiUrl, { params });
    return response.data;
  }

  async getVodStreams(category_id?: string): Promise<Movie[]> {
    this.ensureAuthenticated();
    
    // Check cache first if the category matches
    if (this.vodCache && 
        this.isCacheValid(this.vodCache.timestamp) && 
        this.vodCache.categoryId === category_id) {
      console.log('Using cached VOD streams');
      return this.vodCache.data;
    }
    
    // If no valid cache, fetch from API
    console.log('Fetching VOD streams from API');
    const params: Record<string, string> = {
      username: this.credentials!.username,
      password: this.credentials!.password,
      action: 'get_vod_streams',
    };

    if (category_id) {
      params.category_id = category_id;
    }
    
    const response = await axios.get(this.apiUrl, { params });
    
    // Cache the results
    this.saveVodCache(response.data, category_id);
    
    return response.data;
  }

  async getSeries(category_id?: string): Promise<Series[]> {
    this.ensureAuthenticated();
    
    // Check cache first if the category matches
    if (this.seriesCache && 
        this.isCacheValid(this.seriesCache.timestamp) && 
        this.seriesCache.categoryId === category_id) {
      console.log('Using cached series data');
      return this.seriesCache.data;
    }
    
    // If no valid cache, fetch from API
    console.log('Fetching series data from API');
    const params: Record<string, string> = {
      username: this.credentials!.username,
      password: this.credentials!.password,
      action: 'get_series',
    };

    if (category_id) {
      params.category_id = category_id;
    }
    
    const response = await axios.get(this.apiUrl, { params });
    
    // Cache the results
    this.saveSeriesCache(response.data, category_id);
    
    return response.data;
  }

  async getSeriesInfo(series_id: number): Promise<any> {
    this.ensureAuthenticated();
    
    const response = await axios.get(this.apiUrl, {
      params: {
        username: this.credentials!.username,
        password: this.credentials!.password,
        action: 'get_series_info',
        series_id: series_id,
      },
    });
    
    return response.data;
  }

  async getVodInfo(vod_id: number): Promise<any> {
    this.ensureAuthenticated();
    
    const response = await axios.get(this.apiUrl, {
      params: {
        username: this.credentials!.username,
        password: this.credentials!.password,
        action: 'get_vod_info',
        vod_id: vod_id,
      },
    });
    
    return response.data;
  }

  async getEpg(stream_id: number, limit?: number): Promise<any> {
    this.ensureAuthenticated();
    
    const params: Record<string, string | number> = {
      username: this.credentials!.username,
      password: this.credentials!.password,
      action: 'get_short_epg',
      stream_id: stream_id,
    };

    if (limit) {
      params.limit = limit;
    }
    
    const response = await axios.get(this.apiUrl, { params });
    return response.data;
  }

  // Get stream URL for live TV
  getLiveStreamUrl(stream_id: number): string {
    this.ensureAuthenticated();
    return `${this.credentials!.serverUrl}/live/${this.credentials!.username}/${this.credentials!.password}/${stream_id}.m3u8`;
  }

  // Get stream URL for VOD (Movies)
  getVodStreamUrl(stream_id: number): string {
    this.ensureAuthenticated();
    return `${this.credentials!.serverUrl}/movie/${this.credentials!.username}/${this.credentials!.password}/${stream_id}.mp4`;
  }

  // Get stream URL for Series episode
  getSeriesStreamUrl(series_id: number, episode_id: string, format: 'mp4'|'m3u8'|'ts' = 'mp4'): string {
    this.ensureAuthenticated();
    return `${this.credentials!.serverUrl}/series/${this.credentials!.username}/${this.credentials!.password}/${episode_id}.${format}`;
  }

  // Search methods
  async searchLiveStreams(query: string): Promise<Channel[]> {
    const allChannels = await this.getLiveStreams();
    return allChannels.filter(channel => 
      channel.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  async searchVodStreams(query: string): Promise<Movie[]> {
    const allMovies = await this.getVodStreams();
    return allMovies.filter(movie => 
      movie.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  async searchSeries(query: string): Promise<Series[]> {
    const allSeries = await this.getSeries();
    return allSeries.filter(series => 
      series.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Update clearCache method to also clear local caches
  async clearCache(): Promise<void> {
    try {
      // Clear in-memory caches
      this.vodCache = null;
      this.vodCategoriesCache = null;
      this.seriesCache = null;
      this.seriesCategoriesCache = null;
      
      // Clear AsyncStorage caches
      await AsyncStorage.removeItem(VOD_CACHE_KEY);
      await AsyncStorage.removeItem(VOD_CATEGORIES_CACHE_KEY);
      await AsyncStorage.removeItem(SERIES_CACHE_KEY);
      await AsyncStorage.removeItem(SERIES_CATEGORIES_CACHE_KEY);
      
      // Keep track of original credentials and auth data
      const savedCredentials = this.credentials;
      const savedAuth = this.authData;

      // Variables to store refreshed data
      let liveChannels: Channel[] = [];
      let vodContent: Movie[] = [];
      let seriesContent: Series[] = [];
      
      // Fetch fresh content directly from the API
      if (savedCredentials && savedAuth) {
        console.log('Reloading fresh content data...');
        
        // Force reload of live channels
        try {
          liveChannels = await this.getLiveStreams();
          console.log(`Reloaded ${liveChannels.length} live channels`);
        } catch (err) {
          console.error('Error reloading live channels:', err);
        }
        
        // Force reload of VOD content
        try {
          vodContent = await this.getVodStreams();
          console.log(`Reloaded ${vodContent.length} movies`);
        } catch (err) {
          console.error('Error reloading movies:', err);
        }
        
        // Force reload of series content
        try {
          seriesContent = await this.getSeries();
          console.log(`Reloaded ${seriesContent.length} series`);
        } catch (err) {
          console.error('Error reloading series:', err);
        }
      }
      
      console.log('Content cache cleared and reloaded successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Error clearing cache:', error);
      return Promise.reject(error);
    }
  }

  /**
   * Get user information from the auth data
   * @returns User info or null if not logged in
   */
  getUserInfo(): { 
    username: string;
    exp_date?: string;
    status?: string;
    max_connections?: string;
  } | null {
    if (!this.credentials || !this.authData) {
      return null;
    }
    
    return {
      username: this.credentials.username,
      // Add other user information from authData if available
      exp_date: this.authData.user_info?.exp_date,
      status: this.authData.user_info?.status,
      max_connections: this.authData.user_info?.max_connections,
    };
  }
}

export const xtreamApi = new XtreamCodesApi(); 
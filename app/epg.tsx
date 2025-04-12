import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useChannelsContext } from '../contexts/ChannelsContext';
import { useScreenSize } from '../hooks/useScreenSize';
// @ts-ignore
import { format, addDays, parseISO, isWithinInterval, isSameDay, addHours, startOfDay } from 'date-fns';
import { StatusBar } from 'expo-status-bar';

// Constants for EPG grid
const EPG_TIME_WINDOW = 24; // 24 hours
const HOUR_WIDTH = 150; // Width of one hour in the EPG grid

// Interface for EPG data
interface EpgProgram {
  id: string;
  title: string;
  description: string;
  start: string; // ISO date string
  end: string; // ISO date string
  channel_id: number;
  category?: string;
}

interface Channel {
  id: number;
  name: string;
  logo: string;
  programs: EpgProgram[];
  hasEpg: boolean;
}

export default function EpgScreen() {
  const { isTV, isTablet } = useScreenSize();
  const { categories, liveChannels, isLoading, fetchChannelEpg } = useChannelsContext();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [epgData, setEpgData] = useState<Channel[]>([]);
  const [isEpgLoading, setIsEpgLoading] = useState(true);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const channelScrollRef = useRef<FlatList>(null);

  // Generate dates for the date selector (today + 7 days)
  const dates = Array.from({ length: 8 }, (_, i) => addDays(new Date(), i));

  // Get current time to scroll to
  useEffect(() => {
    // Scroll to current time on initial load (after a small delay to ensure render)
    setTimeout(() => {
      const now = new Date();
      const dayStart = startOfDay(now);
      const hoursSinceStart = (now.getTime() - dayStart.getTime()) / (1000 * 60 * 60);
      const scrollPosition = hoursSinceStart * HOUR_WIDTH;
      
      horizontalScrollRef.current?.scrollTo({ x: scrollPosition, animated: true });
    }, 500);
  }, []);

  // Load EPG data when date changes
  useEffect(() => {
    const loadEpgData = async () => {
      setIsEpgLoading(true);
      
      try {
        // Filter channels that have EPG data
        const channelsWithEpg = liveChannels.filter((channel: any) => 
          channel.tv_archive === 1 || channel.epg_channel_id
        );
        
        // Create a new array with necessary channel info and empty programs array
        const channelsData: Channel[] = await Promise.all(
          channelsWithEpg.map(async (channel: any) => {
            // Fetch EPG data for this channel
            const epgPrograms = await fetchChannelEpg(channel.stream_id);
            
            // Filter programs for the selected date
            const filteredPrograms = epgPrograms.filter((program: any) => 
              isSameDay(parseISO(program.start), selectedDate)
            );
            
            return {
              id: channel.stream_id,
              name: channel.name,
              logo: channel.stream_icon,
              programs: filteredPrograms,
              hasEpg: filteredPrograms.length > 0
            };
          })
        );
        
        // Only include channels that actually have EPG data for the selected date
        setEpgData(channelsData.filter(channel => channel.hasEpg));
      } catch (error) {
        console.error('Error loading EPG data:', error);
      } finally {
        setIsEpgLoading(false);
      }
    };

    if (liveChannels.length > 0) {
      loadEpgData();
    }
  }, [liveChannels, selectedDate, fetchChannelEpg]);

  // Generate timeline hours
  const generateTimelineHours = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(i);
    }
    return hours;
  };

  // Handle program item press
  const handleProgramPress = (channel: Channel, program: EpgProgram) => {
    // Navigate to program details or play the channel
    router.push(`/live-player-route?id=${channel.id}&programId=${program.id}` as any);
  };

  // Render date button
  const renderDateButton = (date: Date, index: number) => {
    const isSelected = isSameDay(date, selectedDate);
    const dateLabel = index === 0 ? 'Today' : format(date, 'EEE d');
    
    return (
      <TouchableOpacity
        key={index}
        style={[styles.dateButton, isSelected && styles.selectedDateButton]}
        onPress={() => setSelectedDate(date)}
      >
        <Text style={[styles.dateButtonText, isSelected && styles.selectedDateText]}>
          {dateLabel}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render program item
  const renderProgramItem = (program: EpgProgram, channel: Channel) => {
    const start = parseISO(program.start);
    const end = parseISO(program.end);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // in hours
    const width = duration * HOUR_WIDTH;
    
    // Calculate position based on start time
    const dayStart = startOfDay(start);
    const hoursSinceStart = (start.getTime() - dayStart.getTime()) / (1000 * 60 * 60);
    const position = hoursSinceStart * HOUR_WIDTH;
    
    // Check if program is currently airing
    const now = new Date();
    const isCurrentlyAiring = isWithinInterval(now, { start, end });
    
    return (
      <TouchableOpacity
        key={program.id}
        style={[
          styles.programItem,
          { width, left: position },
          isCurrentlyAiring && styles.currentProgram
        ]}
        onPress={() => handleProgramPress(channel, program)}
      >
        <Text style={styles.programTitle} numberOfLines={1}>
          {program.title}
        </Text>
        <Text style={styles.programTime} numberOfLines={1}>
          {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render channel row
  const renderChannelRow = ({ item: channel }: { item: Channel }) => {
    return (
      <View style={styles.channelRow}>
        <View style={styles.channelInfo}>
          <Image source={{ uri: channel.logo }} style={styles.channelLogo} />
          <Text style={styles.channelName} numberOfLines={1}>{channel.name}</Text>
        </View>
        <View style={styles.programsContainer}>
          {channel.programs.map(program => renderProgramItem(program, channel))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={['#1E1E1E', '#121212']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>TV Guide</Text>
        
        {/* Date selector */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateButtonsContainer}
        >
          {dates.map(renderDateButton)}
        </ScrollView>
      </LinearGradient>
      
      {/* EPG Grid */}
      {isLoading || isEpgLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Loading TV Guide...</Text>
        </View>
      ) : epgData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No program guide available for this date</Text>
        </View>
      ) : (
        <View style={styles.gridContainer}>
          {/* Timeline header */}
          <View style={styles.timelineContainer}>
            <View style={styles.timelineSpacer} />
            <ScrollView
              ref={horizontalScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.timeline}
              contentContainerStyle={{ width: HOUR_WIDTH * 24 }}
              onScroll={(e) => {
                // Synchronize the horizontal scroll of programs
                const offsetX = e.nativeEvent.contentOffset.x;
                if (channelScrollRef.current) {
                  const programsContainer = channelScrollRef.current.getScrollableNode();
                  programsContainer.scrollTo({ x: offsetX, animated: false });
                }
              }}
              scrollEventThrottle={16}
            >
              {generateTimelineHours().map(hour => (
                <View key={hour} style={styles.timelineHour}>
                  <Text style={styles.timelineText}>{hour}:00</Text>
                </View>
              ))}
              {/* Current time indicator */}
              {isSameDay(new Date(), selectedDate) && (
                <View 
                  style={[
                    styles.currentTimeIndicator, 
                    { 
                      left: ((new Date().getHours() * 60 + new Date().getMinutes()) / 60) * HOUR_WIDTH 
                    }
                  ]}
                />
              )}
            </ScrollView>
          </View>
          
          {/* Channels and programs */}
          <FlatList
            ref={channelScrollRef}
            data={epgData}
            keyExtractor={item => item.id.toString()}
            renderItem={renderChannelRow}
            style={styles.channelList}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 80 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E0E',
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
  },
  backButton: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  dateButtonsContainer: {
    flexDirection: 'row',
    paddingBottom: 8,
  },
  dateButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedDateButton: {
    backgroundColor: '#E50914',
  },
  dateButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  selectedDateText: {
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  gridContainer: {
    flex: 1,
  },
  timelineContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  timelineSpacer: {
    width: 150,
    height: 40,
    backgroundColor: '#1A1A1A',
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  timeline: {
    height: 40,
    backgroundColor: '#1A1A1A',
  },
  timelineHour: {
    width: HOUR_WIDTH,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  timelineText: {
    color: 'white',
    fontSize: 12,
  },
  currentTimeIndicator: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: '#E50914',
  },
  channelList: {
    flex: 1,
  },
  channelRow: {
    flexDirection: 'row',
    height: 80,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  channelInfo: {
    width: 150,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  channelLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  channelName: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
  programsContainer: {
    position: 'relative',
    flexDirection: 'row',
    height: '100%',
    width: HOUR_WIDTH * 24,
  },
  programItem: {
    position: 'absolute',
    height: '100%',
    padding: 8,
    backgroundColor: '#2C2C2C',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#444',
    marginHorizontal: 1,
    justifyContent: 'center',
  },
  currentProgram: {
    borderLeftColor: '#E50914',
    backgroundColor: '#3A3A3A',
  },
  programTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  programTime: {
    color: '#CCC',
    fontSize: 12,
    marginTop: 4,
  },
}); 
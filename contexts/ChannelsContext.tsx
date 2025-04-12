import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { xtreamApi } from '../services/api/xtreamCodesApi';

interface Channel {
  stream_id: number;
  name: string;
  stream_icon: string;
  tv_archive: number;
  epg_channel_id?: string;
}

interface EpgProgram {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  channel_id: number;
  category?: string;
}

interface ChannelsContextType {
  categories: string[];
  liveChannels: Channel[];
  isLoading: boolean;
  fetchChannelEpg: (channelId: number) => Promise<EpgProgram[]>;
}

const ChannelsContext = createContext<ChannelsContextType | undefined>(undefined);

export const useChannelsContext = () => {
  const context = useContext(ChannelsContext);
  if (!context) {
    throw new Error('useChannelsContext must be used within a ChannelsProvider');
  }
  return context;
};

interface ChannelsProviderProps {
  children: ReactNode;
}

export const ChannelsProvider: React.FC<ChannelsProviderProps> = ({ children }) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [liveChannels, setLiveChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadChannels = async () => {
      try {
        setIsLoading(true);
        // Load live channels
        const liveTvData = await xtreamApi.getLiveStreams();
        setLiveChannels(liveTvData);
        
        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(liveTvData.map((channel: any) => channel.category_name))
        );
        setCategories(uniqueCategories as string[]);
      } catch (error) {
        console.error('Error loading channels:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChannels();
  }, []);

  const fetchChannelEpg = async (channelId: number): Promise<EpgProgram[]> => {
    try {
      // Fetch EPG data for the specific channel
      const epgData = await xtreamApi.getEpg(channelId);
      return epgData || [];
    } catch (error) {
      console.error(`Error fetching EPG for channel ${channelId}:`, error);
      return [];
    }
  };

  const value = {
    categories,
    liveChannels,
    isLoading,
    fetchChannelEpg,
  };

  return (
    <ChannelsContext.Provider value={value}>
      {children}
    </ChannelsContext.Provider>
  );
}; 
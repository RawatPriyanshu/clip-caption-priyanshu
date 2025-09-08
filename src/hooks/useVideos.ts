import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';
import { metadataGenerator } from '@/services/metadataGenerator';

export interface VideoRecord {
  id: string;
  name: string;
  original_filename: string;
  file_size: number;
  duration: number | null;
  thumbnail_url: string | null;
  processing_status: string;
  created_at: string;
  metadata_count: number;
}

export interface VideoMetadata {
  platform: string;
  title: string | null;
  description: string | null;
  hashtags: string[] | null;
  additional_data: any;
  created_at: string;
}

export const useVideos = () => {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch user videos
  const fetchVideos = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_videos', {
        _user_id: user.id
      });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast({
        title: "Error loading videos",
        description: "Failed to load your video history.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Upload video to storage and create database record
  const uploadVideo = async (file: File, videoName: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('Starting video upload for:', videoName, 'User:', user.id);
      
      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      console.log('Uploading to storage with filename:', fileName);
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('videos')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }
      
      console.log('Storage upload successful:', uploadData);

      // Create video record in database
      const { data: videoData, error: dbError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          name: videoName,
          original_filename: file.name,
          file_size: file.size,
          file_path: fileName,
          processing_status: 'pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Update status to completed since upload was successful
      const { error: updateError } = await supabase
        .from('videos')
        .update({ processing_status: 'completed' })
        .eq('id', videoData.id);

      if (updateError) throw updateError;

      return { ...videoData, processing_status: 'completed' };
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  };

  // Get video metadata
  const getVideoMetadata = async (videoId: string): Promise<VideoMetadata[]> => {
    try {
      const { data, error } = await supabase.rpc('get_video_metadata', {
        _video_id: videoId
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching video metadata:', error);
      throw error;
    }
  };

  // Delete video and its metadata
  const deleteVideo = async (videoId: string) => {
    try {
      // Delete metadata first (due to foreign key)
      await supabase
        .from('video_metadata')
        .delete()
        .eq('video_id', videoId);

      // Delete video record
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      // Refresh videos list
      await fetchVideos();
      
      toast({
        title: "Video deleted",
        description: "Video and its metadata have been removed.",
      });
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: "Error deleting video",
        description: "Failed to delete the video.",
        variant: "destructive"
      });
    }
  };

  // Generate metadata for a video
  const generateMetadata = async (
    videoId: string, 
    creatorName: string, 
    videoTopic: string, 
    language: string = 'en',
    keywords: string = ''
  ) => {
    try {
      // Create generation record
      const { error: genError } = await supabase
        .from('generations')
        .insert({
          user_id: user?.id,
          video_id: videoId,
          type: 'metadata',
          status: 'pending'
        });

      if (genError) throw genError;

      // Generate platform-specific metadata using the metadata generator
      const generatedMetadata = metadataGenerator.generatePlatformMetadata({
        creatorName,
        videoTopic,
        language,
        keywords
      });

      const metadataPromises = generatedMetadata.map(metadata => {
        return supabase
          .from('video_metadata')
          .insert({
            video_id: videoId,
            platform: metadata.platform.toLowerCase(),
            title: metadata.title,
            description: metadata.description,
            hashtags: metadata.hashtags
          });
      });

      await Promise.all(metadataPromises);

      // Update generation status
      await supabase
        .from('generations')
        .update({ status: 'completed' })
        .eq('video_id', videoId)
        .eq('status', 'pending');

      return await getVideoMetadata(videoId);
    } catch (error) {
      console.error('Error generating metadata:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [user]);

  return {
    videos,
    loading,
    fetchVideos,
    uploadVideo,
    getVideoMetadata,
    deleteVideo,
    generateMetadata
  };
};
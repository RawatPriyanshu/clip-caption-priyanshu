import { useState, useCallback, useRef } from 'react';
import { TranscriptionService, TranscriptionResult, TranscriptionProgress } from '@/services/transcriptionService';
import { SRTGenerator } from '@/utils/srtGenerator';
import { useToast } from './use-toast';

export interface TranscriptionOptions {
  language?: string;
  returnSegments?: boolean;
  chunkDuration?: number;
}

export const useTranscription = () => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState<TranscriptionProgress | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const { toast } = useToast();
  
  const transcriptionServiceRef = useRef<TranscriptionService | null>(null);

  const initializeService = useCallback(() => {
    if (!transcriptionServiceRef.current) {
      transcriptionServiceRef.current = new TranscriptionService((progress) => {
        setTranscriptionProgress(progress);
      });
    }
    return transcriptionServiceRef.current;
  }, []);

  const transcribeAudio = useCallback(async (
    audioBlob: Blob,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult | null> => {
    setIsTranscribing(true);
    setTranscriptionResult(null);
    setTranscriptionProgress(null);

    try {
      const service = initializeService();
      const result = await service.transcribeAudio(audioBlob, options);
      
      setTranscriptionResult(result);
      toast({
        title: "Transcription Complete",
        description: "Audio has been successfully transcribed.",
      });
      
      return result;
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Transcription Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsTranscribing(false);
      setTranscriptionProgress(null);
    }
  }, [initializeService, toast]);

  const transcribeVideo = useCallback(async (
    videoFile: File,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult | null> => {
    setIsTranscribing(true);
    setTranscriptionResult(null);
    setTranscriptionProgress(null);

    try {
      const service = initializeService();
      const result = await service.transcribeVideoFile(videoFile, options);
      
      setTranscriptionResult(result);
      toast({
        title: "Video Transcription Complete",
        description: "Video has been successfully transcribed.",
      });
      
      return result;
    } catch (error) {
      console.error('Video transcription error:', error);
      toast({
        title: "Video Transcription Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsTranscribing(false);
      setTranscriptionProgress(null);
    }
  }, [initializeService, toast]);

  const generateSRT = useCallback((
    result: TranscriptionResult | null = transcriptionResult,
    filename: string = 'subtitles'
  ) => {
    if (!result) {
      toast({
        title: "No Transcription Available",
        description: "Please transcribe audio/video first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const srtContent = SRTGenerator.generateSRT(result.segments);
      SRTGenerator.downloadSRT(srtContent, filename);
      
      toast({
        title: "SRT Downloaded",
        description: "Subtitle file has been downloaded successfully.",
      });
    } catch (error) {
      console.error('SRT generation error:', error);
      toast({
        title: "SRT Generation Failed",
        description: "Failed to generate subtitle file.",
        variant: "destructive",
      });
    }
  }, [transcriptionResult, toast]);

  const generateSRTFromText = useCallback((
    text: string,
    duration: number = 0,
    filename: string = 'subtitles'
  ) => {
    try {
      const srtContent = SRTGenerator.generateSRTFromText(text, duration);
      SRTGenerator.downloadSRT(srtContent, filename);
      
      toast({
        title: "SRT Downloaded",
        description: "Subtitle file has been generated and downloaded.",
      });
    } catch (error) {
      console.error('SRT generation error:', error);
      toast({
        title: "SRT Generation Failed",
        description: "Failed to generate subtitle file from text.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const getSupportedLanguages = useCallback(() => {
    const service = initializeService();
    return service.getSupportedLanguages();
  }, [initializeService]);

  const clearTranscription = useCallback(() => {
    setTranscriptionResult(null);
    setTranscriptionProgress(null);
  }, []);

  // Cleanup
  const dispose = useCallback(() => {
    if (transcriptionServiceRef.current) {
      transcriptionServiceRef.current.dispose();
      transcriptionServiceRef.current = null;
    }
  }, []);

  return {
    // State
    isTranscribing,
    transcriptionProgress,
    transcriptionResult,
    
    // Actions
    transcribeAudio,
    transcribeVideo,
    generateSRT,
    generateSRTFromText,
    clearTranscription,
    getSupportedLanguages,
    dispose
  };
};
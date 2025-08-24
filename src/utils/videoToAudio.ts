export interface AudioProcessingOptions {
  quality?: 'low' | 'medium' | 'high';
  sampleRate?: number;
  channels?: number;
  bitRate?: number;
}

export interface ProcessingProgress {
  stage: 'loading' | 'extracting' | 'compressing' | 'complete';
  progress: number;
  message: string;
}

export class VideoToAudioProcessor {
  private onProgress?: (progress: ProcessingProgress) => void;

  constructor(onProgress?: (progress: ProcessingProgress) => void) {
    this.onProgress = onProgress;
  }

  private updateProgress(stage: ProcessingProgress['stage'], progress: number, message: string) {
    this.onProgress?.({ stage, progress, message });
  }

  async extractAudioFromVideo(
    videoFile: File, 
    options: AudioProcessingOptions = {}
  ): Promise<{ audioBlob: Blob; duration: number }> {
    const {
      quality = 'medium',
      sampleRate = 16000, // Optimal for Whisper API
      channels = 1, // Mono for better API performance
      bitRate = 64000
    } = options;

    this.updateProgress('loading', 0, 'Loading video file...');

    try {
      // Create video element to load the file
      const videoElement = document.createElement('video');
      const videoUrl = URL.createObjectURL(videoFile);
      videoElement.src = videoUrl;
      
      await new Promise((resolve, reject) => {
        videoElement.onloadedmetadata = resolve;
        videoElement.onerror = reject;
      });

      this.updateProgress('extracting', 25, 'Extracting audio from video...');

      // Create audio context for processing
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate
      });

      // Create canvas and draw video frames to extract audio
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Set canvas dimensions
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;

      this.updateProgress('extracting', 50, 'Processing audio data...');

      // Create media element source
      const source = audioContext.createMediaElementSource(videoElement);
      
      // Create analyser for audio processing
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      
      source.connect(gainNode);
      gainNode.connect(analyser);
      
      // Set up recording
      const mediaRecorder = await this.createAudioRecorder(source, audioContext, {
        sampleRate,
        channels,
        bitRate
      });

      this.updateProgress('compressing', 75, 'Compressing audio...');

      // Record audio
      const audioBlob = await this.recordAudio(mediaRecorder, videoElement);
      
      this.updateProgress('complete', 100, 'Audio extraction complete!');

      // Clean up
      URL.revokeObjectURL(videoUrl);
      audioContext.close();

      return {
        audioBlob,
        duration: videoElement.duration
      };

    } catch (error) {
      console.error('Error extracting audio:', error);
      throw new Error(`Failed to extract audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createAudioRecorder(
    source: MediaElementAudioSourceNode,
    audioContext: AudioContext,
    options: { sampleRate: number; channels: number; bitRate: number }
  ): Promise<MediaRecorder> {
    // Create destination for recording
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);

    const mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: options.bitRate
    });

    return mediaRecorder;
  }

  private async recordAudio(mediaRecorder: MediaRecorder, videoElement: HTMLVideoElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        resolve(audioBlob);
      };

      mediaRecorder.onerror = reject;

      // Start recording
      mediaRecorder.start();
      
      // Play video to trigger audio recording
      videoElement.currentTime = 0;
      videoElement.play().then(() => {
        // Stop recording when video ends
        videoElement.onended = () => {
          mediaRecorder.stop();
        };
      }).catch(reject);
    });
  }

  // Alternative method using OfflineAudioContext for better performance
  async extractAudioOffline(videoFile: File): Promise<{ audioBuffer: ArrayBuffer; duration: number }> {
    this.updateProgress('loading', 0, 'Loading video for offline processing...');

    try {
      const arrayBuffer = await videoFile.arrayBuffer();
      
      this.updateProgress('extracting', 50, 'Processing audio offline...');

      // Note: This is a simplified version. In a real implementation,
      // you'd need to use libraries like FFmpeg.wasm for proper video decoding
      // For now, we'll use the online method above
      
      throw new Error('Offline processing not implemented yet. Use extractAudioFromVideo instead.');
      
    } catch (error) {
      console.error('Error in offline audio extraction:', error);
      throw error;
    }
  }

  // Convert audio blob to base64 for API transmission
  async audioToBase64(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  }

  // Chunk large audio files for API processing
  async chunkAudio(audioBlob: Blob, chunkSizeMinutes = 5): Promise<Blob[]> {
    const chunkSizeBytes = chunkSizeMinutes * 60 * 16000 * 2; // Approximate for 16kHz mono
    
    if (audioBlob.size <= chunkSizeBytes) {
      return [audioBlob];
    }

    const chunks: Blob[] = [];
    let offset = 0;

    while (offset < audioBlob.size) {
      const chunk = audioBlob.slice(offset, offset + chunkSizeBytes);
      chunks.push(chunk);
      offset += chunkSizeBytes;
    }

    return chunks;
  }
}
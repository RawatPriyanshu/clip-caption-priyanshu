import { pipeline } from '@huggingface/transformers';

export interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language?: string;
}

export interface TranscriptionProgress {
  stage: 'loading' | 'transcribing' | 'processing' | 'complete';
  progress: number;
  message: string;
}

export class TranscriptionService {
  private transcriber: any = null;
  private onProgress?: (progress: TranscriptionProgress) => void;

  constructor(onProgress?: (progress: TranscriptionProgress) => void) {
    this.onProgress = onProgress;
  }

  private updateProgress(stage: TranscriptionProgress['stage'], progress: number, message: string) {
    this.onProgress?.({ stage, progress, message });
  }

  async initializeTranscriber(language: string = 'en') {
    if (this.transcriber) return this.transcriber;

    this.updateProgress('loading', 0, 'Loading Whisper model...');

    try {
      // Use different models based on language preference
      const modelName = language === 'multilingual' 
        ? 'onnx-community/whisper-tiny' 
        : 'onnx-community/whisper-tiny.en';

      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        modelName,
        {
          device: 'webgpu', // Fallback to CPU if WebGPU not available
          progress_callback: (progress: any) => {
            if (progress.status === 'progress') {
              this.updateProgress('loading', progress.progress * 100, 'Loading model...');
            }
          }
        }
      ) as any;

      this.updateProgress('loading', 100, 'Model loaded successfully');
      return this.transcriber;
    } catch (error) {
      console.error('Error loading transcriber:', error);
      throw new Error('Failed to load Whisper model. Please check your internet connection.');
    }
  }

  async transcribeAudio(
    audioBlob: Blob, 
    options: {
      language?: string;
      chunkDuration?: number;
      returnSegments?: boolean;
    } = {}
  ): Promise<TranscriptionResult> {
    const { 
      language = 'en', 
      chunkDuration = 30, // seconds
      returnSegments = true 
    } = options;

    this.updateProgress('loading', 0, 'Initializing transcription...');

    try {
      const transcriber = await this.initializeTranscriber(language);
      
      // Convert blob to URL for the transcriber
      const audioUrl = URL.createObjectURL(audioBlob);
      
      this.updateProgress('transcribing', 10, 'Processing audio...');

      // Transcribe the audio
      const result = await transcriber(audioUrl, {
        return_timestamps: returnSegments,
        chunk_length_s: chunkDuration,
        stride_length_s: 5, // Overlap between chunks
        language: language === 'multilingual' ? undefined : language
      });

      // Clean up the URL
      URL.revokeObjectURL(audioUrl);

      this.updateProgress('processing', 80, 'Processing results...');

      // Format the result
      let transcriptionResult: TranscriptionResult;

      if (returnSegments && (result as any).chunks) {
        // Extract segments with timestamps
        const segments: TranscriptionSegment[] = (result as any).chunks.map((chunk: any) => ({
          text: chunk.text.trim(),
          start: chunk.timestamp?.[0] || 0,
          end: chunk.timestamp?.[1] || 0
        }));

        transcriptionResult = {
          text: (result as any).text,
          segments,
          language: language === 'multilingual' ? 'auto' : language
        };
      } else {
        // Simple text result without segments
        const text = Array.isArray(result) ? result[0]?.text || '' : (result as any).text || '';
        transcriptionResult = {
          text,
          segments: [{
            text,
            start: 0,
            end: 0
          }],
          language: language === 'multilingual' ? 'auto' : language
        };
      }

      this.updateProgress('complete', 100, 'Transcription complete');
      return transcriptionResult;

    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async transcribeVideoFile(
    videoFile: File,
    options: {
      language?: string;
      chunkDuration?: number;
      returnSegments?: boolean;
    } = {}
  ): Promise<TranscriptionResult> {
    this.updateProgress('loading', 0, 'Extracting audio from video...');

    try {
      // Extract audio from video using existing VideoToAudioProcessor
      const { VideoToAudioProcessor } = await import('@/utils/videoToAudio');
      const processor = new VideoToAudioProcessor((progress) => {
        this.updateProgress('loading', progress.progress * 0.3, progress.message);
      });

      const { audioBlob } = await processor.extractAudioFromVideo(videoFile);
      
      // Transcribe the extracted audio
      return this.transcribeAudio(audioBlob, options);

    } catch (error) {
      console.error('Video transcription error:', error);
      throw new Error(`Failed to transcribe video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get supported languages
  getSupportedLanguages() {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'zh', name: 'Chinese' },
      { code: 'multilingual', name: 'Auto-detect' }
    ];
  }

  // Clean up resources
  dispose() {
    this.transcriber = null;
  }
}
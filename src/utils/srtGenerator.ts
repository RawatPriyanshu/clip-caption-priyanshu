import { TranscriptionSegment } from '@/services/transcriptionService';

export interface SRTEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

export class SRTGenerator {
  /**
   * Convert seconds to SRT time format (HH:MM:SS,mmm)
   */
  private static secondsToSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds
      .toString()
      .padStart(3, '0')}`;
  }

  /**
   * Generate SRT content from transcription segments
   */
  static generateSRT(segments: TranscriptionSegment[]): string {
    const srtEntries = segments
      .filter(segment => segment.text.trim().length > 0)
      .map((segment, index) => ({
        index: index + 1,
        startTime: this.secondsToSRTTime(segment.start),
        endTime: this.secondsToSRTTime(segment.end || segment.start + 2),
        text: segment.text.trim()
      }));

    return srtEntries
      .map(entry => 
        `${entry.index}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}\n`
      )
      .join('\n');
  }

  /**
   * Generate SRT from plain text with estimated timing
   */
  static generateSRTFromText(
    text: string, 
    duration: number = 0,
    options: {
      wordsPerMinute?: number;
      maxCharsPerLine?: number;
      maxLinesPerSubtitle?: number;
    } = {}
  ): string {
    const {
      wordsPerMinute = 150,
      maxCharsPerLine = 42,
      maxLinesPerSubtitle = 2
    } = options;

    // Split text into sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const segments: TranscriptionSegment[] = [];
    
    let currentTime = 0;
    const secondsPerWord = 60 / wordsPerMinute;

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      const wordCount = words.length;
      
      // Break long sentences into smaller segments
      const maxWordsPerSegment = Math.floor(maxCharsPerLine * maxLinesPerSubtitle / 6); // Rough estimate
      
      for (let i = 0; i < words.length; i += maxWordsPerSegment) {
        const segmentWords = words.slice(i, i + maxWordsPerSegment);
        const segmentText = segmentWords.join(' ');
        const segmentDuration = segmentWords.length * secondsPerWord;
        
        segments.push({
          text: segmentText,
          start: currentTime,
          end: currentTime + segmentDuration
        });
        
        currentTime += segmentDuration + 0.5; // Small pause between segments
      }
    }

    // Adjust timing if total duration is provided
    if (duration > 0 && segments.length > 0) {
      const totalEstimatedDuration = segments[segments.length - 1].end;
      const scaleFactor = duration / totalEstimatedDuration;
      
      segments.forEach(segment => {
        segment.start *= scaleFactor;
        segment.end *= scaleFactor;
      });
    }

    return this.generateSRT(segments);
  }

  /**
   * Download SRT file
   */
  static downloadSRT(content: string, filename: string = 'subtitles.srt') {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.srt') ? filename : `${filename}.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Parse SRT content back to segments
   */
  static parseSRT(srtContent: string): TranscriptionSegment[] {
    const segments: TranscriptionSegment[] = [];
    const blocks = srtContent.trim().split(/\n\s*\n/);

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 3) continue;

      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
      if (!timeMatch) continue;

      const startTime = this.srtTimeToSeconds(timeMatch[1]);
      const endTime = this.srtTimeToSeconds(timeMatch[2]);
      const text = lines.slice(2).join(' ');

      segments.push({
        text: text.trim(),
        start: startTime,
        end: endTime
      });
    }

    return segments;
  }

  /**
   * Convert SRT time format to seconds
   */
  private static srtTimeToSeconds(timeString: string): number {
    const [time, milliseconds] = timeString.split(',');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    
    return hours * 3600 + minutes * 60 + seconds + Number(milliseconds) / 1000;
  }

  /**
   * Validate SRT content
   */
  static validateSRT(srtContent: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const blocks = srtContent.trim().split(/\n\s*\n/);

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i].trim();
      const lines = block.split('\n');

      if (lines.length < 3) {
        errors.push(`Block ${i + 1}: Invalid format - needs at least 3 lines`);
        continue;
      }

      // Check index
      if (!/^\d+$/.test(lines[0])) {
        errors.push(`Block ${i + 1}: Invalid index format`);
      }

      // Check timestamp format
      if (!/^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/.test(lines[1])) {
        errors.push(`Block ${i + 1}: Invalid timestamp format`);
      }

      // Check if text exists
      if (lines.slice(2).join('').trim().length === 0) {
        errors.push(`Block ${i + 1}: Missing subtitle text`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
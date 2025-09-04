import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload as UploadIcon, Play, Copy, Download, CheckCircle, AlertTriangle, FileAudio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useVideos } from '@/hooks/useVideos';
import { useToast } from '@/hooks/use-toast';
import { validateFiles, formatFileSize, getFileSizeLimitsForRole } from '@/utils/fileSizeValidation';
import { VideoToAudioProcessor, ProcessingProgress } from '@/utils/videoToAudio';

interface VideoFile {
  id: string;
  name: string;
  size: number;
  file: File;
  audioBlob?: Blob;
  duration?: number;
  processingStatus: 'pending' | 'uploading' | 'extracting' | 'complete' | 'error';
  uploadedVideoId?: string; // Store the Supabase video ID after upload
}

interface GeneratedMetadata {
  platform: 'youtube' | 'instagram' | 'tiktok';
  title: string;
  description: string;
  hashtags: string[];
  transcription?: string;
}

export default function Upload() {
  const { user } = useAuth();
  const { roleData, canGenerate } = useUserRole();
  const { uploadVideo, generateMetadata: saveMetadata, loading: videosLoading } = useVideos();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [uploadedVideos, setUploadedVideos] = useState<VideoFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  const [generatedMetadata, setGeneratedMetadata] = useState<GeneratedMetadata[]>([]);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Form state
  const [creatorName, setCreatorName] = useState('');
  const [videoTopic, setVideoTopic] = useState('');
  const [language, setLanguage] = useState('en');
  const [keywords, setKeywords] = useState('');

  const handleFiles = useCallback(async (files: File[]) => {
    const validation = validateFiles(files, roleData?.role || 'free');
    
    if (!validation.isValid) {
      toast({
        title: "Upload validation failed",
        description: validation.message,
        variant: "destructive"
      });
      return;
    }

    const videoFiles: VideoFile[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      file,
      processingStatus: 'pending'
    }));

    setUploadedVideos(prev => [...prev, ...videoFiles]);

    // Upload each video to Supabase
    for (const videoFile of videoFiles) {
      try {
        // Update status to uploading
        setUploadedVideos(prev => 
          prev.map(v => v.id === videoFile.id ? { ...v, processingStatus: 'uploading' } : v)
        );

        // Upload to Supabase storage and create database record
        const uploadedVideo = await uploadVideo(videoFile.file, videoFile.name);
        
        // Update with uploaded video ID and mark as complete
        setUploadedVideos(prev => 
          prev.map(v => v.id === videoFile.id ? { 
            ...v, 
            processingStatus: 'complete',
            uploadedVideoId: uploadedVideo.id 
          } : v)
        );

        toast({
          title: "Upload successful",
          description: `${videoFile.name} has been uploaded successfully.`,
        });

      } catch (error) {
        console.error('Upload failed for', videoFile.name, error);
        
        // Update status to error
        setUploadedVideos(prev => 
          prev.map(v => v.id === videoFile.id ? { ...v, processingStatus: 'error' } : v)
        );

        toast({
          title: "Upload failed",
          description: `Failed to upload ${videoFile.name}.`,
          variant: "destructive"
        });
      }
    }
  }, [roleData?.role, uploadVideo, toast]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  }, [handleFiles]);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Extract audio from uploaded videos
  const extractAudioFromVideos = async (videos: VideoFile[]) => {
    const processor = new VideoToAudioProcessor((progress) => {
      setProcessingProgress(progress);
    });

    const audioResults = [];
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      
      // Update processing status
      setUploadedVideos(prev => 
        prev.map(v => v.id === video.id ? { ...v, processingStatus: 'extracting' } : v)
      );

      try {
        const { audioBlob, duration } = await processor.extractAudioFromVideo(video.file);
        
        // Update video with audio data
        setUploadedVideos(prev => 
          prev.map(v => v.id === video.id ? { 
            ...v, 
            audioBlob, 
            duration,
            processingStatus: 'complete'
          } : v)
        );

        audioResults.push({ videoId: video.id, audioBlob, duration });
      } catch (error) {
        console.error('Audio extraction failed for', video.name, error);
        setUploadedVideos(prev => 
          prev.map(v => v.id === video.id ? { ...v, processingStatus: 'error' } : v)
        );
      }
    }

    setProcessingProgress(null);
    return audioResults;
  };

  const generateMetadata = async () => {
    const completedVideos = uploadedVideos.filter(v => v.processingStatus === 'complete' && v.uploadedVideoId);
    
    if (completedVideos.length === 0 || !creatorName.trim() || !videoTopic.trim()) {
      toast({
        title: "Missing information",
        description: "Please upload videos successfully and fill in creator name and video topic.",
        variant: "destructive"
      });
      return;
    }

    if (!canGenerate()) {
      toast({
        title: "Generation limit reached",
        description: "You have reached your monthly generation limit. Please upgrade your plan.",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      // Step 1: Audio extraction (40% of progress)
      setProgress(10);
      await extractAudioFromVideos(completedVideos);
      setProgress(40);

      // Step 2: Generate and save metadata to database (60% of progress)
      setProgress(60);
      
      // Generate metadata for the first uploaded video (in the future, handle multiple videos)
      const firstVideo = completedVideos[0];
      if (firstVideo.uploadedVideoId) {
        await saveMetadata(
          firstVideo.uploadedVideoId,
          creatorName,
          videoTopic,
          language,
          keywords
        );
      }
      
      setProgress(80);

      // Step 3: Create display metadata for UI
      const platforms = ['youtube', 'instagram', 'tiktok'] as const;
      const mockTranscription = `This video covers ${videoTopic} with expert guidance from ${creatorName}. Key topics include practical tips and techniques that viewers can apply immediately.`;
      
      const formattedMetadata: GeneratedMetadata[] = platforms.map(platform => {
        const platformSpecific = {
          youtube: {
            title: `${videoTopic} - Complete Guide | ${creatorName}`,
            description: `In this video, I'll show you everything about ${videoTopic}. Perfect for anyone interested in ${keywords.split(',').map(k => k.trim()).join(', ')}.\n\n${mockTranscription}\n\nDon't forget to like and subscribe!`,
            hashtags: ['tutorial', 'guide', ...keywords.split(',').map(k => k.trim()).filter(k => k)]
          },
          instagram: {
            title: `${videoTopic} tips! 🔥`,
            description: `Quick ${videoTopic} guide! ${mockTranscription.substring(0, 100)}...`,
            hashtags: ['reels', videoTopic.toLowerCase().replace(/\s+/g, ''), ...keywords.split(',').map(k => k.trim()).filter(k => k)]
          },
          tiktok: {
            title: `${videoTopic} hack everyone needs! ✨`,
            description: `${mockTranscription.substring(0, 80)}... #${videoTopic.toLowerCase().replace(/\s+/g, '')}`,
            hashtags: ['fyp', 'viral', videoTopic.toLowerCase().replace(/\s+/g, ''), ...keywords.split(',').map(k => k.trim()).filter(k => k)]
          }
        };

        return {
          platform,
          title: platformSpecific[platform].title,
          description: platformSpecific[platform].description,
          hashtags: platformSpecific[platform].hashtags,
          transcription: mockTranscription
        };
      });

      setGeneratedMetadata(formattedMetadata);
      setProgress(100);
      
      toast({
        title: "Metadata generated and saved!",
        description: "Your video metadata has been saved to the database and is now available in your history.",
      });

    } catch (error) {
      console.error('Error in metadata generation:', error);
      toast({
        title: "Processing failed",
        description: "There was an error processing your videos.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      toast({
        title: "Copied to clipboard",
        description: `${label} copied successfully!`,
      });
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive"
      });
    }
  };

  const downloadAllMetadata = () => {
    const content = generatedMetadata.map(meta => 
      `=== ${meta.platform.toUpperCase()} ===\n` +
      `Title: ${meta.title}\n` +
      `Description: ${meta.description}\n` +
      `Hashtags: ${meta.hashtags.map(tag => `#${tag}`).join(' ')}\n\n`
    ).join('');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metadata-${videoTopic || 'export'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyAllMetadata = async () => {
    const content = generatedMetadata.map(meta => 
      `${meta.platform.toUpperCase()}:\n` +
      `${meta.title}\n${meta.description}\n${meta.hashtags.map(tag => `#${tag}`).join(' ')}`
    ).join('\n\n');
    
    await copyToClipboard(content, 'All metadata');
  };

  const removeVideo = (videoId: string) => {
    setUploadedVideos(prev => prev.filter(v => v.id !== videoId));
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  const fileSizeLimits = getFileSizeLimitsForRole(roleData?.role || 'free');

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Upload & Generate Metadata</h1>
          <p className="text-muted-foreground mt-2">
            Upload your videos and generate platform-specific metadata automatically
          </p>
        </div>

        {/* File Size Limits Info */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>File Size Limits ({roleData?.role || 'free'} plan):</strong>
            <ul className="mt-2 space-y-1">
              <li>• Maximum file size: {formatFileSize(fileSizeLimits.maxFileSize)}</li>
              <li>• Maximum total size: {formatFileSize(fileSizeLimits.maxTotalSize)}</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadIcon className="h-5 w-5" />
              Upload Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <UploadIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Drop your videos here</p>
              <p className="text-muted-foreground mb-4">or</p>
              <Input
                type="file"
                multiple
                accept="video/*"
                onChange={handleInputChange}
                className="max-w-xs mx-auto"
                disabled={videosLoading}
              />
            </div>

            {/* Uploaded Videos List */}
            {uploadedVideos.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="font-medium">Uploaded Videos:</h3>
                {uploadedVideos.map((video) => (
                  <div key={video.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Play className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{video.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(video.size)}
                          {video.duration && ` • ${Math.round(video.duration)}s`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {video.processingStatus === 'pending' && (
                        <span className="text-sm text-muted-foreground">Ready</span>
                      )}
                      {video.processingStatus === 'uploading' && (
                        <span className="text-sm text-blue-600">Uploading...</span>
                      )}
                      {video.processingStatus === 'extracting' && (
                        <div className="flex items-center gap-2">
                          <FileAudio className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-600">Processing...</span>
                        </div>
                      )}
                      {video.processingStatus === 'complete' && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {video.processingStatus === 'error' && (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVideo(video.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Video Information Form */}
        <Card>
          <CardHeader>
            <CardTitle>Video Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="creator-name">Creator Name</Label>
                <Input
                  id="creator-name"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="Enter creator name"
                />
              </div>
              <div>
                <Label htmlFor="video-topic">Video Topic</Label>
                <Input
                  id="video-topic"
                  value={videoTopic}
                  onChange={(e) => setVideoTopic(e.target.value)}
                  placeholder="Enter video topic"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="keywords">Keywords (comma-separated)</Label>
              <Textarea
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Enter keywords separated by commas (e.g., tutorial, tips, guide)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions Section */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={generateMetadata}
              disabled={processing || uploadedVideos.filter(v => v.processingStatus === 'complete').length === 0 || !creatorName.trim() || !videoTopic.trim() || !canGenerate()}
              className="w-full"
              size="lg"
            >
              {processing ? 'Generating...' : 'Generate Metadata'}
            </Button>

            {!canGenerate() && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You have reached your monthly generation limit. Please upgrade your plan to continue.
                </AlertDescription>
              </Alert>
            )}

            {/* Progress Indicators */}
            {processing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
                
                {processingProgress && (
                  <div className="text-sm text-muted-foreground">
                    {processingProgress.stage}: {processingProgress.message}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generated Metadata Display */}
        {generatedMetadata.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Generated Metadata</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyAllMetadata}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadAllMetadata}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {generatedMetadata.map((meta) => (
                <div key={meta.platform} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3 capitalize flex items-center gap-2">
                    {meta.platform}
                    <span className="text-sm bg-primary text-primary-foreground px-2 py-1 rounded">
                      {meta.platform.toUpperCase()}
                    </span>
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <Label className="text-xs font-medium text-muted-foreground">TITLE</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(meta.title, `${meta.platform} title`)}
                          className="h-6 w-6 p-0"
                        >
                          {copySuccess === `${meta.platform} title` ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm p-2 bg-muted rounded">{meta.title}</p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <Label className="text-xs font-medium text-muted-foreground">DESCRIPTION</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(meta.description, `${meta.platform} description`)}
                          className="h-6 w-6 p-0"
                        >
                          {copySuccess === `${meta.platform} description` ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm p-2 bg-muted rounded whitespace-pre-wrap">{meta.description}</p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <Label className="text-xs font-medium text-muted-foreground">HASHTAGS</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(meta.hashtags.map(tag => `#${tag}`).join(' '), `${meta.platform} hashtags`)}
                          className="h-6 w-6 p-0"
                        >
                          {copySuccess === `${meta.platform} hashtags` ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {meta.hashtags.map((tag, index) => (
                          <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
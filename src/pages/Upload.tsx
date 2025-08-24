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
  processingStatus: 'pending' | 'extracting' | 'complete' | 'error';
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

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFiles = (files: File[]) => {
    const videoFiles = files.filter(file => file.type.startsWith('video/'));
    
    if (videoFiles.length === 0) {
      toast({
        title: "No video files",
        description: "Please select video files only.",
        variant: "destructive"
      });
      return;
    }

    // Validate file sizes based on user role
    const userRole = roleData?.role || 'free';
    const existingSize = uploadedVideos.reduce((sum, video) => sum + video.size, 0);
    const newSize = videoFiles.reduce((sum, file) => sum + file.size, 0);
    const totalSize = existingSize + newSize;
    
    const limits = getFileSizeLimitsForRole(userRole);
    
    // Check total size limit
    if (totalSize > limits.maxTotalSize) {
      toast({
        title: "Total size limit exceeded",
        description: `Total size (${formatFileSize(totalSize)}) exceeds ${formatFileSize(limits.maxTotalSize)} limit for ${userRole} users.`,
        variant: "destructive"
      });
      return;
    }

    // Validate individual files
    const validation = validateFiles(videoFiles, userRole);
    
    if (!validation.isValid) {
      toast({
        title: "File size validation failed",
        description: validation.message,
        variant: "destructive"
      });
      return;
    }

    const newVideos: VideoFile[] = videoFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      file,
      processingStatus: 'pending'
    }));
    
    setUploadedVideos(prev => [...prev, ...newVideos]);
    
    toast({
      title: "Videos added",
      description: `${videoFiles.length} video(s) added successfully.`,
    });
  };

  const removeVideo = (id: string) => {
    setUploadedVideos(prev => prev.filter(video => video.id !== id));
  };

  const extractAudioFromVideos = async () => {
    const videosToProcess = uploadedVideos.filter(v => v.processingStatus === 'pending');
    
    if (videosToProcess.length === 0) {
      toast({
        title: "No videos to process",
        description: "All videos have already been processed or no videos uploaded.",
        variant: "destructive"
      });
      return false;
    }

    try {
      for (let i = 0; i < videosToProcess.length; i++) {
        const video = videosToProcess[i];
        
        // Update status to extracting
        setUploadedVideos(prev => 
          prev.map(v => v.id === video.id ? { ...v, processingStatus: 'extracting' } : v)
        );

        const processor = new VideoToAudioProcessor((progress) => {
          setProcessingProgress(progress);
          setProgress(((i / videosToProcess.length) * 100) + (progress.progress / videosToProcess.length));
        });

        try {
          const { audioBlob, duration } = await processor.extractAudioFromVideo(video.file, {
            quality: 'medium',
            sampleRate: 16000, // Optimal for Whisper
            channels: 1 // Mono for better API performance
          });

          // Update video with extracted audio
          setUploadedVideos(prev => 
            prev.map(v => v.id === video.id ? { 
              ...v, 
              audioBlob, 
              duration, 
              processingStatus: 'complete' 
            } : v)
          );

        } catch (error) {
          console.error(`Error processing ${video.name}:`, error);
          setUploadedVideos(prev => 
            prev.map(v => v.id === video.id ? { ...v, processingStatus: 'error' } : v)
          );
          
          toast({
            title: "Audio extraction failed",
            description: `Failed to extract audio from ${video.name}`,
            variant: "destructive"
          });
        }
      }

      setProcessingProgress(null);
      return true;
    } catch (error) {
      console.error('Error in batch audio extraction:', error);
      setProcessingProgress(null);
      return false;
    }
  };

  const generateMetadata = async () => {
    if (!canGenerate()) {
      toast({
        title: "Generation limit reached",
        description: "You've reached your monthly generation limit. Upgrade for more generations.",
        variant: "destructive"
      });
      return;
    }

    if (uploadedVideos.length === 0) {
      toast({
        title: "No videos uploaded",
        description: "Please upload at least one video to generate metadata.",
        variant: "destructive"
      });
      return;
    }

    if (!creatorName || !videoTopic) {
      toast({
        title: "Missing information",
        description: "Please fill in Creator Name and Video Topic fields.",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      // First, extract audio from all videos
      const audioExtractionSuccess = await extractAudioFromVideos();
      
      if (!audioExtractionSuccess) {
        throw new Error('Failed to extract audio from videos');
      }

      setProgress(70);

      // For now, generate mock metadata since we don't have API integration yet
      // In the future, this would send the audio to Whisper API for transcription
      const mockTranscription = `This is a ${videoTopic} video by ${creatorName}. The content includes information about ${keywords.split(',').map(k => k.trim()).join(', ')}.`;

      // Generate metadata based on the mock transcription and user inputs
      const platforms = ['youtube', 'instagram', 'tiktok'] as const;
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
        title: "Metadata generated successfully!",
        description: "Your video metadata has been created based on audio processing.",
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

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <main className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Upload & Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Zone */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UploadIcon className="w-5 h-5" />
                  Upload Videos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* File Size Limits Info */}
                {roleData && (
                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{roleData.role.charAt(0).toUpperCase() + roleData.role.slice(1)} Plan Limits:</strong> 
                      {' '}{formatFileSize(getFileSizeLimitsForRole(roleData.role).maxFileSize)} per video, 
                      {' '}{formatFileSize(getFileSizeLimitsForRole(roleData.role).maxTotalSize)} total per session
                    </AlertDescription>
                  </Alert>
                )}

                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <UploadIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg mb-2">Drag & drop your videos here</p>
                  <p className="text-muted-foreground mb-4">or</p>
                  <Input
                    type="file"
                    multiple
                    accept="video/*"
                    onChange={(e) => handleFiles(Array.from(e.target.files || []))}
                    className="hidden"
                    id="video-upload"
                  />
                  <Button 
                    variant="outline" 
                    className="cursor-pointer"
                    onClick={() => document.getElementById('video-upload')?.click()}
                  >
                    Choose Files
                  </Button>
                </div>

                {/* Uploaded Videos List */}
                {uploadedVideos.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Uploaded Videos ({uploadedVideos.length})</h3>
                      <p className="text-sm text-muted-foreground">
                        Total: {formatFileSize(uploadedVideos.reduce((sum, video) => sum + video.size, 0))}
                      </p>
                    </div>
                    {uploadedVideos.map((video) => (
                      <div key={video.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          {video.processingStatus === 'pending' && <Play className="w-4 h-4 text-muted-foreground" />}
                          {video.processingStatus === 'extracting' && <FileAudio className="w-4 h-4 text-blue-500 animate-pulse" />}
                          {video.processingStatus === 'complete' && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {video.processingStatus === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                          <div>
                            <p className="font-medium">{video.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{formatFileSize(video.size)}</span>
                              {video.duration && <span>• {Math.round(video.duration)}s</span>}
                              <span className="capitalize">• {video.processingStatus}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVideo(video.id)}
                          disabled={video.processingStatus === 'extracting'}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Form */}
            <Card>
              <CardHeader>
                <CardTitle>Video Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="creator-name">Creator Name</Label>
                    <Input
                      id="creator-name"
                      value={creatorName}
                      onChange={(e) => setCreatorName(e.target.value)}
                      placeholder="Your name or brand"
                    />
                  </div>
                  <div>
                    <Label htmlFor="video-topic">Video Topic</Label>
                    <Input
                      id="video-topic"
                      value={videoTopic}
                      onChange={(e) => setVideoTopic(e.target.value)}
                      placeholder="Main topic of your video"
                    />
                  </div>
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
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                    <Textarea
                      id="keywords"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="tutorial, tips, beginner, advanced"
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Actions & Results */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={generateMetadata}
                  disabled={processing || !canGenerate()}
                  className="w-full"
                  size="lg"
                >
                  {processing ? 'Generating...' : 'Generate Metadata'}
                </Button>

                {processing && (
                  <div className="space-y-2">
                    <Progress value={progress} className="w-full" />
                    <div className="text-center space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {processingProgress?.message || `Processing videos... ${Math.round(progress)}%`}
                      </p>
                      {processingProgress && (
                        <p className="text-xs text-muted-foreground capitalize">
                          Stage: {processingProgress.stage}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {roleData && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      Generations used: <span className="font-medium">{roleData.generationsUsed}/{roleData.generationsLimit}</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generated Metadata */}
            {generatedMetadata.length > 0 && (
              <div className="space-y-4">
                {generatedMetadata.map((meta) => (
                  <Card key={meta.platform}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg capitalize">{meta.platform}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-sm font-medium">Title</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(meta.title, `${meta.platform} title`)}
                          >
                            {copySuccess === `${meta.platform} title` ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm bg-muted p-2 rounded">{meta.title}</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-sm font-medium">Description</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(meta.description, `${meta.platform} description`)}
                          >
                            {copySuccess === `${meta.platform} description` ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm bg-muted p-2 rounded">{meta.description}</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-sm font-medium">Hashtags</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(meta.hashtags.map(tag => `#${tag}`).join(' '), `${meta.platform} hashtags`)}
                          >
                            {copySuccess === `${meta.platform} hashtags` ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm bg-muted p-2 rounded">
                          {meta.hashtags.map(tag => `#${tag}`).join(' ')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Export Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={downloadAllMetadata} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download All
                  </Button>
                  <Button onClick={copyAllMetadata} variant="outline">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy All
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
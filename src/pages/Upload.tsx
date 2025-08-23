import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload as UploadIcon, Play, Copy, Download, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { useVideos } from '@/hooks/useVideos';

interface VideoFile {
  id: string;
  name: string;
  size: number;
  file: File;
}

interface GeneratedMetadata {
  platform: 'youtube' | 'instagram' | 'tiktok';
  title: string;
  description: string;
  hashtags: string[];
}

export default function Upload() {
  const { user } = useAuth();
  const { roleData, canGenerate } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { uploadVideo, generateMetadata: generateVideoMetadata } = useVideos();

  const [uploadedVideos, setUploadedVideos] = useState<VideoFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
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
    const newVideos: VideoFile[] = videoFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      file
    }));
    setUploadedVideos(prev => [...prev, ...newVideos]);
  };

  const removeVideo = (id: string) => {
    setUploadedVideos(prev => prev.filter(video => video.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
      // Upload videos and generate metadata for each
      const results = [];
      const totalVideos = uploadedVideos.length;
      
      for (let i = 0; i < uploadedVideos.length; i++) {
        const video = uploadedVideos[i];
        setProgress((i / totalVideos) * 50); // Upload progress

        try {
          // Upload video to Supabase storage and create database record
          const videoRecord = await uploadVideo(video.file, video.name);
          
          // Generate metadata for this video
          const metadata = await generateVideoMetadata(
            videoRecord.id,
            creatorName,
            videoTopic,
            language,
            keywords
          );
          
          results.push(...metadata);
          
        } catch (error) {
          console.error('Error processing video:', error);
          toast({
            title: "Upload failed",
            description: `Failed to process ${video.name}`,
            variant: "destructive"
          });
        }
        
        setProgress(50 + ((i + 1) / totalVideos) * 50); // Processing progress
      }

      // Convert to the expected format for display
      const platforms = ['youtube', 'instagram', 'tiktok'];
      const formattedMetadata: GeneratedMetadata[] = platforms.map(platform => {
        const platformData = results.find(r => r.platform === platform) || {};
        return {
          platform: platform as any,
          title: platformData.title || `${videoTopic} - ${creatorName}`,
          description: platformData.description || `Content about ${videoTopic}`,
          hashtags: platformData.hashtags || keywords.split(',').map(k => k.trim()).filter(k => k)
        };
      });

      setGeneratedMetadata(formattedMetadata);
      setProgress(100);
      
      toast({
        title: "Videos uploaded and metadata generated!",
        description: "Your videos have been processed successfully.",
      });

      // Clear uploaded videos after successful processing
      setTimeout(() => {
        setUploadedVideos([]);
        setProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Error in metadata generation:', error);
      toast({
        title: "Processing failed",
        description: "There was an error processing your videos.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
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
                    <h3 className="font-medium">Uploaded Videos ({uploadedVideos.length})</h3>
                    {uploadedVideos.map((video) => (
                      <div key={video.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Play className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{video.name}</p>
                            <p className="text-sm text-muted-foreground">{formatFileSize(video.size)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVideo(video.id)}
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
                    <p className="text-sm text-muted-foreground text-center">
                      Processing videos... {progress}%
                    </p>
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
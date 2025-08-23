import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Trash2, Copy, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useVideos, VideoRecord, VideoMetadata } from '@/hooks/useVideos';

export default function History() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { videos, loading, deleteVideo, getVideoMetadata } = useVideos();
  const [searchTerm, setSearchTerm] = useState('');
  const [videoMetadata, setVideoMetadata] = useState<Record<string, VideoMetadata[]>>({});

  // Load metadata for videos that have it
  useEffect(() => {
    const loadMetadata = async () => {
      for (const video of videos) {
        if (video.metadata_count > 0 && !videoMetadata[video.id]) {
          try {
            const metadata = await getVideoMetadata(video.id);
            setVideoMetadata(prev => ({
              ...prev,
              [video.id]: metadata
            }));
          } catch (error) {
            console.error(`Error loading metadata for video ${video.id}:`, error);
          }
        }
      }
    };

    if (videos.length > 0) {
      loadMetadata();
    }
  }, [videos, getVideoMetadata, videoMetadata]);

  const filteredVideos = videos.filter(video =>
    video.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: `${label} copied successfully!`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive"
      });
    }
  };

  const downloadMetadata = (video: VideoRecord) => {
    const metadata = videoMetadata[video.id];
    if (!metadata || metadata.length === 0) {
      toast({
        title: "No metadata available",
        description: "This video doesn't have generated metadata yet.",
        variant: "destructive"
      });
      return;
    }

    const content = metadata.map(meta => 
      `=== ${meta.platform.toUpperCase()} ===\n` +
      `Title: ${meta.title || 'N/A'}\n` +
      `Description: ${meta.description || 'N/A'}\n` +
      `Hashtags: ${meta.hashtags ? meta.hashtags.map(tag => `#${tag}`).join(' ') : 'N/A'}\n\n`
    ).join('');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metadata-${video.name.replace(/\.[^/.]+$/, '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <main className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Video History</h1>
            <p className="text-muted-foreground">
              View and manage your previously processed videos and their generated metadata.
            </p>
          </div>

          {/* Search Bar */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search videos by name or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Loading videos...</h3>
                <p className="text-muted-foreground">Please wait while we fetch your video history.</p>
              </CardContent>
            </Card>
          ) : filteredVideos.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Play className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No videos found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'No videos match your search criteria.' : 'Upload and process your first video to see it here.'}
                </p>
                <Button onClick={() => navigate('/')}>
                  Upload Videos
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredVideos.map((video) => {
                const metadata = videoMetadata[video.id] || [];
                const metadataByPlatform = metadata.reduce((acc, meta) => {
                  acc[meta.platform] = meta;
                  return acc;
                }, {} as Record<string, VideoMetadata>);
                
                return (
                  <Card key={video.id}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Video Info */}
                        <div className="flex items-start gap-4">
                          <div>
                            {video.thumbnail_url ? (
                              <img
                                src={video.thumbnail_url}
                                alt={video.name}
                                className="w-24 h-16 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-24 h-16 bg-muted rounded-lg flex items-center justify-center">
                                <Play className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{video.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(video.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(video.file_size / (1024 * 1024)).toFixed(1)} MB
                              {video.processing_status !== 'completed' && (
                                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                  {video.processing_status}
                                </span>
                              )}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadMetadata(video)}
                                disabled={video.metadata_count === 0}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteVideo(video.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Platform Metadata */}
                        {metadata.length > 0 ? (
                          ['youtube', 'instagram', 'tiktok'].map(platform => {
                            const meta = metadataByPlatform[platform];
                            if (!meta) return null;
                            
                            return (
                              <div key={platform} className="space-y-3">
                                <h4 className="font-medium capitalize text-sm text-primary">
                                  {platform}
                                </h4>
                                <div className="space-y-2">
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <Label className="text-xs text-muted-foreground">Title</Label>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(meta.title || '', `${platform} title`)}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                    </div>
                                    <p className="text-xs bg-muted p-2 rounded line-clamp-2">
                                      {meta.title || 'No title generated'}
                                    </p>
                                  </div>
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <Label className="text-xs text-muted-foreground">Description</Label>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(meta.description || '', `${platform} description`)}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                    </div>
                                    <p className="text-xs bg-muted p-2 rounded line-clamp-2">
                                      {meta.description || 'No description generated'}
                                    </p>
                                  </div>
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <Label className="text-xs text-muted-foreground">Hashtags</Label>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(
                                          meta.hashtags ? meta.hashtags.map(tag => `#${tag}`).join(' ') : '', 
                                          `${platform} hashtags`
                                        )}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                    </div>
                                    <p className="text-xs bg-muted p-2 rounded">
                                      {meta.hashtags && meta.hashtags.length > 0 
                                        ? `${meta.hashtags.map(tag => `#${tag}`).slice(0, 3).join(' ')}${meta.hashtags.length > 3 ? '...' : ''}`
                                        : 'No hashtags generated'
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="lg:col-span-3 text-center py-8">
                            <p className="text-muted-foreground">No metadata generated for this video yet.</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2"
                              onClick={() => navigate('/')}
                            >
                              Generate Metadata
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Trash2, Copy, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface VideoHistory {
  id: string;
  name: string;
  date: string;
  thumbnail: string;
  metadata: {
    youtube: { title: string; description: string; hashtags: string[] };
    instagram: { title: string; description: string; hashtags: string[] };
    tiktok: { title: string; description: string; hashtags: string[] };
  };
}

export default function History() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for video history
  const mockHistory: VideoHistory[] = [
    {
      id: '1',
      name: 'Tutorial - React Basics.mp4',
      date: '2024-01-15',
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300&h=200&fit=crop',
      metadata: {
        youtube: {
          title: 'React Basics - Complete Beginner Tutorial',
          description: 'Learn React from scratch in this comprehensive tutorial. Perfect for beginners who want to start their React journey.',
          hashtags: ['react', 'tutorial', 'javascript', 'webdev', 'programming']
        },
        instagram: {
          title: 'React Tutorial for Beginners',
          description: 'Master React basics in minutes! 🚀',
          hashtags: ['react', 'coding', 'webdev', 'tutorial', 'javascript']
        },
        tiktok: {
          title: 'React in 60 seconds',
          description: 'Quick React tutorial for developers',
          hashtags: ['react', 'coding', 'tutorial', 'webdev']
        }
      }
    },
    {
      id: '2',
      name: 'Advanced CSS Techniques.mp4',
      date: '2024-01-12',
      thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop',
      metadata: {
        youtube: {
          title: 'Advanced CSS Techniques Every Developer Should Know',
          description: 'Discover advanced CSS techniques that will take your web development skills to the next level.',
          hashtags: ['css', 'webdev', 'frontend', 'advanced', 'techniques']
        },
        instagram: {
          title: 'CSS Magic Tricks',
          description: 'Advanced CSS tips that will blow your mind! ✨',
          hashtags: ['css', 'webdev', 'frontend', 'tips', 'coding']
        },
        tiktok: {
          title: 'CSS tricks that amaze',
          description: 'Advanced CSS in under a minute',
          hashtags: ['css', 'coding', 'webdev', 'tricks']
        }
      }
    },
    {
      id: '3',
      name: 'JavaScript ES6 Features.mp4',
      date: '2024-01-10',
      thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=300&h=200&fit=crop',
      metadata: {
        youtube: {
          title: 'JavaScript ES6 Features Explained - Modern JavaScript',
          description: 'Complete guide to ES6 features including arrow functions, destructuring, promises, and more.',
          hashtags: ['javascript', 'es6', 'modernjs', 'tutorial', 'webdev']
        },
        instagram: {
          title: 'ES6 Features You Need to Know',
          description: 'Modern JavaScript essentials! 💻',
          hashtags: ['javascript', 'es6', 'coding', 'webdev', 'modernjs']
        },
        tiktok: {
          title: 'ES6 in 60 seconds',
          description: 'Modern JavaScript explained quickly',
          hashtags: ['javascript', 'es6', 'coding', 'webdev']
        }
      }
    }
  ];

  const filteredHistory = mockHistory.filter(video =>
    video.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.metadata.youtube.title.toLowerCase().includes(searchTerm.toLowerCase())
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

  const downloadMetadata = (video: VideoHistory) => {
    const content = Object.entries(video.metadata).map(([platform, meta]) => 
      `=== ${platform.toUpperCase()} ===\n` +
      `Title: ${meta.title}\n` +
      `Description: ${meta.description}\n` +
      `Hashtags: ${meta.hashtags.map(tag => `#${tag}`).join(' ')}\n\n`
    ).join('');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metadata-${video.name.replace('.mp4', '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteVideo = (videoId: string) => {
    toast({
      title: "Video deleted",
      description: "Video and its metadata have been removed from history.",
    });
    // In real app, this would delete from database
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

          {/* Videos Grid */}
          {filteredHistory.length === 0 ? (
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
              {filteredHistory.map((video) => (
                <Card key={video.id}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      {/* Video Info */}
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <img
                            src={video.thumbnail}
                            alt={video.name}
                            className="w-24 h-16 object-cover rounded-lg"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-6 h-6 text-white opacity-80" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{video.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(video.date).toLocaleDateString()}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadMetadata(video)}
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
                      {Object.entries(video.metadata).map(([platform, meta]) => (
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
                                  onClick={() => copyToClipboard(meta.title, `${platform} title`)}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              <p className="text-xs bg-muted p-2 rounded line-clamp-2">
                                {meta.title}
                              </p>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <Label className="text-xs text-muted-foreground">Description</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(meta.description, `${platform} description`)}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              <p className="text-xs bg-muted p-2 rounded line-clamp-2">
                                {meta.description}
                              </p>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <Label className="text-xs text-muted-foreground">Hashtags</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(meta.hashtags.map(tag => `#${tag}`).join(' '), `${platform} hashtags`)}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              <p className="text-xs bg-muted p-2 rounded">
                                {meta.hashtags.map(tag => `#${tag}`).slice(0, 3).join(' ')}
                                {meta.hashtags.length > 3 && '...'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
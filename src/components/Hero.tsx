import { Button } from "@/components/ui/button";
import { Play, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-image.jpg";

const Hero = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-subtle pt-16">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-accent/50 text-accent-foreground px-4 py-2 rounded-full mb-8 animate-float">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI-Powered Captioning Technology</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Transform Your Videos with
            <span className="bg-gradient-hero bg-clip-text text-transparent"> Intelligent Captions</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Make your content accessible to everyone. ClipCaption uses advanced AI to generate accurate, 
            perfectly-timed captions for your videos in seconds.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {user ? (
              <>
                <Button 
                  variant="hero" 
                  size="lg" 
                  className="text-lg px-8 py-4"
                  onClick={() => navigate('/dashboard')}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Go to Dashboard
                </Button>
                <Button 
                  variant="glow" 
                  size="lg" 
                  className="text-lg px-8 py-4"
                  onClick={() => navigate('/dashboard')}
                >
                  Start New Project
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="hero" 
                  size="lg" 
                  className="text-lg px-8 py-4"
                  onClick={() => navigate('/auth')}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Captioning Free
                </Button>
                <Button variant="glow" size="lg" className="text-lg px-8 py-4">
                  Watch Demo
                </Button>
              </>
            )}
          </div>

          {/* Hero Image */}
          <div className="relative max-w-4xl mx-auto">
            <div className="rounded-2xl overflow-hidden shadow-elegant hover:shadow-glow transition-smooth">
              <img 
                src={heroImage} 
                alt="ClipCaption dashboard showing video captioning interface" 
                className="w-full h-auto animate-float"
              />
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -left-4 w-8 h-8 bg-accent rounded-full shadow-glow animate-glow hidden lg:block"></div>
            <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-primary rounded-full shadow-elegant animate-float hidden lg:block"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Hero };
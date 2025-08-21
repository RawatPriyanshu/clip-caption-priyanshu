import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { roleData, isAdmin } = useUserRole();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">CC</span>
          </div>
          <span className="text-xl font-bold text-foreground">ClipCaption</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-smooth">
            Features
          </a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-smooth">
            Pricing
          </a>
          <a href="#about" className="text-muted-foreground hover:text-foreground transition-smooth">
            About
          </a>
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
              >
                Dashboard
              </Button>
              {isAdmin() && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/admin')}
                >
                  Admin
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                {roleData?.role && (
                  <span className="capitalize mr-2 px-2 py-1 bg-accent rounded text-xs">
                    {roleData.role}
                  </span>
                )}
                {user.email?.split('@')[0]}
              </span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
              <Button variant="hero" onClick={() => navigate('/auth')}>
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-background border-t border-border">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-smooth">
              Features
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-smooth">
              Pricing
            </a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-smooth">
              About
            </a>
            <div className="flex flex-col gap-2 pt-4 border-t border-border">
              {user ? (
                <>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/dashboard')}
                  >
                    Dashboard
                  </Button>
                  {isAdmin() && (
                    <Button 
                      variant="ghost" 
                      onClick={() => navigate('/admin')}
                    >
                      Admin
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground px-2">
                    {roleData?.role && (
                      <span className="capitalize mr-2 px-2 py-1 bg-accent rounded text-xs">
                        {roleData.role}
                      </span>
                    )}
                    {user.email?.split('@')[0]}
                  </span>
                  <Button variant="ghost" onClick={signOut}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => navigate('/auth')}>
                    Sign In
                  </Button>
                  <Button variant="hero" onClick={() => navigate('/auth')}>
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export { Header };
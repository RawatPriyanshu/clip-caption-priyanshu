import { Button } from "@/components/ui/button";
import { Menu, X, Upload, Home, Settings, Users, Moon, Sun, Layers } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate, useLocation } from "react-router-dom";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const { user, signOut } = useAuth();
  const { roleData, isAdmin } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedMode);
    if (savedMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navItems = [
    { name: 'Upload', path: '/upload', icon: Upload, show: !!user },
    { name: 'Batch', path: '/batch', icon: Layers, show: !!user },
    { name: 'History', path: '/history', icon: Home, show: !!user },
    { name: 'Settings', path: '/settings', icon: Settings, show: !!user },
    { name: 'Admin', path: '/admin', icon: Users, show: user && isAdmin() && user.email?.endsWith('@gmail.com') },
  ];

  const getUserDisplay = () => {
    if (!user || !roleData) return '';
    const name = user.email?.split('@')[0] || 'User';
    const usage = `${roleData.generationsUsed}/${roleData.generationsLimit}`;
    return `${name}, ${roleData.role} - ${usage}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">CC</span>
          </div>
          <span className="text-xl font-bold text-foreground">ClipCaption</span>
        </div>

        {/* Desktop Navigation */}
        {user && (
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => 
              item.show && (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-smooth ${
                    location.pathname === item.path
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </button>
              )
            )}
          </div>
        )}

        {/* Right Section */}
        <div className="hidden md:flex items-center gap-4">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-md hover:bg-muted/50 transition-smooth"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <>
              {/* User Info Display */}
              <span className="text-sm text-muted-foreground px-3 py-1 bg-muted rounded-md">
                {getUserDisplay()}
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
            {user && navItems.map((item) => 
              item.show && (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-smooth text-left ${
                    location.pathname === item.path
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </button>
              )
            )}
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                onClick={toggleDarkMode}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-smooth"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>

            {user ? (
              <div className="flex flex-col gap-2 pt-2">
                <span className="text-sm text-muted-foreground px-3 py-1 bg-muted rounded-md">
                  {getUserDisplay()}
                </span>
                <Button variant="ghost" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Button variant="ghost" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
                <Button variant="hero" onClick={() => navigate('/auth')}>
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export { Header };
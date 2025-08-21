import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { roleData } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('free');

  // Initialize settings from localStorage and user data
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedMode);
    
    if (user?.email) {
      setDisplayName(user.email.split('@')[0]);
    }
    
    if (roleData?.role) {
      setSelectedPlan(roleData.role);
    }
  }, [user, roleData]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    toast({
      title: "Theme updated",
      description: `Switched to ${newMode ? 'dark' : 'light'} mode.`,
    });
  };

  const saveDisplayName = () => {
    setIsEditing(false);
    toast({
      title: "Display name updated",
      description: "Your display name has been saved successfully.",
    });
  };

  const handlePlanChange = (plan: string) => {
    setSelectedPlan(plan);
    toast({
      title: "Plan selection updated",
      description: `Selected ${plan} plan. Changes will be applied after payment processing.`,
    });
  };

  const managePlan = () => {
    if (roleData?.role === 'free') {
      toast({
        title: "Upgrade to Premium",
        description: "Redirecting to upgrade page...",
      });
      // In a real app, redirect to Stripe checkout
    } else {
      toast({
        title: "Manage Subscription",
        description: "Redirecting to billing portal...",
      });
      // In a real app, redirect to Stripe customer portal
    }
  };

  const deleteAccount = async () => {
    try {
      await signOut();
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <main className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account preferences and subscription.
            </p>
          </div>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-name">Display Name</Label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                    />
                    <Button onClick={saveDisplayName} size="sm">
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-2 bg-muted rounded-md">{displayName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="px-3 py-2 bg-muted rounded-md text-muted-foreground">
                  {user.email}
                </div>
                <p className="text-xs text-muted-foreground">
                  Email address cannot be changed for security reasons.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Plan</Label>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{roleData?.role || 'Free'} Plan</p>
                    <p className="text-sm text-muted-foreground">
                      {roleData?.generationsUsed || 0}/{roleData?.generationsLimit || 3} generations used this month
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {roleData?.role === 'free' && (
                      <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">
                        Current
                      </span>
                    )}
                    {roleData?.role === 'premium' && (
                      <span className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded">
                        Premium
                      </span>
                    )}
                    {roleData?.role === 'admin' && (
                      <span className="px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan-select">Change Plan</Label>
                <Select value={selectedPlan} onValueChange={handlePlanChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free - 3 generations/month</SelectItem>
                    <SelectItem value="premium">Premium - 150 generations/month ($10/month)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={managePlan} className="w-full">
                {roleData?.role === 'free' ? 'Upgrade Plan' : 'Manage Subscription'}
              </Button>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark themes
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  <Switch
                    checked={darkMode}
                    onCheckedChange={toggleDarkMode}
                  />
                  <Moon className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Delete Account</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          account and remove all your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={deleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
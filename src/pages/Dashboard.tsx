import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { UserRoleCard } from '@/components/UserRoleCard';
import { AdminPanel } from '@/components/AdminPanel';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 pt-24">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your video captioning projects and account
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <UserRoleCard />
            
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Quick Actions</h2>
              <div className="space-y-2">
                <button className="w-full p-4 text-left border rounded-lg hover:bg-muted/50 transition-colors">
                  <h3 className="font-medium">Upload Video</h3>
                  <p className="text-sm text-muted-foreground">Start a new captioning project</p>
                </button>
                <button className="w-full p-4 text-left border rounded-lg hover:bg-muted/50 transition-colors">
                  <h3 className="font-medium">View Projects</h3>
                  <p className="text-sm text-muted-foreground">See your completed projects</p>
                </button>
              </div>
            </div>
          </div>

          {isAdmin() && (
            <div className="mt-8">
              <AdminPanel />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { AdminPanel } from '@/components/AdminPanel';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BarChart3, DollarSign, Shield, TrendingUp } from 'lucide-react';

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading, roleData } = useUserRole();
  const navigate = useNavigate();

  // Mock analytics data
  const [analytics] = useState({
    totalUsers: 1247,
    premiumUsers: 89,
    videosProcessed: 3456,
    monthlyRevenue: 890
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!roleLoading && (!isAdmin() || !user.email?.endsWith('@gmail.com'))) {
      navigate('/');
    }
  }, [user, authLoading, isAdmin, roleLoading, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin()) return null;

  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 pt-24">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
              <Shield className="h-8 w-8" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor system performance and manage users
            </p>
          </div>

          {/* Analytics Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline w-3 h-3 mr-1" />
                  +12% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Premium Users</CardTitle>
                <Users className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">{analytics.premiumUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((analytics.premiumUsers / analytics.totalUsers) * 100)}% conversion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Videos Processed</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.videosProcessed.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">${analytics.monthlyRevenue}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline w-3 h-3 mr-1" />
                  +8% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <AdminPanel />
        </div>
      </div>
    </main>
  );
}
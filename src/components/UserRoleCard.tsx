import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Crown, Zap, Shield } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

const roleIcons = {
  free: Zap,
  premium: Crown,
  admin: Shield
};

const roleColors = {
  free: 'bg-muted',
  premium: 'bg-gradient-to-r from-purple-500 to-pink-500',
  admin: 'bg-gradient-to-r from-red-500 to-orange-500'
};

const roleLabels = {
  free: 'Free User',
  premium: 'Premium User',
  admin: 'Administrator'
};

export function UserRoleCard() {
  const { roleData, loading } = useUserRole();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="w-6 h-6 bg-muted animate-pulse rounded"></div>
          <div className="w-24 h-4 bg-muted animate-pulse rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="w-full h-2 bg-muted animate-pulse rounded"></div>
            <div className="w-32 h-4 bg-muted animate-pulse rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!roleData) return null;

  const Icon = roleIcons[roleData.role];
  const usagePercentage = roleData.role === 'admin' 
    ? 0 
    : (roleData.generationsUsed / roleData.generationsLimit) * 100;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-lg ${roleColors[roleData.role]}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">{roleLabels[roleData.role]}</CardTitle>
            <CardDescription>Your current plan</CardDescription>
          </div>
        </div>
        <Badge variant={roleData.role === 'admin' ? 'destructive' : roleData.role === 'premium' ? 'default' : 'secondary'}>
          {roleData.role.toUpperCase()}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Generations this month</span>
            <span>
              {roleData.generationsUsed} / {roleData.role === 'admin' ? '∞' : roleData.generationsLimit}
            </span>
          </div>
          {roleData.role !== 'admin' && (
            <Progress 
              value={usagePercentage} 
              className="h-2"
            />
          )}
          {roleData.role !== 'admin' && usagePercentage >= 80 && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {usagePercentage >= 100 ? 'Limit reached' : 'Approaching limit'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'free' | 'premium' | 'admin';

interface RoleData {
  role: UserRole;
  generationsUsed: number;
  generationsLimit: number;
}

export function useUserRole() {
  const { user } = useAuth();
  const [roleData, setRoleData] = useState<RoleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoleData(null);
      setLoading(false);
      return;
    }

    fetchRoleData();
  }, [user]);

  const fetchRoleData = async () => {
    if (!user) return;

    try {
      // Get user role using the database function
      const { data: roleResult, error: roleError } = await supabase
        .rpc('get_user_role', { _user_id: user.id });

      if (roleError) throw roleError;

      // Get generation count using the database function
      const { data: countResult, error: countError } = await supabase
        .rpc('get_monthly_generation_count', { _user_id: user.id });

      if (countError) throw countError;

      const role = roleResult || 'free';
      const generationsUsed = countResult || 0;

      // Set generation limits based on role
      const limits = {
        free: 3,
        premium: 150,
        admin: Infinity
      };

      setRoleData({
        role,
        generationsUsed,
        generationsLimit: limits[role]
      });
    } catch (error) {
      console.error('Error fetching role data:', error);
      // Set default values on error
      setRoleData({
        role: 'free',
        generationsUsed: 0,
        generationsLimit: 3
      });
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return roleData?.role === role;
  };

  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  const canGenerate = (): boolean => {
    if (!roleData) return false;
    if (roleData.role === 'admin') return true;
    return roleData.generationsUsed < roleData.generationsLimit;
  };

  const getRemainingGenerations = (): number => {
    if (!roleData) return 0;
    if (roleData.role === 'admin') return Infinity;
    return Math.max(0, roleData.generationsLimit - roleData.generationsUsed);
  };

  return {
    roleData,
    loading,
    hasRole,
    isAdmin,
    canGenerate,
    getRemainingGenerations,
    refreshRoleData: fetchRoleData
  };
}
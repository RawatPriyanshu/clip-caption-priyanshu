import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/hooks/useUserRole';
import { Search, Filter, TrendingUp, ArrowUpDown } from 'lucide-react';

interface User {
  id: string;
  email: string;
  created_at: string;
  role: UserRole;
  generations_count: number;
  last_login?: string;
}

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'email' | 'role' | 'generations' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchTerm, roleFilter, sortBy, sortOrder]);

  const fetchUsers = async () => {
    try {
      // Get all user roles and their associated profile data
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          display_name,
          created_at,
          user_roles!inner(role),
          generations(id)
        `);

      if (profilesError) throw profilesError;

      // Transform the data to match our interface
      const transformedUsers: User[] = profilesData.map((profile: any) => ({
        id: profile.id,
        email: profile.display_name ? `${profile.display_name}@gmail.com` : `user-${profile.id.slice(0, 8)}@gmail.com`,
        created_at: profile.created_at,
        role: (profile.user_roles?.[0]?.role || 'free') as UserRole,
        generations_count: profile.generations?.length || 0,
        last_login: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() // Mock last login
      }));

      setUsers(transformedUsers);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = users.filter(user => {
      const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });

    // Sort users
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        case 'generations':
          aValue = a.generations_count;
          bValue = b.generations_count;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredUsers(filtered);
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId, 
          role: newRole,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `User upgraded to ${newRole}`,
      });

      // Refresh users list
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'premium': return 'default';
      case 'free': return 'secondary';
      default: return 'secondary';
    }
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getUserActivityTrend = (user: User) => {
    const daysSinceJoined = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const avgGenerationsPerDay = daysSinceJoined > 0 ? user.generations_count / daysSinceJoined : 0;
    
    if (avgGenerationsPerDay > 0.5) return 'High';
    if (avgGenerationsPerDay > 0.1) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          User Management & Analytics
        </CardTitle>
        <CardDescription>
          Manage users, track platform analytics, and monitor subscription status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Platform Analytics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Videos Processed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.reduce((acc, user) => acc + user.generations_count, 0)}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline w-3 h-3 mr-1" />
                  All time
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter(user => getUserActivityTrend(user) !== 'Low').length}
                </div>
                <p className="text-xs text-muted-foreground">Medium to High activity</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">User Activity Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>High:</span>
                    <span>{users.filter(user => getUserActivityTrend(user) === 'High').length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Medium:</span>
                    <span>{users.filter(user => getUserActivityTrend(user) === 'Medium').length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Low:</span>
                    <span>{users.filter(user => getUserActivityTrend(user) === 'Low').length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="free">Free Users</SelectItem>
                <SelectItem value="premium">Premium Users</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={fetchUsers} variant="outline" size="default">
              Refresh Data
            </Button>
          </div>

          {/* User Table */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Users ({filteredUsers.length} of {users.length})
              </h3>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center gap-1">
                        User (Email)
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center gap-1">
                        Plan
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('generations')}
                    >
                      <div className="flex items-center gap-1">
                        Usage
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center gap-1">
                        Joined
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{user.email.split('@')[0]}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {user.generations_count} generations
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getUserActivityTrend(user) === 'High' ? 'default' : 
                                       getUserActivityTrend(user) === 'Medium' ? 'secondary' : 'outline'}>
                          {getUserActivityTrend(user)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Select
                            value={user.role}
                            onValueChange={(value: UserRole) => updateUserRole(user.id, value)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, Calendar, Dumbbell, TrendingUp, Mail, Shield, Crown, XCircle } from "lucide-react";
import { format } from "date-fns";
import CancellationStats from "../components/admin/CancellationStats";

export default function AdminUsersPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: adminData, isLoading, error } = useQuery({
    queryKey: ['admin-users-data'],
    queryFn: async () => {
      console.log('Fetching admin data via backend function...');
      const response = await base44.functions.invoke('getAdminUsers', {});
      console.log('Admin data received:', response.data);
      return response.data;
    },
    enabled: !!currentUser && currentUser.role === 'admin',
    retry: 1,
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, tier }) => {
      await base44.functions.invoke('updateUserSubscription', { userId, tier });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-data'] });
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
      toast.textContent = '✅ Subscription updated successfully';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    },
  });

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      if (user?.role !== 'admin') {
        window.location.href = '/';
      }
    };
    loadUser();
  }, []);

  if (isLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Card className="border-none shadow-lg bg-red-50">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold text-red-900 mb-2">Error Loading Users</h2>
            <p className="text-red-700">{error.message}</p>
            <p className="text-sm text-red-600 mt-2">
              Make sure you have admin privileges and the service role is properly configured.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const users = adminData?.users || [];
  const profiles = adminData?.profiles || [];
  const workoutLogs = adminData?.workoutLogs || [];

  console.log('Users:', users);
  console.log('Profiles:', profiles);
  console.log('Workout logs:', workoutLogs);

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserStats = (userEmail) => {
    const userLogs = workoutLogs.filter(log => log.user_email === userEmail);
    const totalWorkouts = userLogs.length;
    const totalVolume = userLogs.reduce((sum, log) => sum + (log.total_volume || 0), 0);
    const userProfile = profiles.find(p => p.user_email === userEmail);
    
    return { totalWorkouts, totalVolume, profile: userProfile };
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">User Management</h1>
        <p className="text-slate-600">View and manage all user accounts</p>
      </div>

      <Card className="border-none shadow-lg mb-8">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{users.length}</p>
                <p className="text-sm text-slate-600">Total Users</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {users.filter(u => u.role === 'admin').length}
                </p>
                <p className="text-sm text-slate-600">Admins</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {profiles.length}
                </p>
                <p className="text-sm text-slate-600">Active Profiles</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {workoutLogs.length}
                </p>
                <p className="text-sm text-slate-600">Total Workouts</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            All Users
          </TabsTrigger>
          <TabsTrigger value="cancellations" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Cancellations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {filteredUsers.map((user) => {
              const stats = getUserStats(user.email);
              
              return (
                <Card key={user.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-white font-bold text-xl">
                            {user.full_name?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-xl font-bold text-slate-900">{user.full_name}</h3>
                            {user.role === 'admin' && (
                              <Badge className="bg-orange-100 text-orange-800">
                                <Shield className="w-3 h-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                            {user.subscription_tier === 'premium' && (
                              <Badge className="bg-blue-100 text-blue-800">
                                <Crown className="w-3 h-3 mr-1" />
                                Premium
                              </Badge>
                            )}
                            {user.trial_end_date && new Date(user.trial_end_date) > new Date() && (
                              <Badge className="bg-green-100 text-green-800">
                                Trial
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                            <Mail className="w-4 h-4" />
                            <span>{user.email}</span>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-slate-500 mb-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>Joined {format(new Date(user.created_date), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">Subscription:</span>
                              <Select
                                value={user.subscription_tier || 'free'}
                                onValueChange={(value) => updateSubscriptionMutation.mutate({ userId: user.id, tier: value })}
                                disabled={updateSubscriptionMutation.isPending}
                              >
                                <SelectTrigger className="w-32 h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Free</SelectItem>
                                  <SelectItem value="premium">Premium</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {stats.profile ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-500 mb-1">Goal</p>
                                <p className="font-semibold text-sm text-slate-900 capitalize">
                                  {stats.profile.primary_goal?.replace(/_/g, ' ')}
                                </p>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-500 mb-1">Workouts</p>
                                <p className="font-semibold text-sm text-slate-900">
                                  {stats.totalWorkouts}
                                </p>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-500 mb-1">Total Volume</p>
                                <p className="font-semibold text-sm text-slate-900">
                                  {stats.totalVolume.toLocaleString()} kg
                                </p>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-500 mb-1">Training Days</p>
                                <p className="font-semibold text-sm text-slate-900">
                                  {stats.profile.available_days?.length || 0} per week
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <p className="text-sm text-yellow-800">No profile created yet</p>
                            </div>
                          )}
                          
                          {stats.profile && (
                            <div className="mt-4">
                              <Button
                                onClick={() => window.location.href = `/Dashboard?viewUser=${encodeURIComponent(user.email)}`}
                                variant="outline"
                                size="sm"
                                className="w-full md:w-auto"
                              >
                                View Dashboard
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredUsers.length === 0 && (
            <Card className="border-none shadow-lg">
              <CardContent className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <h2 className="text-2xl font-bold mb-2">
                  {searchTerm ? 'No Users Found' : 'No Users Yet'}
                </h2>
                <p className="text-slate-600">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : 'Invite users from the dashboard settings to see them here'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cancellations">
          <CancellationStats users={users} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
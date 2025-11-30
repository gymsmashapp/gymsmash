import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Flame, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LeaderboardPage() {
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: allStats = [], isLoading } = useQuery({
    queryKey: ['leaderboard-stats'],
    queryFn: () => base44.entities.UserStats.list('-points', 50),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const allUsers = await base44.asServiceRole.entities.User.list('full_name', 500);
      return allUsers;
    },
  });

  const enrichedStats = React.useMemo(() => {
    return allStats.map(stat => {
      const userData = users.find(u => u.email === stat.user_email);
      return {
        ...stat,
        full_name: userData?.full_name || 'Anonymous User'
      };
    });
  }, [allStats, users]);

  const topByVolume = React.useMemo(() => {
    return [...enrichedStats].sort((a, b) => b.total_volume - a.total_volume).slice(0, 10);
  }, [enrichedStats]);

  const topByStreak = React.useMemo(() => {
    return [...enrichedStats].sort((a, b) => b.current_streak - a.current_streak).slice(0, 10);
  }, [enrichedStats]);

  const topByWorkouts = React.useMemo(() => {
    return [...enrichedStats].sort((a, b) => b.total_workouts - a.total_workouts).slice(0, 10);
  }, [enrichedStats]);

  const userRank = React.useMemo(() => {
    if (!user?.email) return null;
    const rank = enrichedStats.findIndex(stat => stat.user_email === user.email);
    return rank >= 0 ? rank + 1 : null;
  }, [enrichedStats, user]);

  const userStats = React.useMemo(() => {
    if (!user?.email) return null;
    return enrichedStats.find(stat => stat.user_email === user.email);
  }, [enrichedStats, user]);

  const LeaderboardCard = ({ stats, type, icon: Icon, label, getValue }) => (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-blue-600" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-8">
            No data yet. Complete workouts to appear on the leaderboard!
          </p>
        ) : (
          <div className="space-y-2">
            {stats.map((stat, index) => {
              const isCurrentUser = stat.user_email === user?.email;
              return (
                <div
                  key={stat.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isCurrentUser
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300'
                      : 'bg-slate-50 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-amber-600' : 'bg-slate-300'
                    }`}>
                      <span className="text-white font-bold text-sm">#{index + 1}</span>
                    </div>
                    <div>
                      <p className={`font-semibold ${isCurrentUser ? 'text-blue-900' : 'text-slate-900'}`}>
                        {stat.full_name}
                        {isCurrentUser && (
                          <Badge className="ml-2 bg-blue-600 text-white text-xs">You</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">{getValue(stat)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Leaderboard</h1>
        <p className="text-slate-600">See how you stack up against the community</p>
      </div>

      {userStats && userRank && (
        <Card className="mb-6 border-none shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Your Rank</p>
                <p className="text-4xl font-bold text-blue-900">#{userRank}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Points</p>
                  <p className="text-2xl font-bold text-slate-900">{userStats.points}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Workouts</p>
                  <p className="text-2xl font-bold text-slate-900">{userStats.total_workouts}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Streak</p>
                  <p className="text-2xl font-bold text-slate-900">{userStats.current_streak}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="points" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="points">Points</TabsTrigger>
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="streak">Streak</TabsTrigger>
          <TabsTrigger value="workouts">Workouts</TabsTrigger>
        </TabsList>

        <TabsContent value="points" className="mt-6">
          <LeaderboardCard
            stats={enrichedStats.slice(0, 10)}
            type="points"
            icon={Trophy}
            label="Top by Points"
            getValue={(stat) => `${stat.points} pts`}
          />
        </TabsContent>

        <TabsContent value="volume" className="mt-6">
          <LeaderboardCard
            stats={topByVolume}
            type="volume"
            icon={TrendingUp}
            label="Top by Total Volume"
            getValue={(stat) => `${stat.total_volume.toLocaleString()}kg`}
          />
        </TabsContent>

        <TabsContent value="streak" className="mt-6">
          <LeaderboardCard
            stats={topByStreak}
            type="streak"
            icon={Flame}
            label="Top by Current Streak"
            getValue={(stat) => `${stat.current_streak} weeks`}
          />
        </TabsContent>

        <TabsContent value="workouts" className="mt-6">
          <LeaderboardCard
            stats={topByWorkouts}
            type="workouts"
            icon={Target}
            label="Top by Total Workouts"
            getValue={(stat) => `${stat.total_workouts} workouts`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
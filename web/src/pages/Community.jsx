import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, Flame, Target, Users, Calendar, CheckCircle2 } from "lucide-react";
import { format, parseISO, isAfter, isBefore } from "date-fns";

export default function CommunityPage() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Leaderboard data
  const { data: allStats = [], isLoading: statsLoading } = useQuery({
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

  // Challenges data
  const { data: challenges = [], isLoading: challengesLoading } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => base44.entities.Challenge.filter({ is_active: true }, '-start_date'),
  });

  const { data: myParticipations = [] } = useQuery({
    queryKey: ['my-participations', user?.email],
    queryFn: () => base44.entities.ChallengeParticipant.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: allParticipants = [] } = useQuery({
    queryKey: ['all-participants'],
    queryFn: () => base44.entities.ChallengeParticipant.list('', 500),
  });

  const { data: workoutLogs = [] } = useQuery({
    queryKey: ['workout-logs-challenges', user?.email],
    queryFn: () => base44.entities.WorkoutLog.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const joinChallengeMutation = useMutation({
    mutationFn: (challengeId) => base44.entities.ChallengeParticipant.create({
      challenge_id: challengeId,
      user_email: user.email,
      progress: 0,
      completed: false
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-participations'] });
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.textContent = '🎯 Challenge joined!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    },
  });

  // Leaderboard helpers
  const enrichedStats = React.useMemo(() => {
    return allStats.map(stat => {
      const userData = users.find(u => u.email === stat.user_email);
      return { ...stat, full_name: userData?.full_name || 'Anonymous User' };
    });
  }, [allStats, users]);

  const topByVolume = React.useMemo(() => 
    [...enrichedStats].sort((a, b) => b.total_volume - a.total_volume).slice(0, 10), [enrichedStats]);
  const topByStreak = React.useMemo(() => 
    [...enrichedStats].sort((a, b) => b.current_streak - a.current_streak).slice(0, 10), [enrichedStats]);
  const topByWorkouts = React.useMemo(() => 
    [...enrichedStats].sort((a, b) => b.total_workouts - a.total_workouts).slice(0, 10), [enrichedStats]);

  const userRank = React.useMemo(() => {
    if (!user?.email) return null;
    const rank = enrichedStats.findIndex(stat => stat.user_email === user.email);
    return rank >= 0 ? rank + 1 : null;
  }, [enrichedStats, user]);

  const userStats = React.useMemo(() => {
    if (!user?.email) return null;
    return enrichedStats.find(stat => stat.user_email === user.email);
  }, [enrichedStats, user]);

  // Challenge helpers
  const calculateProgress = (challenge) => {
    const participation = myParticipations.find(p => p.challenge_id === challenge.id);
    if (!participation) return 0;

    const challengeLogs = workoutLogs.filter(log => {
      const logDate = parseISO(log.date);
      return isAfter(logDate, parseISO(challenge.start_date)) && 
             isBefore(logDate, parseISO(challenge.end_date));
    });

    let progress = 0;
    switch (challenge.challenge_type) {
      case 'workout_count':
        progress = challengeLogs.length;
        break;
      case 'total_volume':
        progress = challengeLogs.reduce((sum, log) => sum + (log.total_volume || 0), 0);
        break;
      case 'specific_exercise':
        progress = challengeLogs.reduce((count, log) => {
          const hasExercise = log.exercises_completed?.some(ex => ex.exercise_name === challenge.exercise_name);
          return count + (hasExercise ? 1 : 0);
        }, 0);
        break;
    }
    return progress;
  };

  const getChallengeParticipantCount = (challengeId) => 
    allParticipants.filter(p => p.challenge_id === challengeId).length;

  const activeChallenges = challenges.filter(c => {
    const now = new Date();
    return isAfter(now, parseISO(c.start_date)) && isBefore(now, parseISO(c.end_date));
  });

  const upcomingChallenges = challenges.filter(c => isAfter(parseISO(c.start_date), new Date()));

  const LeaderboardCard = ({ stats, icon: Icon, label, getValue }) => (
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
                <div key={stat.id} className={`flex items-center justify-between p-3 rounded-lg ${
                  isCurrentUser ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300' : 'bg-slate-50 border border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-amber-600' : 'bg-slate-300'
                    }`}>
                      <span className="text-white font-bold text-sm">#{index + 1}</span>
                    </div>
                    <div>
                      <p className={`font-semibold ${isCurrentUser ? 'text-blue-900' : 'text-slate-900'}`}>
                        {stat.full_name}
                        {isCurrentUser && <Badge className="ml-2 bg-blue-600 text-white text-xs">You</Badge>}
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{getValue(stat)}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (statsLoading || challengesLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Community</h1>
        <p className="text-slate-600">Compete, challenge, and grow with the Gym Smash community</p>
      </div>

      <Tabs defaultValue="leaderboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="challenges" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Challenges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard">
          {userStats && userRank && (
            <Card className="mb-6 border-none shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
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
            <TabsList className="grid w-full grid-cols-4 max-w-2xl mb-6">
              <TabsTrigger value="points">Points</TabsTrigger>
              <TabsTrigger value="volume">Volume</TabsTrigger>
              <TabsTrigger value="streak">Streak</TabsTrigger>
              <TabsTrigger value="workouts">Workouts</TabsTrigger>
            </TabsList>

            <TabsContent value="points">
              <LeaderboardCard stats={enrichedStats.slice(0, 10)} icon={Trophy} label="Top by Points" getValue={(s) => `${s.points} pts`} />
            </TabsContent>
            <TabsContent value="volume">
              <LeaderboardCard stats={topByVolume} icon={TrendingUp} label="Top by Total Volume" getValue={(s) => `${s.total_volume.toLocaleString()}kg`} />
            </TabsContent>
            <TabsContent value="streak">
              <LeaderboardCard stats={topByStreak} icon={Flame} label="Top by Current Streak" getValue={(s) => `${s.current_streak} weeks`} />
            </TabsContent>
            <TabsContent value="workouts">
              <LeaderboardCard stats={topByWorkouts} icon={Target} label="Top by Total Workouts" getValue={(s) => `${s.total_workouts} workouts`} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="challenges">
          {activeChallenges.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-600" />
                Active Challenges
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {activeChallenges.map((challenge) => {
                  const isParticipating = myParticipations.some(p => p.challenge_id === challenge.id);
                  const progress = calculateProgress(challenge);
                  const progressPercent = Math.min((progress / challenge.target_value) * 100, 100);
                  const participantCount = getChallengeParticipantCount(challenge.id);

                  return (
                    <Card key={challenge.id} className="border-none shadow-lg">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-2">{challenge.title}</CardTitle>
                            <p className="text-sm text-slate-600">{challenge.description}</p>
                          </div>
                          <Badge className="bg-blue-600 text-white">
                            <Trophy className="w-3 h-3 mr-1" />
                            {challenge.reward_points} pts
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>Ends {format(parseISO(challenge.end_date), 'MMM d')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span>{participantCount} participants</span>
                            </div>
                          </div>

                          {isParticipating ? (
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-600">Progress</span>
                                <span className="font-semibold text-slate-900">{progress} / {challenge.target_value}</span>
                              </div>
                              <Progress value={progressPercent} className="h-3" />
                              {progressPercent >= 100 && (
                                <Badge className="mt-2 bg-green-600 text-white">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Completed!
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <Button
                              onClick={() => joinChallengeMutation.mutate(challenge.id)}
                              disabled={joinChallengeMutation.isPending}
                              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                            >
                              Join Challenge
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {upcomingChallenges.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Upcoming Challenges</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {upcomingChallenges.map((challenge) => (
                  <Card key={challenge.id} className="border-none shadow-lg opacity-75">
                    <CardHeader>
                      <CardTitle className="text-xl mb-2">{challenge.title}</CardTitle>
                      <p className="text-sm text-slate-600">{challenge.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                          Starts {format(parseISO(challenge.start_date), 'MMM d, yyyy')}
                        </div>
                        <Badge className="bg-slate-400 text-white">Coming Soon</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeChallenges.length === 0 && upcomingChallenges.length === 0 && (
            <Card className="border-none shadow-lg">
              <CardContent className="text-center py-12">
                <Target className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Challenges</h3>
                <p className="text-slate-600">Check back soon for new challenges!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
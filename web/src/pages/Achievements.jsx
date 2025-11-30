import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Lock } from "lucide-react";
import { format } from "date-fns";
import AchievementBadge from "../components/achievements/AchievementBadge";

const allAchievements = [
  { type: "first_workout", title: "First Workout", description: "Complete your first workout", points: 10 },
  { type: "week_streak_3", title: "3 Week Streak", description: "Maintain a 3-week workout streak", points: 25 },
  { type: "week_streak_4", title: "4 Week Streak", description: "Maintain a 4-week workout streak", points: 50 },
  { type: "week_streak_8", title: "8 Week Streak", description: "Maintain an 8-week workout streak", points: 100 },
  { type: "total_workouts_10", title: "10 Workouts", description: "Complete 10 total workouts", points: 20 },
  { type: "total_workouts_25", title: "25 Workouts", description: "Complete 25 total workouts", points: 50 },
  { type: "total_workouts_50", title: "50 Workouts", description: "Complete 50 total workouts", points: 100 },
  { type: "total_workouts_100", title: "100 Workouts", description: "Complete 100 total workouts", points: 200 },
  { type: "volume_milestone_1000", title: "1K Volume", description: "Lift 1,000kg total volume", points: 30 },
  { type: "volume_milestone_5000", title: "5K Volume", description: "Lift 5,000kg total volume", points: 75 },
  { type: "volume_milestone_10000", title: "10K Volume", description: "Lift 10,000kg total volume", points: 150 },
  { type: "pr_breaker", title: "PR Breaker", description: "Set a new personal record", points: 15 }
];

export default function AchievementsPage() {
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: userAchievements = [], isLoading } = useQuery({
    queryKey: ['achievements', user?.email],
    queryFn: () => base44.entities.Achievement.filter({ user_email: user.email }, '-earned_date'),
    enabled: !!user?.email,
  });

  const { data: userStats } = useQuery({
    queryKey: ['user-stats', user?.email],
    queryFn: async () => {
      const stats = await base44.entities.UserStats.filter({ user_email: user.email });
      return stats[0] || null;
    },
    enabled: !!user?.email,
  });

  const earnedTypes = new Set(userAchievements.map(a => a.achievement_type));

  const totalPoints = React.useMemo(() => {
    return userAchievements.reduce((sum, achievement) => {
      const config = allAchievements.find(a => a.type === achievement.achievement_type);
      return sum + (config?.points || 0);
    }, 0);
  }, [userAchievements]);

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
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Achievements</h1>
        <p className="text-slate-600">Your fitness milestones and accomplishments</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Points</p>
                <p className="text-3xl font-bold text-slate-900">{totalPoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-slate-600 mb-1">Achievements Unlocked</p>
              <p className="text-3xl font-bold text-slate-900">
                {userAchievements.length} / {allAchievements.length}
              </p>
              <div className="mt-2">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all"
                    style={{ width: `${(userAchievements.length / allAchievements.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-slate-600 mb-1">Current Streak</p>
              <p className="text-3xl font-bold text-slate-900">{userStats?.current_streak || 0} weeks</p>
              <p className="text-xs text-slate-500 mt-1">
                Best: {userStats?.longest_streak || 0} weeks
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allAchievements.map((achievement) => {
          const isEarned = earnedTypes.has(achievement.type);
          const earnedData = userAchievements.find(a => a.achievement_type === achievement.type);

          return (
            <Card
              key={achievement.type}
              className={`border-none shadow-lg transition-all ${
                isEarned
                  ? 'bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200'
                  : 'bg-slate-50 opacity-60'
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    {isEarned ? (
                      <AchievementBadge achievement={{ achievement_type: achievement.type }} size="md" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-300 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-slate-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-lg ${isEarned ? 'text-slate-900' : 'text-slate-500'}`}>
                      {achievement.title}
                    </h3>
                    <p className={`text-sm ${isEarned ? 'text-slate-600' : 'text-slate-400'}`}>
                      {achievement.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={isEarned ? 'bg-blue-600 text-white' : 'bg-slate-400 text-white'}>
                        {achievement.points} pts
                      </Badge>
                      {isEarned && earnedData && (
                        <span className="text-xs text-slate-500">
                          {format(new Date(earnedData.earned_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
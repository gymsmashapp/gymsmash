import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History as HistoryIcon, Dumbbell, TrendingUp, Calendar, Clock, Edit2, Save, X, BarChart3, Trash2, Lock, Trophy, Star, Flame } from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import UpgradeModal from "../components/premium/UpgradeModal";
import { createCheckout } from "@/api/functions";

export default function HistoryPage() {
  // Force rebuild - template button update
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editingExercises, setEditingExercises] = useState([]);
  const [deletingLogId, setDeletingLogId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsPremium(currentUser?.subscription_tier === 'premium');
      setIsAdmin(currentUser?.role === 'admin');
    };
    loadUser();
  }, []);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['workout-logs', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.WorkoutLog.filter({
        user_email: user.email
      }, '-created_date', 100);
    },
    enabled: !!user,
  });

  const { data: exercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => base44.entities.Exercise.list('name', 500),
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.Achievement.filter({
        user_email: user.email
      });
    },
    enabled: !!user,
  });

  const { data: userStats } = useQuery({
    queryKey: ['user-stats', user?.email],
    queryFn: async () => {
      if (!user) return null;
      const stats = await base44.entities.UserStats.filter({
        user_email: user.email
      });
      return stats[0] || null;
    },
    enabled: !!user,
  });

  const allAchievements = [
    { type: "first_workout", title: "First Steps", description: "Complete your first workout", points: 10, icon: Star },
    { type: "week_streak_3", title: "3 Week Warrior", description: "Maintain a 3-week streak", points: 50, icon: Flame },
    { type: "week_streak_4", title: "Monthly Master", description: "Maintain a 4-week streak", points: 75, icon: Flame },
    { type: "week_streak_8", title: "Iron Will", description: "Maintain an 8-week streak", points: 150, icon: Flame },
    { type: "total_workouts_10", title: "Getting Started", description: "Complete 10 workouts", points: 25, icon: Dumbbell },
    { type: "total_workouts_25", title: "Dedicated", description: "Complete 25 workouts", points: 50, icon: Dumbbell },
    { type: "total_workouts_50", title: "Committed", description: "Complete 50 workouts", points: 100, icon: Dumbbell },
    { type: "total_workouts_100", title: "Century Club", description: "Complete 100 workouts", points: 200, icon: Trophy },
    { type: "volume_milestone_1000", title: "Ton Lifter", description: "Lift 1,000kg total volume", points: 25, icon: TrendingUp },
    { type: "volume_milestone_5000", title: "Heavy Hitter", description: "Lift 5,000kg total volume", points: 75, icon: TrendingUp },
    { type: "volume_milestone_10000", title: "Iron Giant", description: "Lift 10,000kg total volume", points: 150, icon: TrendingUp },
    { type: "pr_breaker", title: "Record Breaker", description: "Beat a personal record", points: 15, icon: Star },
  ];

  const earnedAchievementTypes = new Set(achievements.map(a => a.achievement_type));
  const totalAchievementPoints = achievements.reduce((sum, a) => {
    const def = allAchievements.find(d => d.type === a.achievement_type);
    return sum + (def?.points || 0);
  }, 0);

  const updateLogMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkoutLog.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['previous-weights'] });
      setEditingLogId(null);
      setEditingExercises([]);
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkoutLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['previous-weights'] });
      setDeletingLogId(null);
      
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
      toast.textContent = 'Workout deleted successfully';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    },
  });

  const handleStartEdit = (log) => {
    setEditingLogId(log.id);
    setEditingExercises(JSON.parse(JSON.stringify(log.exercises_completed || [])));
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    setEditingExercises([]);
  };

  const handleSaveEdit = (log) => {
    const totalVolume = editingExercises.reduce((sum, ex) => {
      const weight = ex.weight_kg || 0;
      const reps = ex.reps_per_set || 0;
      return sum + (ex.sets_completed * reps * weight);
    }, 0);

    updateLogMutation.mutate({
      id: log.id,
      data: {
        exercises_completed: editingExercises,
        total_volume: totalVolume
      }
    });
  };

  const handleWeightChange = (exerciseIndex, newWeight) => {
    const updated = [...editingExercises];
    updated[exerciseIndex].weight_kg = parseFloat(newWeight) || 0;
    setEditingExercises(updated);
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const response = await createCheckout({});
      if (response.data && response.data.url) {
        window.top.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Error starting checkout. Please try again.');
      setIsUpgrading(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  // Group by date
  const logsByDate = logs?.reduce((acc, log) => {
    const date = log.date || format(new Date(log.created_date), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {}) || {};

  // Group by exercise
  const exerciseHistory = {};
  logs?.forEach(log => {
    const logDate = log.date || format(new Date(log.created_date), 'yyyy-MM-dd');
    log.exercises_completed?.forEach(ex => {
      if (!exerciseHistory[ex.exercise_name]) {
        exerciseHistory[ex.exercise_name] = [];
      }
      exerciseHistory[ex.exercise_name].push({
        date: logDate,
        weight_kg: ex.weight_kg || 0,
        sets_completed: ex.sets_completed,
        reps_per_set: ex.reps_per_set,
        workout_name: log.workout_name,
        muscle_group: log.muscle_group
      });
    });
  });

  // Sort exercise history by date (most recent first)
  Object.keys(exerciseHistory).forEach(exerciseName => {
    exerciseHistory[exerciseName].sort((a, b) => new Date(b.date) - new Date(a.date));
  });

  const sortedExerciseNames = Object.keys(exerciseHistory).sort();

  const dates = Object.keys(logsByDate).sort((a, b) => new Date(b) - new Date(a));
  const totalVolume = logs?.reduce((sum, log) => sum + (log.total_volume || 0), 0) || 0;
  const totalWorkouts = logs?.length || 0;
  const mostRecentLogId = logs?.[0]?.id;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
        isUpgrading={isUpgrading}
        featureName="Create Media Templates"
      />

      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">My Performance</h1>
        <p className="text-slate-600">Track your progress and achievements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card className="border-none shadow-sm bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Total Volume</p>
                <p className="text-2xl font-bold text-[#C8102E]">
                  {totalVolume.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">kg total</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#C8102E]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Workouts Completed</p>
                <p className="text-2xl font-bold text-blue-600">{totalWorkouts}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Training Days</p>
                <p className="text-2xl font-bold text-green-600">{dates.length}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {dates.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="text-center py-8">
            <HistoryIcon className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <h2 className="text-xl font-bold mb-1">No History Yet</h2>
            <p className="text-sm text-slate-600">Complete some workouts to see your progress here!</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="by-date" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3 mb-6">
            <TabsTrigger value="by-date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="by-exercise" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              By Exercise
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Achievements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="by-exercise" className="space-y-4">
            {sortedExerciseNames.map(exerciseName => {
              const history = exerciseHistory[exerciseName];
              const latestWeight = history[0].weight_kg;
              const oldestWeight = history[history.length - 1].weight_kg;
              const weightIncrease = latestWeight - oldestWeight;
              const percentIncrease = oldestWeight > 0 ? ((weightIncrease / oldestWeight) * 100).toFixed(1) : 0;

              return (
                <Card key={exerciseName} className="border-none shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-white pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Dumbbell className="w-4 h-4 text-[#C8102E]" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{exerciseName}</CardTitle>
                          <p className="text-xs text-slate-600">{history.length} session{history.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      {weightIncrease !== 0 && (
                        <div className={`text-right ${weightIncrease > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <div className="flex items-center gap-1">
                            <TrendingUp className={`w-4 h-4 ${weightIncrease < 0 ? 'rotate-180' : ''}`} />
                            <span className="text-lg font-bold">{weightIncrease > 0 ? '+' : ''}{weightIncrease}kg</span>
                          </div>
                          <p className="text-xs font-medium">{percentIncrease > 0 ? '+' : ''}{percentIncrease}%</p>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="space-y-2">
                      {history.map((session, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span className="text-sm font-semibold text-slate-900">
                                {format(new Date(session.date), 'MMM d, yyyy')}
                              </span>
                              {index === 0 && (
                                <Badge className="bg-green-100 text-green-800 border-green-300 text-xs py-0">
                                  Latest
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <span>{session.sets_completed}×{session.reps_per_set}</span>
                              <span>•</span>
                              <span>{session.workout_name}</span>
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <div className="text-xl font-bold text-[#C8102E]">
                              {session.weight_kg}
                              <span className="text-sm text-slate-600 ml-1">kg</span>
                            </div>
                            <div className="text-xs text-slate-500">
                              {(session.sets_completed * session.reps_per_set * session.weight_kg).toLocaleString()} vol
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="by-date" className="space-y-6">
            {dates.map(date => (
              <Card key={date} className="border-none shadow-sm">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-white pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="w-4 h-4 text-[#C8102E]" />
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="space-y-4">
                    {logsByDate[date].map((log, index) => {
                      const isEditing = editingLogId === log.id;
                      const isMostRecent = log.id === mostRecentLogId;
                      const exercisesToDisplay = isEditing ? editingExercises : log.exercises_completed;

                      return (
                        <div key={index} className="p-3 rounded-lg border border-slate-200 bg-gradient-to-br from-white to-slate-50">
                          <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 text-base mb-1">
                              {log.workout_name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {log.muscle_group && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs py-0">
                                  {log.muscle_group}
                                </Badge>
                              )}
                              {isMostRecent && (
                                <Badge className="bg-green-100 text-green-800 border-green-300 text-xs py-0">
                                  Latest
                                </Badge>
                              )}
                              <div className="flex items-center gap-1 text-xs text-slate-600">
                                <Clock className="w-3 h-3" />
                                {log.duration_minutes} min
                              </div>
                              <div className="text-xs font-semibold text-slate-700">
                                Vol: {log.total_volume?.toLocaleString() || 0} kg
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {isMostRecent && !isEditing && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartEdit(log)}
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                            )}
                            {isEditing && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleSaveEdit(log)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Save className="w-4 h-4 mr-2" />
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {!isEditing && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingLogId(log.id)}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          </div>

                          <div className="space-y-2">
                           {exercisesToDisplay?.map((ex, i) => (
                              <div key={i} className="bg-white p-2 rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
                                      <Dumbbell className="w-4 h-4 text-[#C8102E]" />
                                    </div>
                                    <div className="flex-1">
                                      <span className="font-semibold text-slate-900 text-sm block">
                                        {ex.exercise_name}
                                      </span>
                                      <div className="flex items-center gap-2 text-xs text-slate-600">
                                        <span>
                                          {ex.sets_completed}×{ex.reps_per_set}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  {isEditing ? (
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        value={ex.weight_kg || 0}
                                        onChange={(e) => handleWeightChange(i, e.target.value)}
                                        className="w-20 text-center font-semibold text-sm h-8"
                                        step="0.5"
                                      />
                                      <span className="text-slate-700 font-medium text-sm">kg</span>
                                    </div>
                                  ) : (
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <div className="text-lg font-bold text-[#C8102E]">
                                        {ex.weight_kg || 0}
                                        <span className="text-xs text-slate-600 ml-0.5">kg</span>
                                      </div>
                                    </div>
                                  </div>
                                  )}
                                  </div>
                                  </div>
                                  ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            {/* Achievement Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-white">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Total Points</p>
                      <p className="text-2xl font-bold text-amber-600">{totalAchievementPoints}</p>
                    </div>
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Star className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-white">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Achievements Unlocked</p>
                      <p className="text-2xl font-bold text-purple-600">{achievements.length}/{allAchievements.length}</p>
                    </div>
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-gradient-to-br from-orange-50 to-white">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Current Streak</p>
                      <p className="text-2xl font-bold text-orange-600">{userStats?.current_streak || 0} weeks</p>
                    </div>
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Flame className="w-5 h-5 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Achievement Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allAchievements.map((achievement) => {
                const isEarned = earnedAchievementTypes.has(achievement.type);
                const earnedData = achievements.find(a => a.achievement_type === achievement.type);
                const IconComponent = achievement.icon;

                return (
                  <Card 
                    key={achievement.type} 
                    className={`border-none shadow-sm transition-all ${
                      isEarned 
                        ? 'bg-gradient-to-br from-amber-50 to-white ring-2 ring-amber-200' 
                        : 'bg-slate-50 opacity-60'
                    }`}
                  >
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isEarned 
                            ? 'bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg' 
                            : 'bg-slate-200'
                        }`}>
                          <IconComponent className={`w-6 h-6 ${isEarned ? 'text-white' : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold ${isEarned ? 'text-slate-900' : 'text-slate-500'}`}>
                              {achievement.title}
                            </h3>
                            {isEarned && (
                              <Badge className="bg-green-100 text-green-800 text-xs py-0">
                                ✓ Earned
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mb-2">{achievement.description}</p>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className={isEarned ? 'border-amber-300 text-amber-700' : ''}>
                              {achievement.points} pts
                            </Badge>
                            {earnedData && (
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
          </TabsContent>
        </Tabs>
      )}

      <AlertDialog open={!!deletingLogId} onOpenChange={() => setDeletingLogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this workout log and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLogMutation.mutate(deletingLogId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Trophy, Users, Calendar, CheckCircle2 } from "lucide-react";
import { format, parseISO, isAfter, isBefore } from "date-fns";

export default function ChallengesPage() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: challenges = [], isLoading } = useQuery({
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
      case 'streak':
        progress = 0; // Would need more complex calculation
        break;
      case 'specific_exercise':
        progress = challengeLogs.reduce((count, log) => {
          const hasExercise = log.exercises_completed?.some(
            ex => ex.exercise_name === challenge.exercise_name
          );
          return count + (hasExercise ? 1 : 0);
        }, 0);
        break;
    }

    return progress;
  };

  const getChallengeParticipantCount = (challengeId) => {
    return allParticipants.filter(p => p.challenge_id === challengeId).length;
  };

  const activeChallenges = challenges.filter(c => {
    const now = new Date();
    return isAfter(now, parseISO(c.start_date)) && isBefore(now, parseISO(c.end_date));
  });

  const upcomingChallenges = challenges.filter(c => {
    return isAfter(parseISO(c.start_date), new Date());
  });

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Community Challenges</h1>
        <p className="text-slate-600">Join challenges and compete with the community</p>
      </div>

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
                            <span className="font-semibold text-slate-900">
                              {progress} / {challenge.target_value}
                            </span>
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
    </div>
  );
}
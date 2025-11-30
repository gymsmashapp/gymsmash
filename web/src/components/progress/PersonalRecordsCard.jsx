import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function PersonalRecordsCard({ workoutLogs }) {
  const calculatePRs = () => {
    const prs = {};

    workoutLogs?.forEach(log => {
      log.exercises_completed?.forEach(exercise => {
        const name = exercise.exercise_name;
        const weight = exercise.weight_kg || 0;

        if (weight > 0) {
          if (!prs[name] || weight > prs[name].weight) {
            prs[name] = {
              weight,
              date: log.date,
              sets: exercise.sets_completed,
              reps: exercise.reps_per_set
            };
          }
        }
      });
    });

    return Object.entries(prs)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);
  };

  const prs = calculatePRs();

  if (prs.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Personal Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 text-sm text-center py-8">
            Complete workouts with weight to track your personal records
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Personal Records
          <Badge className="bg-yellow-100 text-yellow-800 ml-2">
            Top {prs.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {prs.map((pr, index) => (
            <div
              key={pr.name}
              className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-white rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-amber-600' : 'bg-slate-300'
                }`}>
                  <span className="text-white font-bold text-sm">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">{pr.name}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(pr.date), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">{pr.weight}<span className="text-sm text-slate-600">kg</span></p>
                <p className="text-xs text-slate-500">{pr.sets}×{pr.reps}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
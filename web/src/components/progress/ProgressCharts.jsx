import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, Activity, Dumbbell } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function ProgressCharts({ workoutLogs }) {
  const [selectedExercise, setSelectedExercise] = useState("all");

  // Get all unique exercises
  const allExercises = React.useMemo(() => {
    const exerciseSet = new Set();
    workoutLogs?.forEach(log => {
      log.exercises_completed?.forEach(ex => {
        if (ex.weight_kg > 0) {
          exerciseSet.add(ex.exercise_name);
        }
      });
    });
    return Array.from(exerciseSet).sort();
  }, [workoutLogs]);

  // Volume over time chart data
  const volumeData = React.useMemo(() => {
    const data = workoutLogs
      ?.filter(log => log.total_volume > 0)
      .map(log => ({
        date: log.date,
        volume: log.total_volume,
        displayDate: format(parseISO(log.date), 'MMM d')
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date)) || [];

    return data.slice(-20); // Last 20 workouts
  }, [workoutLogs]);

  // Exercise-specific progress
  const exerciseProgressData = React.useMemo(() => {
    if (selectedExercise === "all" || !selectedExercise) return [];

    const data = [];
    workoutLogs?.forEach(log => {
      const exercise = log.exercises_completed?.find(
        ex => ex.exercise_name === selectedExercise && ex.weight_kg > 0
      );
      if (exercise) {
        data.push({
          date: log.date,
          weight: exercise.weight_kg,
          displayDate: format(parseISO(log.date), 'MMM d'),
          sets: exercise.sets_completed,
          reps: exercise.reps_per_set
        });
      }
    });

    return data.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-15);
  }, [workoutLogs, selectedExercise]);

  // Workout frequency data (last 8 weeks)
  const frequencyData = React.useMemo(() => {
    const weekMap = {};
    workoutLogs?.forEach(log => {
      const date = parseISO(log.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1);
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!weekMap[weekKey]) {
        weekMap[weekKey] = {
          week: format(weekStart, 'MMM d'),
          count: 0
        };
      }
      weekMap[weekKey].count++;
    });

    return Object.values(weekMap)
      .sort((a, b) => new Date(a.week) - new Date(b.week))
      .slice(-8);
  }, [workoutLogs]);

  return (
    <div className="space-y-6">
      {/* Total Volume Over Time */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Total Volume Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {volumeData.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-8">
              Complete workouts with weights to see your volume progress
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Volume (kg)', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#64748b' } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`${value.toLocaleString()} kg`, 'Volume']}
                />
                <Line 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Exercise-Specific Progress */}
      {allExercises.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-orange-600" />
                Exercise Progress
              </CardTitle>
              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select exercise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Select exercise...</SelectItem>
                  {allExercises.map(ex => (
                    <SelectItem key={ex} value={ex}>{ex}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {selectedExercise === "all" || exerciseProgressData.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-8">
                {selectedExercise === "all" 
                  ? "Select an exercise above to view its progress" 
                  : "No data available for this exercise"}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={exerciseProgressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="displayDate" 
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#64748b' } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value, name, props) => [
                      `${value} kg (${props.payload.sets}×${props.payload.reps})`,
                      'Weight'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#f97316" 
                    strokeWidth={3}
                    dot={{ fill: '#f97316', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Workout Frequency */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            Weekly Workout Frequency
          </CardTitle>
        </CardHeader>
        <CardContent>
          {frequencyData.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-8">
              Complete more workouts to see weekly trends
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={frequencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="week" 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Workouts', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#64748b' } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`${value} workouts`, 'Week of']}
                />
                <Bar 
                  dataKey="count" 
                  fill="#22c55e" 
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
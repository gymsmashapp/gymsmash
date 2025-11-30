import React from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Clock, Dumbbell, ArrowLeftRight } from "lucide-react";
import { format, addDays } from "date-fns";

const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeeklyCalendar({ workouts, onWorkoutClick, weekStart, isSwapMode, firstSwapDay }) {
  console.log('WeeklyCalendar workouts:', workouts);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
      {dayNames.map((day, index) => {
        const workout = workouts?.find(w => w.day?.toLowerCase() === day.toLowerCase());
        const date = addDays(weekStart, index);
        const isToday = format(new Date(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
        const isFirstSwapSelection = firstSwapDay?.toLowerCase() === day.toLowerCase();

        console.log(`Day: ${day}, Workout found:`, workout);

        return (
          <motion.div
            key={day}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className={`p-4 transition-all duration-200 ${
                workout || isSwapMode
                  ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' 
                  : ''
              } ${
                workout 
                  ? 'bg-gradient-to-br from-white to-orange-50 border-orange-200' 
                  : 'bg-slate-50 border-slate-200'
              } ${
                isToday ? 'ring-2 ring-orange-500' : ''
              } ${
                isFirstSwapSelection ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              } ${
                isSwapMode && !isFirstSwapSelection ? 'hover:ring-2 hover:ring-blue-300' : ''
              }`}
              onClick={() => onWorkoutClick(day, workout)}
            >
              <div className="text-center mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {dayLabels[index]}
                </p>
                <p className={`text-2xl font-bold ${isToday ? 'text-orange-600' : 'text-slate-900'}`}>
                  {format(date, 'd')}
                </p>
              </div>

              {isSwapMode && isFirstSwapSelection && (
                <div className="flex justify-center mb-2">
                  <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                </div>
              )}

              {workout ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-orange-600" />
                    <p className="font-semibold text-sm text-slate-900 line-clamp-2">
                      {workout.workout_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <Clock className="w-3 h-3" />
                    <span>{workout.duration_minutes} min</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {workout.exercises?.length || 0} exercises
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-400">
                    {isSwapMode ? 'Click to swap here' : 'Rest Day'}
                  </p>
                </div>
              )}
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
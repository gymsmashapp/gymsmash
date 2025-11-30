import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Dumbbell, Target, Play } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function WorkoutDetailModal({ workout, open, onClose }) {
  const navigate = useNavigate();

  if (!workout) return null;

  const handleStartWorkout = () => {
    onClose();
    navigate(createPageUrl("WorkoutSession"), { state: { workout } });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-slate-900 mb-2">
                {workout.workout_type}
              </DialogTitle>
              <div className="flex gap-3">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  <Clock className="w-3 h-3 mr-1" />
                  {workout.duration_minutes} min
                </Badge>
                <Badge variant="secondary" className="bg-slate-100 text-slate-800">
                  <Dumbbell className="w-3 h-3 mr-1" />
                  {workout.exercises?.length || 0} exercises
                </Badge>
              </div>
            </div>
            <Button
              onClick={handleStartWorkout}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white gap-2 ml-4"
            >
              <Play className="w-4 h-4" />
              Start Workout
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          {workout.notes && (
            <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-900">{workout.notes}</p>
            </div>
          )}

          <div className="space-y-4">
            {workout.exercises?.map((exercise, index) => (
              <div 
                key={index}
                className="p-4 rounded-lg border border-slate-200 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-slate-900">{exercise.name}</h4>
                  <Badge variant="outline" className="ml-2">
                    {exercise.sets} sets
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4 text-orange-500" />
                    <span>{exercise.reps} reps</span>
                  </div>
                </div>
                {exercise.notes && (
                  <p className="text-xs text-slate-500 mt-2 italic">
                    {exercise.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
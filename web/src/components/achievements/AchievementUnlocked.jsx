import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import AchievementBadge from "./AchievementBadge";

const achievementMessages = {
  first_workout: { title: "First Workout Complete!", message: "You've taken the first step on your fitness journey!" },
  week_streak_3: { title: "3 Week Streak!", message: "Consistency is key! Keep up the momentum!" },
  week_streak_4: { title: "4 Week Streak!", message: "You're on fire! A full month of dedication!" },
  week_streak_8: { title: "8 Week Streak!", message: "Incredible dedication! You're unstoppable!" },
  total_workouts_10: { title: "10 Workouts Done!", message: "Double digits! You're building a solid foundation!" },
  total_workouts_25: { title: "25 Workouts Complete!", message: "Quarter century! Your hard work is paying off!" },
  total_workouts_50: { title: "50 Workouts!", message: "Halfway to 100! You're a fitness warrior!" },
  total_workouts_100: { title: "100 Workouts!", message: "Century club! You're an inspiration!" },
  volume_milestone_1000: { title: "1,000kg Moved!", message: "That's a ton of weight! Literally impressive!" },
  volume_milestone_5000: { title: "5,000kg Volume!", message: "You've moved 5 tons! Incredible strength!" },
  volume_milestone_10000: { title: "10,000kg Volume!", message: "10 tons moved! You're a powerhouse!" },
  pr_breaker: { title: "Personal Record!", message: "New PR! You've surpassed your previous best!" }
};

export default function AchievementUnlocked({ achievement, isOpen, onClose }) {
  if (!achievement) return null;

  const message = achievementMessages[achievement.achievement_type] || achievementMessages.first_workout;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl mb-4">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-500" />
              Achievement Unlocked!
              <Sparkles className="w-6 h-6 text-yellow-500" />
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            You've earned a new achievement
          </DialogDescription>
        </DialogHeader>

        <motion.div
          className="flex flex-col items-center py-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AchievementBadge achievement={achievement} size="lg" showAnimation={true} />
          
          <motion.h3
            className="text-2xl font-bold text-slate-900 mt-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {message.title}
          </motion.h3>
          
          <motion.p
            className="text-slate-600 mt-2 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {message.message}
          </motion.p>

          {achievement.metadata?.points && (
            <motion.div
              className="mt-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full px-4 py-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
            >
              <p className="text-sm font-semibold text-blue-900">
                +{achievement.metadata.points} Points
              </p>
            </motion.div>
          )}
        </motion.div>

        <Button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
        >
          Awesome!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
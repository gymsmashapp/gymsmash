import React from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, Target, TrendingUp, Award, Zap } from "lucide-react";

const achievementConfig = {
  first_workout: { icon: Trophy, color: "from-blue-500 to-blue-600", label: "First Workout" },
  week_streak_3: { icon: Flame, color: "from-orange-500 to-red-600", label: "3 Week Streak" },
  week_streak_4: { icon: Flame, color: "from-orange-500 to-red-600", label: "4 Week Streak" },
  week_streak_8: { icon: Flame, color: "from-red-500 to-red-700", label: "8 Week Streak" },
  total_workouts_10: { icon: Target, color: "from-green-500 to-green-600", label: "10 Workouts" },
  total_workouts_25: { icon: Target, color: "from-green-500 to-green-600", label: "25 Workouts" },
  total_workouts_50: { icon: Award, color: "from-purple-500 to-purple-600", label: "50 Workouts" },
  total_workouts_100: { icon: Award, color: "from-purple-500 to-purple-700", label: "100 Workouts" },
  volume_milestone_1000: { icon: TrendingUp, color: "from-cyan-500 to-cyan-600", label: "1K Volume" },
  volume_milestone_5000: { icon: TrendingUp, color: "from-cyan-500 to-cyan-700", label: "5K Volume" },
  volume_milestone_10000: { icon: Zap, color: "from-yellow-500 to-yellow-600", label: "10K Volume" },
  pr_breaker: { icon: Zap, color: "from-pink-500 to-pink-600", label: "PR Breaker" }
};

export default function AchievementBadge({ achievement, size = "md", showAnimation = false }) {
  const config = achievementConfig[achievement.achievement_type] || achievementConfig.first_workout;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24"
  };

  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  };

  const BadgeContent = (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}>
      <Icon className={`${iconSizes[size]} text-white`} />
    </div>
  );

  if (showAnimation) {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        {BadgeContent}
      </motion.div>
    );
  }

  return BadgeContent;
}
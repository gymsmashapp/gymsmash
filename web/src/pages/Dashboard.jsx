import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, Dumbbell, ChevronLeft, ChevronRight, ArrowLeftRight, ArrowLeft, Plus, X, RefreshCw, Lock, CheckCircle2, Crown, ArrowRight } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createCheckout } from "@/api/functions";
import UpgradeModal from "../components/premium/UpgradeModal";

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [viewingUserEmail, setViewingUserEmail] = useState(null);
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [swapMode, setSwapMode] = useState(false);
  const [firstSwapDay, setFirstSwapDay] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editingDay, setEditingDay] = useState(null);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [rotationInfo, setRotationInfo] = useState(null);
  const [isApplyingRotation, setIsApplyingRotation] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeatureName, setUpgradeFeatureName] = useState("");
  const [showFeaturesOverview, setShowFeaturesOverview] = useState(false);

  useEffect(() => {
    const loadUserAndProfile = async () => {
      setIsLoading(true);
      try {
        // Check if user and profile were passed from navigation state
        const stateUser = location.state?.user;
        const stateProfile = location.state?.userProfile;
        
        const currentUser = stateUser || await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser?.role === 'admin');
        setIsPremium(currentUser?.subscription_tier === 'premium');
        
        const urlParams = new URLSearchParams(window.location.search);
        const viewUserParam = urlParams.get('viewUser');
        
        if (viewUserParam && currentUser?.role === 'admin') {
          setViewingUserEmail(viewUserParam);
          
          const response = await base44.functions.invoke('getAdminUsers', {
            targetUserEmail: viewUserParam
          });
          
          if (response.data.profile) {
            setViewingUserProfile(response.data.profile);
          }
        } else if (currentUser) {
          // Use state profile if available, otherwise fetch
          if (stateProfile) {
            setUserProfile(stateProfile);
            await checkRotationStatus(stateProfile);
          } else {
            const profiles = await base44.entities.UserProfile.filter({ 
              user_email: currentUser.email 
            });
            
            if (profiles.length > 0) {
              setUserProfile(profiles[0]);
              
              if (!viewUserParam) {
                await checkRotationStatus(profiles[0]);
              }
            }
          }
        }
      } catch (error) {
        console.error("Dashboard: Error loading user or profile:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUserAndProfile();
  }, [location.state]);

  const checkRotationStatus = async (profile) => {
    try {
      // Get global rotation setting
      const rotationSettings = await base44.entities.AppSettings.filter({
        setting_key: 'template_rotation_weeks'
      });
      const rotationWeeks = rotationSettings.length > 0 ? parseInt(rotationSettings[0].setting_value) : 4;

      // Calculate weeks since profile creation OR last rotation
      const startDate = profile.last_rotation_date 
        ? new Date(profile.last_rotation_date)
        : new Date(profile.created_date);
      
      const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;
      const weeksSinceStart = Math.floor((Date.now() - startDate.getTime()) / MS_PER_WEEK);

      // Check if user is due for rotation and hasn't declined current rotation
      if (weeksSinceStart >= rotationWeeks && !profile.declined_current_rotation) {
        const currentCycle = profile.current_rotation_cycle || 0;
        const nextCycle = currentCycle + 1;
        
        setRotationInfo({
          currentCycle,
          nextCycle,
          rotationWeeks,
          weeksSinceStart
        });
        setShowRotationModal(true);
      }
    } catch (error) {
      console.error("Error checking rotation status:", error);
    }
  };

  const regenerateSchedule = async (profile, cycleNumber) => {
    try {
      let allTemplates = await base44.entities.WorkoutTemplate.filter({
        target_goal: profile.primary_goal,
        equipment_needed: profile.equipment_access,
        is_active: true
      });

      if (allTemplates.length === 0) {
        allTemplates = await base44.entities.WorkoutTemplate.filter({
          target_goal: profile.primary_goal,
          is_active: true
        });
      }

      if (allTemplates.length === 0) {
        allTemplates = await base44.entities.WorkoutTemplate.filter({
          is_active: true
        });
      }

      if (allTemplates.length === 0) {
        throw new Error("No workout templates available.");
      }

      // Group templates for rotation based on the specified cycle number
      const templateGroups = {};
      const ungroupedTemplates = [];

      allTemplates.forEach(template => {
        if (template.template_group) {
          if (!templateGroups[template.template_group]) {
            templateGroups[template.template_group] = [];
          }
          templateGroups[template.template_group].push(template);
        } else {
          ungroupedTemplates.push(template);
        }
      });

      Object.keys(templateGroups).forEach(groupName => {
        templateGroups[groupName].sort((a, b) => (a.version_number || 1) - (b.version_number || 1));
      });

      const availableTemplatesForSchedule = [];

      Object.keys(templateGroups).forEach(groupName => {
        const group = templateGroups[groupName];
        if (group.length > 0) {
          // Use the cycle number to determine which version to use
          const versionIndex = cycleNumber % group.length;
          const selectedTemplate = group[versionIndex];
          if (selectedTemplate) {
            availableTemplatesForSchedule.push(selectedTemplate);
          }
        }
      });

      availableTemplatesForSchedule.push(...ungroupedTemplates);

      if (availableTemplatesForSchedule.length === 0) {
        throw new Error("No suitable templates found.");
      }

      const muscleGroups = profile.primary_goal === "build_muscle" 
        ? ["Abs/Shoulders", "Biceps/Triceps", "Chest/Calves", "Legs", "Back"]
        : null;

      const workouts = [];
      const usedTemplates = new Set();

      profile.available_days.forEach((day, index) => {
        let template = null;
        
        if (muscleGroups) {
          const targetGroup = muscleGroups[index % muscleGroups.length];
          template = availableTemplatesForSchedule.find(t => 
            t.muscle_group === targetGroup && !usedTemplates.has(t.id)
          );
          
          if (!template) {
            template = availableTemplatesForSchedule.find(t => !usedTemplates.has(t.id));
          }
        } else {
          template = availableTemplatesForSchedule.find(t => !usedTemplates.has(t.id));
        }

        if (!template) {
          usedTemplates.clear();
          template = muscleGroups
            ? availableTemplatesForSchedule.find(t => t.muscle_group === muscleGroups[index % muscleGroups.length])
            : availableTemplatesForSchedule[0];
          
          if (!template) {
            template = availableTemplatesForSchedule[0];
          }
        }

        if (template) {
          usedTemplates.add(template.id);
          workouts.push({
            day,
            workout_name: template.name,
            muscle_group: template.muscle_group || "",
            duration_minutes: template.duration_minutes,
            exercises: template.exercises
          });
        }
      });

      const existingUserSchedule = await base44.entities.WorkoutSchedule.filter({
        user_email: profile.user_email
      });

      if (existingUserSchedule.length > 0) {
        await base44.entities.WorkoutSchedule.update(existingUserSchedule[0].id, { workouts });
      } else {
        await base44.entities.WorkoutSchedule.create({
          user_email: profile.user_email,
          workouts
        });
      }
    } catch (error) {
      console.error("Error regenerating schedule:", error);
      throw error;
    }
  };

  const handleAcceptRotation = async () => {
    setIsApplyingRotation(true);
    try {
      const nextCycle = rotationInfo.nextCycle;
      
      // Update profile with new rotation cycle in DB
      await base44.entities.UserProfile.update(userProfile.id, {
        current_rotation_cycle: nextCycle,
        last_rotation_date: format(new Date(), 'yyyy-MM-dd'),
        declined_current_rotation: false
      });

      // Refetch the updated profile from DB to ensure local state is consistent
      const updatedProfiles = await base44.entities.UserProfile.filter({ 
        user_email: user.email 
      });
      const updatedProfile = updatedProfiles[0];

      if (updatedProfile) {
        // Regenerate schedule using the newly updated profile
        await regenerateSchedule(updatedProfile, nextCycle);
        // Update local userProfile state
        setUserProfile(updatedProfile);
      }

      // Invalidate relevant queries to force re-fetch
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['available-templates'] });

      setShowRotationModal(false);
      
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
      toast.textContent = '🎉 New workout programme activated!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (error) {
      console.error("Error applying rotation:", error);
      alert("Error applying new programme: " + error.message);
    }
    setIsApplyingRotation(false);
  };

  const handleDeclineRotation = async () => {
    try {
      // Mark as declined so we don't show this again until next rotation period
      await base44.entities.UserProfile.update(userProfile.id, {
        declined_current_rotation: true
      });

      // Refresh profile to reflect the declined status
      const profiles = await base44.entities.UserProfile.filter({ 
        user_email: user.email 
      });
      if (profiles.length > 0) {
        setUserProfile(profiles[0]);
      }

      setShowRotationModal(false);
      
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
      toast.textContent = 'Staying with current programme';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (error) {
      console.error("Error declining rotation:", error);
      alert("Error: " + error.message);
    }
  };

  const handleUpgrade = async (selectedPlan) => {
    setIsUpgrading(true);
    try {
      const checkoutParams = selectedPlan ? {
        plan_type: selectedPlan.plan_type,
        stripe_price_id: selectedPlan.stripe_price_id
      } : {};
      const response = await createCheckout(checkoutParams);
      if (response.data && response.data.url) {
        // Force redirect at top level to avoid iframe issues
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

  const handlePremiumFeatureClick = (featureName) => {
    if (!isPremium && !isAdmin) {
      setUpgradeFeatureName(featureName);
      setShowUpgradeModal(true);
    }
  };

  // Check for payment status in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
      toast.textContent = '🎉 Welcome to Premium! Your upgrade is being processed.';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.remove();
        // Remove 'payment' param from URL without reloading
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('payment');
        window.history.replaceState({}, document.title, newUrl.toString());
      }, 3000);
    } else if (paymentStatus === 'cancelled') {
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-yellow-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
      toast.textContent = 'Payment cancelled. You can upgrade anytime!';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.remove();
        // Remove 'payment' param from URL without reloading
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('payment');
        window.history.replaceState({}, document.title, newUrl.toString());
      }, 3000);
    }
  }, []);

  const getCurrentWeekStart = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    return addWeeks(weekStart, weekOffset);
  };

  const targetEmail = viewingUserEmail || user?.email;

  const { data: schedule, isLoading: scheduleIsLoading } = useQuery({
    queryKey: ['schedule', targetEmail],
    queryFn: async () => {
      if (!targetEmail) return null;
      
      if (viewingUserEmail && isAdmin) {
        const response = await base44.functions.invoke('getAdminUsers', {
          targetUserEmail: viewingUserEmail
        });
        return response.data.schedule || null;
      } else {
        const schedules = await base44.entities.WorkoutSchedule.filter({
          user_email: targetEmail
        }, '-updated_date', 1);
        
        return schedules[0] || null;
      }
    },
    enabled: !!targetEmail && !isLoading,
  });

  const { data: availableTemplates } = useQuery({
    queryKey: ['available-templates', viewingUserProfile?.primary_goal, user?.email, userProfile?.current_rotation_cycle],
    queryFn: async () => {
      if (!user?.email && !viewingUserEmail) return [];
      
      const emailToFetchProfile = viewingUserEmail || user.email;
      const profiles = await base44.entities.UserProfile.filter({ user_email: emailToFetchProfile });
      const profile = profiles[0];

      if (!profile) return [];
      
      let templates = await base44.entities.WorkoutTemplate.filter({
        target_goal: profile.primary_goal,
        is_active: true
      });
      
      if (templates.length === 0) {
        templates = await base44.entities.WorkoutTemplate.filter({
          is_active: true
        });
      }

      // Get global rotation setting
      const rotationSettings = await base44.entities.AppSettings.filter({
        setting_key: 'template_rotation_weeks'
      });
      const rotationWeeks = rotationSettings.length > 0 ? parseInt(rotationSettings[0].setting_value) : 4;

      // Use the user's current rotation cycle instead of calculating from time
      const currentCycle = profile.current_rotation_cycle || 0;

      // Group templates by template_group for rotation
      const templateGroups = {};
      const ungroupedTemplates = [];

      templates.forEach(template => {
        if (template.template_group) {
          if (!templateGroups[template.template_group]) {
            templateGroups[template.template_group] = [];
          }
          templateGroups[template.template_group].push(template);
        } else {
          ungroupedTemplates.push(template);
        }
      });

      // Sort each group by version_number
      Object.keys(templateGroups).forEach(groupName => {
        templateGroups[groupName].sort((a, b) => (a.version_number || 1) - (b.version_number || 1));
      });

      // Create a pool of templates to use, applying rotation logic
      const rotatedTemplates = [];

      // Add rotated versions from groups based on current cycle
      Object.keys(templateGroups).forEach(groupName => {
        const group = templateGroups[groupName];
        if (group.length > 0) {
          const versionIndex = currentCycle % group.length;
          const selectedTemplate = group[versionIndex];
          rotatedTemplates.push(selectedTemplate);
        }
      });

      // Combine rotated templates and ungrouped templates
      return [...rotatedTemplates, ...ungroupedTemplates];
    },
    enabled: !!(user?.email || viewingUserEmail) && !isLoading,
  });

  const handleStartWorkout = (workout) => {
    if (viewingUserEmail) {
      alert("Cannot start workouts for other users");
      return;
    }
    navigate(createPageUrl("WorkoutSession"), { state: { workout } });
  };

  const handleDayClick = async (day, workout) => {
    if (weekOffset !== 0) return;

    if (editMode && canModify) {
      setEditingDay(day);
      setShowWorkoutPicker(true);
      return;
    }

    if (swapMode && canModify) {
      if (!firstSwapDay) {
        setFirstSwapDay(day);
      } else {
        await handleSwapWorkouts(firstSwapDay, day);
        setFirstSwapDay(null);
        setSwapMode(false);
      }
      return;
    }

    if (workout && !viewingUserEmail && isCurrentWeek) {
      handleStartWorkout(workout);
    }
  };

  const handleRemoveWorkout = async (day) => {
    if (!schedule || !schedule.workouts || !canModify) return;

    const updatedWorkouts = schedule.workouts.filter(w => w.day.toLowerCase() !== day.toLowerCase());

    try {
      if (viewingUserEmail && isAdmin) {
        await base44.functions.invoke('updateUserSchedule', {
          scheduleId: schedule.id,
          workouts: updatedWorkouts
        });
      } else {
        await base44.entities.WorkoutSchedule.update(schedule.id, { workouts: updatedWorkouts });
      }
      
      queryClient.invalidateQueries({ queryKey: ['schedule', targetEmail] });
      
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
      toast.textContent = 'Workout removed!';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 3000);
    } catch (error) {
      console.error("Error removing workout:", error);
      alert("Error removing workout: " + error.message);
    }
  };

  const handleAddWorkout = async (template) => {
    if (!schedule || !editingDay || !canModify) return;

    const currentWorkouts = [...(schedule.workouts || [])];
    const existingIndex = currentWorkouts.findIndex(w => w.day.toLowerCase() === editingDay.toLowerCase());

    const newWorkout = {
      day: editingDay,
      workout_name: template.name,
      muscle_group: template.muscle_group || "",
      duration_minutes: template.duration_minutes,
      exercises: template.exercises
    };

    let updatedWorkouts;
    if (existingIndex !== -1) {
      updatedWorkouts = currentWorkouts.map((w, index) => 
        index === existingIndex ? newWorkout : w
      );
    } else {
      updatedWorkouts = [...currentWorkouts, newWorkout];
    }

    try {
      if (viewingUserEmail && isAdmin) {
        await base44.functions.invoke('updateUserSchedule', {
          scheduleId: schedule.id,
          workouts: updatedWorkouts
        });
      } else {
        await base44.entities.WorkoutSchedule.update(schedule.id, { workouts: updatedWorkouts });
      }
      
      queryClient.invalidateQueries({ queryKey: ['schedule', targetEmail] });
      setShowWorkoutPicker(false);
      setEditingDay(null);
      
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
      toast.textContent = 'Workout added!';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 3000);
    } catch (error) {
      console.error("Error adding workout:", error);
      alert("Error adding workout: " + error.message);
    }
  };

  const handleSwapWorkouts = async (day1, day2) => {
    if (weekOffset !== 0 || !schedule || !schedule.workouts || !canModify) return;

    const workouts = [...schedule.workouts];
    const workout1Index = workouts.findIndex(w => w.day.toLowerCase() === day1.toLowerCase());
    const workout2Index = workouts.findIndex(w => w.day.toLowerCase() === day2.toLowerCase());

    let updatedWorkouts = [...workouts];

    if (workout1Index !== -1 && workout2Index !== -1) {
        const tempWorkout1 = { ...updatedWorkouts[workout1Index], day: day2 };
        const tempWorkout2 = { ...updatedWorkouts[workout2Index], day: day1 };
        updatedWorkouts[workout1Index] = tempWorkout2;
        updatedWorkouts[workout2Index] = tempWorkout1;
    }
    else if (workout1Index !== -1 && workout2Index === -1) {
        const movedWorkout = { ...updatedWorkouts[workout1Index], day: day2 };
        updatedWorkouts = updatedWorkouts.filter((_, idx) => idx !== workout1Index);
        updatedWorkouts.push(movedWorkout);
    }
    else if (workout1Index === -1 && workout2Index !== -1) {
        const movedWorkout = { ...updatedWorkouts[workout2Index], day: day1 };
        updatedWorkouts = updatedWorkouts.filter((_, idx) => idx !== workout2Index);
        updatedWorkouts.push(movedWorkout);
    }
    else {
        console.warn("Attempted to swap workouts but at least one day had no assigned workout or was not found.");
        setFirstSwapDay(null);
        setSwapMode(false);
        return;
    }

    try {
      if (viewingUserEmail && isAdmin) {
        await base44.functions.invoke('updateUserSchedule', {
          scheduleId: schedule.id,
          workouts: updatedWorkouts
        });
      } else {
        await base44.entities.WorkoutSchedule.update(schedule.id, { workouts: updatedWorkouts });
      }
      
      queryClient.invalidateQueries({ queryKey: ['schedule', targetEmail] });
      
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
      toast.textContent = 'Workout moved! This change applies to all weeks.';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 3000);
    } catch (error) {
      console.error("Error swapping workouts:", error);
      alert("Error moving workout: " + error.message);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!viewingUserEmail && !userProfile) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <Card className="border-none shadow-2xl bg-gradient-to-br from-[#FCE8EC] to-white">
          <CardContent className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-[#C8102E] to-[#A00D25] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Dumbbell className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Welcome to Gym Smash!</h1>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              Let's create your personalized workout plan. Answer a few quick questions to get started with your fitness journey.
            </p>
            <Button
              onClick={() => navigate(createPageUrl("Questionnaire"))}
              size="lg"
              className="bg-gradient-to-r from-[#C8102E] to-[#A00D25] hover:from-orange-600 hover:to-orange-700 text-white text-lg px-10 py-6"
            >
              <Sparkles className="w-6 h-6 mr-2" />
              Start Questionnaire
            </Button>
            <p className="text-sm text-slate-500 mt-6">Takes less than 2 minutes</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (scheduleIsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  const weekStart = getCurrentWeekStart();
  const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const isCurrentWeek = weekOffset === 0;
  const canModify = isCurrentWeek && (isAdmin || (isPremium && !viewingUserEmail));

  return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
        isUpgrading={isUpgrading}
        featureName={upgradeFeatureName}
      />

      {/* Features Overview Modal */}
      <Dialog open={showFeaturesOverview} onOpenChange={setShowFeaturesOverview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Features Overview
            </DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6 mt-4">
            {/* Standard Features */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-slate-600" />
                </div>
                <h3 className="font-bold text-slate-900">Standard User Features</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-slate-900">Set your goals</p>
                    <p className="text-xs text-slate-600">Customize your fitness objectives</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-slate-900">Generate a personalised workout</p>
                    <p className="text-xs text-slate-600">Your workout schedule created by gym experts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-slate-900">Track your progress</p>
                    <p className="text-xs text-slate-600">See your performance stats as you achieve</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Features */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-lg flex items-center justify-center shadow-md">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-900">Premium User Features</h3>
                <Badge className="bg-blue-600 text-white ml-auto">
                  Upgrade
                </Badge>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600" />
                  <div>
                    <p className="font-semibold text-sm text-slate-900">Record your own in-session workout videos</p>
                    <p className="text-xs text-slate-600">Capture your workout to review and share using video/stats templates optimised for social media</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600" />
                  <div>
                    <p className="font-semibold text-sm text-slate-900">Change your workouts</p>
                    <p className="text-xs text-slate-600">Create your own/add workouts from our library</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600" />
                  <div>
                    <p className="font-semibold text-sm text-slate-900">View coaches' videos</p>
                    <p className="text-xs text-slate-600">See expert YouTube coach demonstrations for your workout exercises</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg text-white">
              <div>
                <p className="font-bold text-lg">Unlock Premium Features</p>
                <p className="text-sm text-blue-100">£7.99/month • Cancel anytime</p>
              </div>
              <Button
                onClick={() => {
                  setShowFeaturesOverview(false);
                  setShowUpgradeModal(true);
                }}
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                Upgrade Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rotation Modal */}
      <Dialog open={showRotationModal} onOpenChange={setShowRotationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-blue-600" />
              New Programme Available!
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-900 mb-2">
                You've completed <strong>{rotationInfo?.rotationWeeks} weeks</strong> with your current workout programme.
              </p>
              <p className="text-sm text-blue-900">
                Ready to level up with new exercises and variations?
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-700">
                  {rotationInfo?.currentCycle + 1}
                </div>
                <span className="text-slate-600">Current Programme</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-gradient-to-br from-[#C8102E] to-[#A00D25] rounded-full flex items-center justify-center font-bold text-white shadow-lg">
                  {rotationInfo?.nextCycle + 1}
                </div>
                <span className="font-semibold text-slate-900">New Programme (Recommended)</span>
              </div>
            </div>

            <div className="bg-[#FCE8EC] border border-[#F5B3BE] rounded-lg p-3">
              <p className="text-xs text-[#5A0712]">
                💪 <strong>Why rotate?</strong> Changing exercises prevents plateaus, targets muscles differently, and keeps workouts engaging!
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleDeclineRotation}
                className="flex-1"
                disabled={isApplyingRotation}
              >
                Maybe Later
              </Button>
              <Button
                onClick={handleAcceptRotation}
                disabled={isApplyingRotation}
                className="flex-1 bg-gradient-to-r from-[#C8102E] to-[#A00D25] hover:from-orange-600 hover:to-orange-700 text-white"
              >
                {isApplyingRotation ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Activate New Programme
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {viewingUserEmail && (
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("AdminUsers"))}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-blue-900">
                <strong>Viewing Workouts:</strong> {viewingUserProfile?.user_email || viewingUserEmail}
              </p>
              {viewingUserProfile && (
                <p className="text-xs text-blue-700 mt-1">
                  Goal: {viewingUserProfile.primary_goal?.replace(/_/g, ' ')} • 
                  {viewingUserProfile.available_days?.length} training days/week
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!viewingUserEmail && !isAdmin && !isPremium && (
        <div className="mb-3">
          <Card className="bg-gradient-to-r from-amber-50 to-[#FCE8EC] border-[#F5B3BE] cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowFeaturesOverview(true)}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#5A0712]">View upgrade benefits</p>
                <Button 
                  size="sm"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFeaturesOverview(true);
                  }}
                >
                  Learn More
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">
            {viewingUserEmail ? "User's Workouts" : "My Workouts"}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-500">{format(weekStart, 'MMM d')}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setWeekOffset(prev => prev - 1);
                  setSwapMode(false);
                  setEditMode(false);
                }}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium text-slate-600 min-w-[70px] text-center">
                {weekOffset === 0 ? "This Week" : weekOffset > 0 ? `+${weekOffset}w` : `${weekOffset}w`}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setWeekOffset(prev => prev + 1);
                  setSwapMode(false);
                  setEditMode(false);
                }}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              {weekOffset !== 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setWeekOffset(0);
                    setSwapMode(false);
                    setEditMode(false);
                  }}
                  className="h-7 text-xs text-[#C8102E] hover:text-[#800A1E]"
                >
                  Today
                </Button>
              )}
              </div>
              </div>
          {(canModify || (!viewingUserEmail && isCurrentWeek && schedule)) && (
            <div className="flex gap-2">
              <Button
                    onClick={() => {
                      if (canModify) {
                        navigate(createPageUrl("MyWorkouts"));
                      } else {
                        handlePremiumFeatureClick("Create Workouts");
                      }
                    }}
                    variant="outline"
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    {!canModify && <Lock className="w-4 h-4 mr-2" />}
                    {canModify && <Dumbbell className="w-4 h-4 mr-2" />}
                    Create Workouts
                  </Button>
                  <Button
                    onClick={() => {
                      if (canModify) {
                        setEditMode(!editMode);
                        setSwapMode(false);
                        setFirstSwapDay(null);
                      } else {
                        handlePremiumFeatureClick("Add/Remove Workouts");
                      }
                    }}
                    variant={editMode ? "default" : "outline"}
                    className={editMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-blue-300 text-blue-600 hover:bg-blue-50"}
                    disabled={!schedule}
                    >
                    {!canModify && <Lock className="w-4 h-4 mr-2" />}
                    {canModify && <Plus className="w-4 h-4 mr-2" />}
                    {editMode ? "Done" : "Add/Remove Workouts"}
                    </Button>
              <Button
                onClick={() => {
                  if (canModify) {
                    setSwapMode(!swapMode);
                    setEditMode(false);
                    setFirstSwapDay(null);
                  } else {
                    handlePremiumFeatureClick("Move Workout");
                  }
                }}
                variant={swapMode ? "default" : "outline"}
                className={swapMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-blue-300 text-blue-600 hover:bg-blue-50"}
                disabled={!schedule}
              >
                {!canModify && <Lock className="w-4 h-4 mr-2" />}
                {canModify && <ArrowLeftRight className="w-4 h-4 mr-2" />}
                {swapMode ? "Cancel Move" : "Move Workout"}
              </Button>
            </div>
          )}
        </div>

        {swapMode && canModify && (
          <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900">
              {firstSwapDay ? `Click day to swap with ${firstSwapDay}` : "Click a day to move"}
            </p>
          </div>
        )}

        {editMode && canModify && (
          <div className="mb-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-xs text-purple-900">Click any day to add/change workout</p>
          </div>
        )}

        {!isCurrentWeek && schedule && (
          <div className="mb-2 p-2 bg-slate-100 border border-slate-300 rounded-lg">
            <p className="text-xs text-slate-700">
              📅 Viewing {weekOffset > 0 ? 'future' : 'past'} week
            </p>
          </div>
        )}

        {!schedule || !schedule.workouts || schedule.workouts.length === 0 ? (
          <Card className="p-12 text-center">
            <Dumbbell className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h2 className="text-2xl font-bold mb-2">No Schedule Yet</h2>
            <p className="text-slate-600 mb-6">
              {viewingUserEmail 
                ? "This user hasn't generated a schedule yet" 
                : "Update your profile in the questionnaire to generate your schedule"}
            </p>
            {!viewingUserEmail && (
              <Button
                onClick={() => navigate(createPageUrl("Questionnaire"))}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Go to Questionnaire
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-2">
            {dayNames.map((day, index) => {
              const workout = schedule.workouts.find(w => w.day.toLowerCase() === day);
              const date = addDays(weekStart, index);
              const isToday = format(new Date(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
              const isFirstSwapSelection = firstSwapDay?.toLowerCase() === day.toLowerCase();

              return (
                <Card
                  key={day}
                  onClick={() => handleDayClick(day, workout)}
                  className={`p-2 transition-all ${
                    ((workout && !swapMode && !editMode && !viewingUserEmail && isCurrentWeek) || (swapMode && canModify) || (editMode && canModify)) ? 'cursor-pointer hover:shadow-md' : ''
                  } ${
                    workout 
                      ? 'bg-gradient-to-br from-white to-orange-50 border-[#F5B3BE]' 
                      : 'bg-slate-50'
                  } ${
                    isToday ? 'ring-2 ring-[#C8102E]' : ''
                  } ${
                    isFirstSwapSelection ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  } ${
                    !canModify && !workout ? 'cursor-default' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-center w-12">
                        <p className="text-[10px] font-medium text-slate-500 uppercase">{day.slice(0, 3)}</p>
                        <p className={`text-lg font-bold ${isToday ? 'text-[#C8102E]' : 'text-slate-900'}`}>
                          {format(date, 'd')}
                        </p>
                      </div>

                      {workout ? (
                        <div className="flex items-center gap-3">
                          <Dumbbell className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm text-slate-900">{workout.workout_name}</p>
                            <p className="text-xs text-slate-500">{workout.duration_minutes} min</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">Rest Day</p>
                      )}
                    </div>

                    {editMode && canModify && workout && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveWorkout(day);
                        }}
                        className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}

            {/* Freestyle Workout Button */}
            {!viewingUserEmail && isCurrentWeek && !swapMode && !editMode && (
              <Button
                onClick={() => navigate(createPageUrl("FreestyleSetup"))}
                className="w-full mt-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
              >
                <Dumbbell className="w-4 h-4 mr-2" />
                Freestyle Workout
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={showWorkoutPicker} onOpenChange={setShowWorkoutPicker}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Choose Workout for {editingDay && editingDay.charAt(0).toUpperCase() + editingDay.slice(1)}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-3">
              {availableTemplates?.length > 0 ? (
                availableTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:shadow-lg transition-all border-slate-200 hover:border-orange-300"
                    onClick={() => handleAddWorkout(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-slate-900 mb-1">
                            {template.name}
                          </h3>
                          {template.description && (
                            <p className="text-sm text-slate-600 mb-2">{template.description}</p>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            {template.muscle_group && (
                              <Badge className="bg-[#F5B3BE] text-[#5A0712]">
                                {template.muscle_group}
                              </Badge>
                            )}
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              {template.duration_minutes} min
                            </Badge>
                            <Badge variant="outline">
                              <Dumbbell className="w-3 h-3 mr-1" />
                              {template.exercises?.length || 0} exercises
                            </Badge>
                          </div>
                        </div>
                        <Button size="sm" className="ml-4">
                          Select
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>No workout templates available for your goal.</p>
                  <p className="text-sm mt-2">Contact your admin to add workout templates.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
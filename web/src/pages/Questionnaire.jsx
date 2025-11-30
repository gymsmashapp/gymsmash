import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Target, Calendar, Dumbbell, Users, Cake, TrendingUp, Activity, Clock, Heart, User } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { startOfWeek, format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

const genderOptions = [
  { value: "male", title: "Male", icon: Users },
  { value: "female", title: "Female", icon: Users },
];

const ageOptions = [
  { value: "under_25", title: "Under 25" },
  { value: "26-35", title: "26-35" },
  { value: "36-45", title: "36-45" },
  { value: "46-55", title: "46-55" },
  { value: "56+", title: "56+" },
];

const experienceLevelOptions = [
  { 
    value: "beginner", 
    title: "Just Starting Out", 
    description: "New to working out or returning after a long break",
    icon: Activity 
  },
  { 
    value: "intermediate", 
    title: "Getting Stronger", 
    description: "Work out regularly and know the basics",
    icon: TrendingUp 
  },
  { 
    value: "advanced", 
    title: "Experienced Athlete", 
    description: "Train consistently with proper form and technique",
    icon: Dumbbell 
  },
];

const bodyTypeOptions = [
  { value: "slim", title: "Slim", description: "Naturally lean build", icon: Activity },
  { value: "average", title: "Average", description: "Balanced body composition", icon: Activity },
  { value: "athletic", title: "Athletic", description: "Muscular with low body fat", icon: Dumbbell },
  { value: "heavy", title: "Could Lose A Little", description: "Looking to shed some weight", icon: Activity },
];

const targetZoneOptions = [
  { value: "arms", title: "Arms", icon: Dumbbell },
  { value: "chest", title: "Chest", icon: Dumbbell },
  { value: "abs", title: "Abs", icon: Target },
  { value: "legs", title: "Legs", icon: Dumbbell },
  { value: "glutes", title: "Glutes", icon: Target },
  { value: "back", title: "Back", icon: Dumbbell },
  { value: "shoulders", title: "Shoulders", icon: Dumbbell },
];

const goalOptions = [
  { value: "tone_body", title: "Fitness and Body Conditioning", description: "Get fit, toned and reduce injury risk", icon: Target },
  { value: "build_muscle", title: "Build Muscle Mass", description: "Increase strength and muscle size", icon: Dumbbell },
];

const equipmentOptions = [
  { value: "full_gym", title: "I have gym access", description: "Full equipment available", icon: Dumbbell },
  { value: "bodyweight_only", title: "Home workouts only", description: "No equipment needed", icon: Activity },
];

const allDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const dayLabels = {
  monday: "Mon",
  tuesday: "Tue", 
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun"
};

const TOTAL_STEPS = 9;

export default function QuestionnairePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showBeforePhoto, setShowBeforePhoto] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    gender: "",
    age_range: "",
    experience_level: "",
    body_type: "",
    target_zone: [],
    primary_goal: "",
    available_days: [],
    preferred_coach_id: "",
    equipment_access: "",
    workout_duration_preference: "",
  });

  useEffect(() => {
    const loadUser = async () => {
      const stateUser = location.state?.user;
      const currentUser = stateUser || await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, [location.state]);

  const { data: coaches } = useQuery({
    queryKey: ['coaches'],
    queryFn: () => base44.entities.Coach.filter({ is_active: true }, 'name'),
  });

  const MAX_TRAINING_DAYS = 7;

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => setCurrentStep(prev => prev - 1);

  const handleOptionSelect = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Steps 5, 6, 7 require manual 'Continue'. All other steps auto-advance.
    if (currentStep !== 5 && currentStep !== 6 && currentStep !== 7 && currentStep !== 8) {
      setTimeout(handleNext, 300);
    }
  };

  const toggleTargetZone = (zone) => {
    setFormData(prev => {
      const currentZones = prev.target_zone;
      const newZones = currentZones.includes(zone)
        ? currentZones.filter(z => z !== zone)
        : [...currentZones, zone];
      
      return { ...prev, target_zone: newZones };
    });
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        } 
      });
      setStream(mediaStream);
      setIsTakingPhoto(true);
      
      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current && mediaStream) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err);
          });
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. You can add transformation photos later from your profile.');
      finishQuestionnaire();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;
    
    const ctx = canvas.getContext('2d');
    
    // Draw the current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedPhoto(blob);
        setIsTakingPhoto(false);
        
        // Stop camera stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      } else {
        alert('Failed to capture photo. Please try again.');
      }
    }, 'image/jpeg', 0.9);
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const uploadBeforePhoto = async () => {
    if (!capturedPhoto) return;
    
    setIsUploadingPhoto(true);
    try {
      const canvas = document.createElement('canvas');
      const img = new Image();
      const blob = capturedPhoto;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });

      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const logo = new Image();
      logo.crossOrigin = 'anonymous';
      logo.src = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f13f7b260d533d2884a168/1af041014_gym_smash_rgb200_16_46_250x250-banner-white.png';
      
      await new Promise((resolve, reject) => {
        logo.onload = resolve;
        logo.onerror = reject;
      });

      const logoHeight = canvas.height * 0.05;
      const logoWidth = (logo.naturalWidth / logo.naturalHeight) * logoHeight;
      const logoX = (canvas.width - logoWidth) / 2;
      const logoY = canvas.height * 0.6;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
      ctx.globalAlpha = 1.0;

      const finalBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      const file = new File([finalBlob], `before-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await base44.auth.updateMe({
        before_photo_url: file_url,
        before_photo_date: format(new Date(), 'yyyy-MM-dd')
      });

      finishQuestionnaire();
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error uploading photo. Continuing anyway.');
      finishQuestionnaire();
    }
  };

  const finishQuestionnaire = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get('userProfileId');
    navigate(createPageUrl(`Dashboard${profileId ? `?userProfileId=${profileId}` : ''}`));
  };

  const handleSubmit = async () => {
    setIsGenerating(true);
    let userProfileSaved = false;
    let profileId = null;

    try {
      const currentUser = user || await base44.auth.me();
      
      const existing = await base44.entities.UserProfile.filter({ user_email: currentUser.email });
      
      try {
        let profileResult;
        const profileData = {
          ...formData,
          user_email: currentUser.email,
          current_rotation_cycle: 0,
          last_rotation_date: format(new Date(), 'yyyy-MM-dd'),
          declined_current_rotation: false
        };

        if (existing.length > 0) {
          const preservedData = {
            current_rotation_cycle: existing[0].current_rotation_cycle || 0,
            last_rotation_date: existing[0].last_rotation_date || format(new Date(), 'yyyy-MM-dd'),
            declined_current_rotation: false
          };
          
          profileResult = await base44.entities.UserProfile.update(existing[0].id, {
            ...profileData,
            ...preservedData
          });
          profileId = existing[0].id;
        } else {
          profileResult = await base44.entities.UserProfile.create(profileData);
          profileId = profileResult.id;
          
          // Grant 7-day free trial for new users
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 7);
          
          await base44.auth.updateMe({
            subscription_tier: 'premium',
            trial_end_date: trialEndDate.toISOString().split('T')[0]
          });
        }
        userProfileSaved = true;
      } catch (profileError) {
        console.error("Error saving user profile:", profileError);
        alert("Error saving your profile: " + profileError.message);
        setIsGenerating(false);
        return;
      }

      try {
        await generateSchedule(currentUser.email);
        
        // Force sync exercises to apply video preferences
        try {
          await base44.functions.invoke('syncExercisesToSchedules');
          console.log('✅ Exercise videos synced successfully');
        } catch (syncError) {
          console.error('Sync error:', syncError);
          // Don't fail the whole flow if sync fails
        }
      } catch (scheduleError) {
        console.error("Error generating schedule:", scheduleError);
        alert("Profile saved, but error generating schedule: " + scheduleError.message + ". You can try regenerating from the Dashboard.");
      }
      
      setIsGenerating(false);
      setShowBeforePhoto(true);
    } catch (error) {
      console.error("Authentication or other unexpected error during questionnaire submission:", error);
      if (!userProfileSaved) {
        alert("An unexpected error occurred: " + error.message);
      }
      setIsGenerating(false);
    }
  };

  const generateSchedule = async (userEmail) => {
    try {
      let allTemplates = await base44.entities.WorkoutTemplate.filter({
        target_goal: formData.primary_goal,
        equipment_needed: formData.equipment_access,
        is_active: true
      });

      if (allTemplates.length === 0) {
        allTemplates = await base44.entities.WorkoutTemplate.filter({
          target_goal: formData.primary_goal,
          is_active: true
        });
      }

      if (allTemplates.length === 0) {
        allTemplates = await base44.entities.WorkoutTemplate.filter({
          is_active: true
        });
      }

      if (allTemplates.length === 0) {
        throw new Error("No workout templates available. Please contact your admin to add workout templates through the Manage Workouts page.");
      }

      const currentCycle = 0;
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

      const availableTemplates = [];

      Object.keys(templateGroups).forEach(groupName => {
        const group = templateGroups[groupName];
        if (group.length > 0) {
          const versionIndex = currentCycle % group.length;
          const selectedTemplate = group[versionIndex];
          if (selectedTemplate) {
            availableTemplates.push(selectedTemplate);
          }
        }
      });

      availableTemplates.push(...ungroupedTemplates);

      if (availableTemplates.length === 0) {
        throw new Error("No suitable templates found for your settings.");
      }

      const workouts = [];
      const usedTemplates = new Set();
      const zoneToMuscleGroup = {
        'arms': 'Arms',
        'chest': 'Chest',
        'abs': 'Abs',
        'legs': 'Legs',
        'glutes': 'Glutes',
        'back': 'Back',
        'shoulders': 'Shoulders'
      };

      // Smart zone assignment with conflict avoidance
      const targetZones = [...formData.target_zone];
      const dayIndexMap = {};
      formData.available_days.forEach((day) => {
        dayIndexMap[day] = allDays.indexOf(day);
      });

      const assignedZones = new Map();
      
      // Helper to check if a zone conflicts with nearby days
      const hasNearbyConflict = (currentDayIndex, zone) => {
        const conflictPairs = [
          ['arms', 'chest'],
          ['arms', 'back']
        ];
        
        for (const [assignedDay, assignedZone] of assignedZones.entries()) {
          const assignedDayIndex = dayIndexMap[assignedDay];
          const dayDiff = Math.abs(assignedDayIndex - currentDayIndex);
          
          // Check if zones conflict and are within 2 days
          if (dayDiff > 0 && dayDiff < 3) {
            for (const [z1, z2] of conflictPairs) {
              if ((zone === z1 && assignedZone === z2) || (zone === z2 && assignedZone === z1)) {
                return true;
              }
            }
          }
        }
        return false;
      };

      // Assign zones to days with conflict avoidance
      formData.available_days.forEach((day, index) => {
        const dayIndex = dayIndexMap[day];
        let assignedZone = null;
        
        // Try to find a zone without conflicts
        for (const zone of targetZones) {
          if (!hasNearbyConflict(dayIndex, zone)) {
            assignedZone = zone;
            break;
          }
        }
        
        // If all zones have conflicts, just assign the next one
        if (!assignedZone && targetZones.length > 0) {
          assignedZone = targetZones[index % targetZones.length];
        }
        
        if (assignedZone) {
          assignedZones.set(day, assignedZone);
        }
      });

      // Build workouts based on assigned zones
      formData.available_days.forEach((day) => {
        let template = null;
        const assignedZone = assignedZones.get(day);
        
        if (assignedZone) {
          const targetMuscleGroup = zoneToMuscleGroup[assignedZone];
          template = availableTemplates.find(t => 
            t.muscle_group === targetMuscleGroup && !usedTemplates.has(t.id)
          );
        }

        // If no zone-specific template found or already used, pick any available
        if (!template) {
          template = availableTemplates.find(t => !usedTemplates.has(t.id));
        }

        // If all templates used, reset and reuse the first one
        if (!template && availableTemplates.length > 0) {
          usedTemplates.clear();
          template = availableTemplates[0];
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

      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      
      const existingSchedule = await base44.entities.WorkoutSchedule.filter({
        user_email: userEmail,
        week_start_date: weekStart
      });

      if (existingSchedule.length > 0) {
        await base44.entities.WorkoutSchedule.update(existingSchedule[0].id, { workouts });
      } else {
        await base44.entities.WorkoutSchedule.create({
          user_email: userEmail,
          week_start_date: weekStart,
          workouts
        });
      }
    } catch (error) {
      console.error("Error within generateSchedule:", error);
      throw error;
    }
  };

  const canProgress = () => {
    switch(currentStep) {
      case 1: return !!formData.gender;
      case 2: return !!formData.age_range;
      case 3: return !!formData.experience_level;
      case 4: return !!formData.body_type;
      case 5: return !!formData.primary_goal;
      case 6: return formData.target_zone.length > 0;
      case 7: 
        return formData.available_days.length > 0 && 
               formData.available_days.length <= MAX_TRAINING_DAYS;
      case 8: return !!formData.preferred_coach_id;
      case 9: return !!formData.equipment_access;
      default: return false;
    }
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 border-4 border-orange-500 rounded-full animate-ping opacity-20" />
            <div className="absolute inset-0 border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            <Dumbbell className="w-10 h-10 text-orange-500 absolute inset-0 m-auto" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Generating Your Workout</h2>
          <p className="text-slate-400">Creating your personalised plan...</p>
        </div>
      </div>
    );
  }

  if (showBeforePhoto && !isTakingPhoto && !capturedPhoto) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <Card className="border-none shadow-2xl max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Transformation Photos</CardTitle>
            <p className="text-slate-600 mt-2">
              Capture your starting point to track your transformation (Recommended)
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                💪 Transformation photos help you see changes that the scale might not show. 
                This photo will be saved privately to your account with the Gym Smash watermark.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={finishQuestionnaire}
                className="flex-1"
              >
                Skip for Now
              </Button>
              <Button
                onClick={startCamera}
                className="flex-1 bg-gradient-to-r from-[#C8102E] to-[#A00D25] hover:from-orange-600 hover:to-orange-700 text-white"
              >
                Take Photo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isTakingPhoto || capturedPhoto) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <Card className="border-none shadow-2xl max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
              {capturedPhoto ? 'Review Your Photo' : 'Transformation Photo'}
            </CardTitle>
            <p className="text-slate-600 mt-2">
              {capturedPhoto ? 'Happy with this photo?' : 'Position yourself in front of a mirror'}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-[3/4] max-h-[60vh] mx-auto">
              {!capturedPhoto ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={URL.createObjectURL(capturedPhoto)}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            <div className="flex gap-3">
              {!capturedPhoto ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (stream) {
                        stream.getTracks().forEach(track => track.stop());
                      }
                      setShowBeforePhoto(false);
                      finishQuestionnaire();
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={capturePhoto}
                    className="flex-1 bg-gradient-to-r from-[#C8102E] to-[#A00D25] hover:from-orange-600 hover:to-orange-700 text-white"
                  >
                    Capture Photo
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={retakePhoto}
                    className="flex-1"
                  >
                    Retake
                  </Button>
                  <Button
                    onClick={uploadBeforePhoto}
                    disabled={isUploadingPhoto}
                    className="flex-1 bg-gradient-to-r from-[#C8102E] to-[#A00D25] hover:from-orange-600 hover:to-orange-700 text-white"
                  >
                    {isUploadingPhoto ? 'Saving...' : 'Save Photo'}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-full max-w-2xl"
        >
          <Card className="border-none shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-500">Question {currentStep} of {TOTAL_STEPS}</span>
                <div className="flex gap-1">
                  {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i < currentStep ? 'w-8 bg-[#C8102E]' : 'w-8 bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">
                {currentStep === 1 && "Let's start with the basics"}
                {currentStep === 2 && "How old are you?"}
                {currentStep === 3 && "What's your experience level?"}
                {currentStep === 4 && "What's your current body type?"}
                {currentStep === 5 && "What's your main fitness goal?"}
                {currentStep === 6 && "Which areas do you want to focus on?"}
                {currentStep === 7 && "Pick your training days"}
                {currentStep === 8 && "Choose your coach"}
                {currentStep === 9 && "Where will you be training?"}
              </CardTitle>
              {currentStep === 1 && (
                <p className="text-slate-600 mt-2">
                  This helps us personalise your workout plan
                </p>
              )}
              {currentStep === 2 && (
                <p className="text-slate-600 mt-2">
                  We'll adjust exercises based on your age group
                </p>
              )}
              {currentStep === 3 && (
                <p className="text-slate-600 mt-2">
                  Be honest - we'll match the intensity to your level
                </p>
              )}
              {currentStep === 4 && (
                <p className="text-slate-600 mt-2">
                  This helps us set realistic expectations and goals
                </p>
              )}
              {currentStep === 5 && (
                <p className="text-slate-600 mt-2">
                  Choose what matters most to you right now
                </p>
              )}
              {currentStep === 6 && (
                <p className="text-slate-600 mt-2">
                  Select all areas you'd like to work on
                </p>
              )}
              {currentStep === 7 && (
                <p className="text-slate-600 mt-2">
                  Select up to {MAX_TRAINING_DAYS} training days per week
                </p>
              )}
              {currentStep === 8 && (
                <p className="text-slate-600 mt-2">
                  Pick your preferred coach for exercise demonstrations
                </p>
              )}
              {currentStep === 9 && (
                <p className="text-slate-600 mt-2">
                  We'll match exercises to your equipment
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              
              {currentStep === 1 && (
                <div className="space-y-3">
                  {genderOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleOptionSelect('gender', opt.value)}
                      className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                        formData.gender === opt.value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          formData.gender === opt.value ? 'bg-[#C8102E]' : 'bg-slate-100'
                        }`}>
                          <opt.icon className={`w-6 h-6 ${
                            formData.gender === opt.value ? 'text-white' : 'text-slate-600'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{opt.title}</h3>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {currentStep === 2 && (
                <div className="grid grid-cols-2 gap-3">
                  {ageOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleOptionSelect('age_range', opt.value)}
                      className={`p-6 rounded-xl border-2 transition-all text-center ${
                        formData.age_range === opt.value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Cake className={`w-8 h-8 mx-auto mb-2 ${
                        formData.age_range === opt.value ? 'text-orange-600' : 'text-slate-600'
                      }`} />
                      <h3 className="font-semibold text-lg">{opt.title}</h3>
                    </button>
                  ))}
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-3">
                  {experienceLevelOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleOptionSelect('experience_level', opt.value)}
                      className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                        formData.experience_level === opt.value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          formData.experience_level === opt.value ? 'bg-[#C8102E]' : 'bg-slate-100'
                        }`}>
                          <opt.icon className={`w-6 h-6 ${
                            formData.experience_level === opt.value ? 'text-white' : 'text-slate-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{opt.title}</h3>
                          <p className="text-sm text-slate-600">{opt.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-3">
                  {bodyTypeOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleOptionSelect('body_type', opt.value)}
                      className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                        formData.body_type === opt.value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          formData.body_type === opt.value ? 'bg-[#C8102E]' : 'bg-slate-100'
                        }`}>
                          <opt.icon className={`w-6 h-6 ${
                            formData.body_type === opt.value ? 'text-white' : 'text-slate-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{opt.title}</h3>
                          <p className="text-sm text-slate-600">{opt.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-3">
                  {goalOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleOptionSelect('primary_goal', opt.value)}
                      className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                        formData.primary_goal === opt.value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          formData.primary_goal === opt.value ? 'bg-[#C8102E]' : 'bg-slate-100'
                        }`}>
                          <opt.icon className={`w-6 h-6 ${
                            formData.primary_goal === opt.value ? 'text-white' : 'text-slate-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{opt.title}</h3>
                          <p className="text-sm text-slate-600">{opt.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {currentStep === 6 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {targetZoneOptions.map((opt) => {
                      const isSelected = formData.target_zone.includes(opt.value);
                      
                      return (
                        <button
                          key={opt.value}
                          onClick={() => toggleTargetZone(opt.value)}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <opt.icon className={`w-6 h-6 mx-auto mb-2 ${
                            isSelected ? 'text-orange-600' : 'text-slate-600'
                          }`} />
                          <p className="font-medium text-center">{opt.title}</p>
                          {isSelected && (
                            <p className="text-xs text-orange-600 mt-1 text-center">✓ Selected</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentStep === 7 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    {allDays.map((day) => {
                      const isSelected = formData.available_days.includes(day);
                      const canSelect = isSelected || formData.available_days.length < MAX_TRAINING_DAYS;
                      
                      return (
                        <button
                          key={day}
                          onClick={() => {
                            if (!canSelect && !isSelected) return;
                            const newDays = isSelected
                              ? formData.available_days.filter(d => d !== day)
                              : [...formData.available_days, day];
                            setFormData(prev => ({ ...prev, available_days: newDays }));
                          }}
                          disabled={!canSelect && !isSelected}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50'
                              : canSelect
                              ? 'border-slate-200 hover:border-slate-300'
                              : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <Calendar className={`w-5 h-5 mx-auto mb-2 ${
                            isSelected ? 'text-orange-600' : 'text-slate-600'
                          }`} />
                          <p className="font-medium text-sm">{dayLabels[day]}</p>
                          {isSelected && (
                            <p className="text-xs text-orange-600 mt-1">✓</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentStep === 8 && (
                <div className="space-y-3">
                  {coaches?.map(coach => {
                    const getYouTubeVideoId = (url) => {
                      if (!url) return null;
                      const cleanUrl = url.trim();
                      let videoId = null;
                      const shortsMatch = cleanUrl.match(/(?:youtube\.com|youtu\.be)\/shorts\/([a-zA-Z0-9_-]{11})/);
                      if (shortsMatch) videoId = shortsMatch[1];
                      if (!videoId) {
                        const watchMatch = cleanUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
                        if (watchMatch) videoId = watchMatch[1];
                      }
                      if (!videoId) {
                        const shortLinkMatch = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
                        if (shortLinkMatch) videoId = shortLinkMatch[1];
                      }
                      return videoId && videoId.length === 11 ? videoId : null;
                    };

                    return (
                      <button
                        key={coach.id}
                        onClick={() => handleOptionSelect('preferred_coach_id', coach.id)}
                        className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                          formData.preferred_coach_id === coach.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              formData.preferred_coach_id === coach.id ? 'bg-[#C8102E]' : 'bg-slate-100'
                            }`}>
                              <User className={`w-8 h-8 ${
                                formData.preferred_coach_id === coach.id ? 'text-white' : 'text-slate-600'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">{coach.name}</h3>
                              {coach.specialty && (
                                <p className="text-sm text-orange-600 mb-1">{coach.specialty}</p>
                              )}
                              {coach.bio && (
                                <p className="text-sm text-slate-600 line-clamp-2">{coach.bio}</p>
                              )}
                            </div>
                          </div>

                          {coach.demo_video_url && getYouTubeVideoId(coach.demo_video_url) && (
                            <div className="relative rounded-lg overflow-hidden aspect-video" onClick={(e) => e.stopPropagation()}>
                              <iframe
                                src={`https://www.youtube.com/embed/${getYouTubeVideoId(coach.demo_video_url)}`}
                                className="w-full h-full rounded-lg"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {currentStep === 9 && (
                <div className="space-y-3">
                  {equipmentOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleOptionSelect('equipment_access', opt.value)}
                      className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                        formData.equipment_access === opt.value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          formData.equipment_access === opt.value ? 'bg-[#C8102E]' : 'bg-slate-100'
                        }`}>
                          <opt.icon className={`w-6 h-6 ${
                            formData.equipment_access === opt.value ? 'text-white' : 'text-slate-600'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">{opt.title}</h3>
                          <p className="text-sm text-slate-600">{opt.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                {currentStep > 1 && (
                  <Button variant="outline" onClick={handleBack} className="flex-1">
                    Back
                  </Button>
                )}
                {currentStep === TOTAL_STEPS && (
                  <Button
                    onClick={handleNext}
                    disabled={!canProgress()}
                    className="flex-1 bg-gradient-to-r from-[#C8102E] to-[#A00D25] hover:from-orange-600 hover:to-orange-700 text-white"
                  >
                    Generate Workout
                  </Button>
                )}
                {(currentStep === 5 || currentStep === 6 || currentStep === 7 || currentStep === 8) && (
                  <Button
                    onClick={handleNext}
                    disabled={!canProgress()}
                    className="flex-1 bg-gradient-to-r from-[#C8102E] to-[#A00D25] hover:from-orange-600 hover:to-orange-700 text-white"
                  >
                    Continue
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
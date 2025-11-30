import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Play, CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ExerciseStages from "../components/workout/ExerciseStages";
import ActiveExercise from "../components/workout/ActiveExercise";
import ExerciseComplete from "../components/workout/ExerciseComplete";
import WorkoutComplete from "../components/workout/WorkoutComplete";
import AchievementUnlocked from "../components/achievements/AchievementUnlocked";

export default function WorkoutSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const initialWorkout = location.state?.workout;

  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  const [sessionState, setSessionState] = useState("overview");
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(null);
  const [currentSet, setCurrentSet] = useState(1);
  const [currentWeight, setCurrentWeight] = useState(0);
  const [finalWeight, setFinalWeight] = useState(0);
  const [completedExercises, setCompletedExercises] = useState(new Set());
  const [exerciseData, setExerciseData] = useState([]);
  const [exerciseSettings, setExerciseSettings] = useState({});
  
  const [exerciseVideos, setExerciseVideos] = useState({});
  const [lastRecordedVideoUrl, setLastRecordedVideoUrl] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [isRecordingExercise, setIsRecordingExercise] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  
  const [startTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAchievement, setShowAchievement] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState(null);
  const [achievementQueue, setAchievementQueue] = useState([]);
  const [workoutSummaryData, setWorkoutSummaryData] = useState(null);
  const [countdownValue, setCountdownValue] = useState(10);
  const [restTimeLeft, setRestTimeLeft] = useState(60);

  // Fetch user
  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsPremium(currentUser?.subscription_tier === 'premium');
      setIsAdmin(currentUser?.role === 'admin');
    };
    loadUser();
  }, []);

  // Fetch latest workout from schedule
  const { data: latestWorkout } = useQuery({
    queryKey: ['current-workout', user?.email, initialWorkout?.day, initialWorkout?.workout_name],
    queryFn: async () => {
      if (!user?.email || !initialWorkout) return initialWorkout;
      const schedules = await base44.entities.WorkoutSchedule.filter({
        user_email: user.email
      }, '-updated_date', 1);
      if (schedules.length > 0 && schedules[0].workouts) {
        const matchingWorkout = schedules[0].workouts.find(w => 
          w.day === initialWorkout.day && w.workout_name === initialWorkout.workout_name
        );
        if (matchingWorkout) return matchingWorkout;
      }
      return initialWorkout;
    },
    enabled: !!user?.email && !!initialWorkout,
  });

  const workout = latestWorkout || initialWorkout;

  // Fetch user profile for preferred coach
  const { data: userProfileData } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
      return profiles.length > 0 ? profiles[0] : null;
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (userProfileData) setUserProfile(userProfileData);
  }, [userProfileData]);

  // Fetch previous logs for weight lookup
  const { data: previousLogs = [] } = useQuery({
    queryKey: ['previous-weights', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.WorkoutLog.filter({ user_email: user.email }, '-date', 50);
    },
    enabled: !!user?.email,
  });

  // Initialize exercise data
  useEffect(() => {
    if (workout) {
      setExerciseData(workout.exercises.map(e => ({
        exercise_name: e.name,
        exercise_code: e.exercise_code,
        sets_completed: 0,
        target_sets: e.sets,
        reps_completed: 0,
        weight_kg: 0,
      })));
    }
  }, [workout]);

  const getLastWeight = (exerciseName, exerciseCode) => {
    if (!previousLogs?.length) return 0;
    if (exerciseCode) {
      for (const log of previousLogs) {
        const exercise = log.exercises_completed?.find(e => e.exercise_code === exerciseCode);
        if (exercise?.weight_kg > 0) return exercise.weight_kg;
      }
    }
    const normalize = (name) => name?.replace(/^(Chest|Back|Arms|Legs|Shoulders|Abs|Glutes)\s*-\s*/i, '').toLowerCase().trim() || '';
    const normalizedSearch = normalize(exerciseName);
    for (const log of previousLogs) {
      const exercise = log.exercises_completed?.find(e => normalize(e.exercise_name) === normalizedSearch);
      if (exercise?.weight_kg > 0) return exercise.weight_kg;
    }
    return 0;
  };

  const getExerciseVideoUrl = (exercise) => {
    if (!exercise) return null;
    if (userProfile?.preferred_coach_id && exercise.coach_videos?.length > 0) {
      const coachVideo = exercise.coach_videos.find(cv => cv.coach_id === userProfile.preferred_coach_id);
      if (coachVideo?.video_url) return coachVideo.video_url;
    }
    return exercise.video_url || null;
  };

  // Camera functions
  const startCameraPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: false
      });
      setCameraStream(stream);
    } catch (error) {
      console.error("Camera error:", error);
      alert("Camera access denied");
    }
  };

  const startRecording = () => {
    if (!cameraStream) return;
    let mimeType = 'video/webm;codecs=vp8';
    if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
    
    const mediaRecorder = new MediaRecorder(cameraStream, { mimeType, videoBitsPerSecond: 500000 });
    chunksRef.current = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size === 0) return;
      
      try {
        const file = new File([blob], `exercise-${currentExerciseIndex}-${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`, { type: mimeType });
        const result = await base44.integrations.Core.UploadFile({ file });
        if (result?.file_url) {
          setExerciseVideos(prev => ({ ...prev, [currentExerciseIndex]: result.file_url }));
          setLastRecordedVideoUrl(result.file_url);
        }
      } catch (error) {
        console.error("Upload error:", error);
      }
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecordingExercise(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    setIsRecordingExercise(false);
  };

  const stopCamera = () => {
    stopRecording();
    cameraStream?.getTracks().forEach(track => track.stop());
    setCameraStream(null);
  };

  // Exercise handlers
  const handleStartExercise = (index) => {
    const exercise = workout.exercises[index];
    const lastWeight = getLastWeight(exercise.name, exercise.exercise_code);
    setCurrentExerciseIndex(index);
    setCurrentSet(1);
    setCurrentWeight(lastWeight);
    setSessionState("stages");
  };

  const handleStagesComplete = async (settings) => {
    setExerciseSettings(settings);
    setCountdownValue(10);
    // Always start camera - for recording or mirror mode
    await startCameraPreview();
    setSessionState("countdown");
  };
  
  // Countdown timer effect
  useEffect(() => {
    if (sessionState !== "countdown") return;
    
    if (countdownValue <= 0) {
      if (exerciseSettings.wantsToRecord && cameraStream) {
        startRecording();
      }
      setSessionState("exercising");
      return;
    }
    
    const timer = setTimeout(() => {
      setCountdownValue(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [sessionState, countdownValue, exerciseSettings.wantsToRecord, cameraStream]);
  
  // Rest timer effect
  useEffect(() => {
    if (sessionState !== "resting") return;
    
    if (restTimeLeft <= 0) {
      if (exerciseSettings.wantsToRecord && cameraStream) {
        startRecording();
      }
      setSessionState("exercising");
      return;
    }
    
    const timer = setTimeout(() => {
      setRestTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [sessionState, restTimeLeft, exerciseSettings.wantsToRecord, cameraStream]);

  const handleSetComplete = () => {
    if (isRecordingExercise) stopRecording();
    
    const newData = [...exerciseData];
    newData[currentExerciseIndex].sets_completed += 1;
    newData[currentExerciseIndex].reps_completed = parseInt(workout.exercises[currentExerciseIndex].reps) || 10;
    newData[currentExerciseIndex].weight_kg = currentWeight;
    setExerciseData(newData);
    
    if (currentSet < workout.exercises[currentExerciseIndex].sets) {
      // Rest then next set
      setCurrentSet(prev => prev + 1);
      const restSeconds = workout.exercises[currentExerciseIndex].rest_seconds || 60;
      setRestTimeLeft(restSeconds);
      setSessionState("resting");
    } else {
      setFinalWeight(currentWeight);
      setSessionState("exerciseComplete");
    }
  };

  const handleCancelSet = () => {
    if (isRecordingExercise) stopRecording();
    setSessionState("stages");
  };

  const handleExerciseConfirm = (photoUrl) => {
    stopCamera();
    const newData = [...exerciseData];
    newData[currentExerciseIndex].weight_kg = finalWeight;
    if (photoUrl) {
      newData[currentExerciseIndex].template_url = photoUrl;
    }
    setExerciseData(newData);
    setCompletedExercises(prev => new Set([...prev, currentExerciseIndex]));
    setLastRecordedVideoUrl(null);
    setSessionState("overview");
    setCurrentExerciseIndex(null);
  };

  const handleSaveVideo = async () => {
    // Video is already saved via upload, just mark it
    return true;
  };

  const handleDeleteVideo = () => {
    setExerciseVideos(prev => {
      const newVideos = { ...prev };
      delete newVideos[currentExerciseIndex];
      return newVideos;
    });
    setLastRecordedVideoUrl(null);
  };

  const handleFinishWorkout = async () => {
    stopCamera();
    
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000 / 60);
    const totalVolume = exerciseData.reduce((sum, ex) => {
      return sum + (ex.sets_completed * (ex.reps_completed || 0) * (ex.weight_kg || 0));
    }, 0);

    if (user?.email) {
      const exercisesCompleted = exerciseData
        .filter(e => e.sets_completed > 0)
        .map((ex, idx) => {
          const exerciseIndex = workout.exercises.findIndex(e => e.name === ex.exercise_name);
          return {
            exercise_name: ex.exercise_name,
            exercise_code: ex.exercise_code,
            sets_completed: ex.sets_completed,
            reps_per_set: ex.reps_completed,
            weight_kg: ex.weight_kg || 0,
            video_url: exerciseVideos[exerciseIndex] || null,
            template_url: ex.template_url || null,
          };
        });

      await base44.entities.WorkoutLog.create({
        user_email: user.email,
        workout_name: workout.workout_name,
        muscle_group: workout.muscle_group || "",
        date: format(new Date(), 'yyyy-MM-dd'),
        duration_minutes: duration,
        exercises_completed: exercisesCompleted,
        total_volume: totalVolume
      });

      try {
        const achievementResponse = await base44.functions.invoke('checkAndAwardAchievements', {});
        if (achievementResponse.data.newAchievements?.length > 0) {
          setAchievementQueue(achievementResponse.data.newAchievements);
          setCurrentAchievement(achievementResponse.data.newAchievements[0]);
          setShowAchievement(true);
          return;
        }
      } catch (error) {
        console.error('Achievement error:', error);
      }

      setWorkoutSummaryData({
        workoutName: workout.workout_name,
        exercisesCompleted: exercisesCompleted.length,
        totalVolume,
        duration,
        date: format(new Date(), 'yyyy-MM-dd')
      });
      setSessionState("workoutComplete");
    }
  };

  const handleAchievementClose = () => {
    setShowAchievement(false);
    const remaining = achievementQueue.slice(1);
    if (remaining.length > 0) {
      setAchievementQueue(remaining);
      setCurrentAchievement(remaining[0]);
      setTimeout(() => setShowAchievement(true), 300);
    } else {
      setWorkoutSummaryData({
        workoutName: workout.workout_name,
        exercisesCompleted: exerciseData.filter(e => e.sets_completed > 0).length,
        totalVolume: exerciseData.reduce((sum, ex) => sum + (ex.sets_completed * (ex.reps_completed || 0) * (ex.weight_kg || 0)), 0),
        duration: Math.round((new Date() - startTime) / 1000 / 60),
        date: format(new Date(), 'yyyy-MM-dd')
      });
      setSessionState("workoutComplete");
    }
  };

  const handleWorkoutComplete = (photoUrl) => {
    navigate(createPageUrl("Dashboard"));
  };

  const handleBackToOverview = () => {
    stopCamera();
    setSessionState("overview");
    setCurrentExerciseIndex(null);
  };

  if (!workout) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8102E]" />
      </div>
    );
  }

  const currentExercise = currentExerciseIndex !== null ? workout.exercises[currentExerciseIndex] : null;
  const progress = (completedExercises.size / workout.exercises.length) * 100;

  // Stages view
  if (sessionState === "stages" && currentExercise) {
    return (
      <ExerciseStages
        exercise={currentExercise}
        currentWeight={currentWeight}
        setCurrentWeight={setCurrentWeight}
        videoUrl={getExerciseVideoUrl(currentExercise)}
        isPremium={isPremium}
        isAdmin={isAdmin}
        onStartExercise={handleStagesComplete}
        onCancel={handleBackToOverview}
        previousWeight={getLastWeight(currentExercise.name, currentExercise.exercise_code)}
      />
    );
  }

  // Countdown view
  if (sessionState === "countdown") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-40 h-40 mx-auto mb-6 bg-gradient-to-br from-yellow-500 to-[#C8102E] rounded-full flex items-center justify-center shadow-2xl animate-pulse">
            <span className="text-6xl font-bold text-white">{countdownValue}</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Get Ready!</h3>
          <p className="text-slate-400">Set {currentSet} of {currentExercise?.sets} starting soon</p>
        </div>
      </div>
    );
  }

  // Active exercise view
  if (sessionState === "exercising" && currentExercise) {
    return (
      <ActiveExercise
        exercise={currentExercise}
        currentSet={currentSet}
        currentWeight={currentWeight}
        wantsToRecord={exerciseSettings.wantsToRecord}
        useTimer={exerciseSettings.useTimer}
        cameraStream={cameraStream}
        isRecording={isRecordingExercise}
        onSetComplete={handleSetComplete}
        onCancel={handleCancelSet}
        videoUrl={getExerciseVideoUrl(currentExercise)}
        userProfile={userProfile}
      />
    );
  }

  // Resting view
  if (sessionState === "resting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-40 h-40 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl">
            <span className="text-5xl font-bold text-white">{restTimeLeft}</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Rest Period</h3>
          <p className="text-slate-400">Set {currentSet} coming up next</p>
        </div>
      </div>
    );
  }

  // Exercise complete view
  if (sessionState === "exerciseComplete" && currentExercise) {
    return (
      <ExerciseComplete
        exercise={currentExercise}
        exerciseData={exerciseData[currentExerciseIndex]}
        finalWeight={finalWeight}
        setFinalWeight={setFinalWeight}
        recordedVideoUrl={lastRecordedVideoUrl}
        onConfirm={handleExerciseConfirm}
        onDeleteVideo={handleDeleteVideo}
        onSaveVideo={handleSaveVideo}
        isPremium={isPremium}
        isAdmin={isAdmin}
      />
    );
  }

  // Workout complete view
  if (sessionState === "workoutComplete" && workoutSummaryData) {
    return (
      <>
        <AchievementUnlocked
          achievement={currentAchievement}
          isOpen={showAchievement}
          onClose={handleAchievementClose}
        />
        <WorkoutComplete
          workoutData={workoutSummaryData}
          exerciseData={exerciseData}
          previousLogs={previousLogs}
          isPremium={isPremium}
          isAdmin={isAdmin}
          onComplete={handleWorkoutComplete}
        />
      </>
    );
  }

  // Overview - compact exercise list
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <AchievementUnlocked
        achievement={currentAchievement}
        isOpen={showAchievement}
        onClose={handleAchievementClose}
      />

      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-1">{workout.workout_name}</h1>
          {workout.muscle_group && (
            <Badge variant="secondary" className="bg-[#C8102E]/20 text-[#E8597A]">
              {workout.muscle_group}
            </Badge>
          )}
        </div>

        <div className="mb-4">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-slate-400 text-center mt-1">
            {completedExercises.size}/{workout.exercises.length} complete
          </p>
        </div>

        <div className="space-y-2 mb-6">
          {workout.exercises.map((exercise, index) => {
            const isCompleted = completedExercises.has(index);
            const data = exerciseData[index];

            return (
              <Card
                key={index}
                className={`bg-slate-800/50 border-slate-700 ${isCompleted ? 'border-green-500/50' : ''}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500 flex-shrink-0" />
                      )}
                      <div>
                        <h3 className="font-medium text-white text-sm">{exercise.name}</h3>
                        <p className="text-xs text-slate-400">
                          {exercise.sets} × {exercise.reps}
                          {exercise.is_unilateral && ' (each side)'}
                          {isCompleted && data && ` • ${data.weight_kg}kg`}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleStartExercise(index)}
                      disabled={isCompleted}
                      size="sm"
                      className={isCompleted
                        ? "bg-green-600 text-white cursor-not-allowed"
                        : "bg-green-500 hover:bg-green-600 text-white"
                      }
                    >
                      {isCompleted ? 'Done' : (
                        <>
                          <Play className="w-3 h-3 mr-1" />
                          Start
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleFinishWorkout}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8"
          >
            {completedExercises.size === workout.exercises.length ? 'Complete Workout' : 'Finish Early'}
          </Button>
        </div>
      </div>
    </div>
  );
}
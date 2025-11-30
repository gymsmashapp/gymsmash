import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Camera, X, RotateCcw, Save, Trash2, Flame, TrendingUp, TrendingDown, Image } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

const STICKERS = {
  smashed: { emoji: '💪', title: 'Smashed It!', message: 'You crushed this workout! Weight increased from last time!', color: 'from-green-500 to-green-600' },
  strong: { emoji: '🔥', title: 'On Fire!', message: 'Great workout! You completed all exercises!', color: 'from-orange-500 to-orange-600' },
  progress: { emoji: '📈', title: 'Making Progress!', message: 'Good effort! Keep pushing and you\'ll see results!', color: 'from-blue-500 to-blue-600' },
  keepgoing: { emoji: '💫', title: 'Keep Going!', message: 'Every workout counts! You showed up and that matters!', color: 'from-purple-500 to-purple-600' },
};

export default function WorkoutComplete({
  workoutData,
  exerciseData,
  previousLogs,
  isPremium,
  isAdmin,
  onComplete,
}) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState('sticker');
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Determine which sticker to show based on performance
  const getSticker = () => {
    const completedExercises = exerciseData.filter(e => e.sets_completed > 0);
    const totalExercises = exerciseData.length;
    const completionRate = completedExercises.length / totalExercises;

    // Check if weights increased
    let weightIncreased = false;
    completedExercises.forEach(ex => {
      const prevLog = previousLogs?.find(log => 
        log.exercises_completed?.some(e => e.exercise_name === ex.exercise_name)
      );
      if (prevLog) {
        const prevEx = prevLog.exercises_completed.find(e => e.exercise_name === ex.exercise_name);
        if (prevEx && ex.weight_kg > prevEx.weight_kg) {
          weightIncreased = true;
        }
      }
    });

    if (completionRate === 1 && weightIncreased) return STICKERS.smashed;
    if (completionRate === 1) return STICKERS.strong;
    if (completionRate >= 0.5) return STICKERS.progress;
    return STICKERS.keepgoing;
  };

  const sticker = getSticker();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (error) {
      console.error('Camera error:', error);
      alert('Failed to access camera');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Load and draw logo
    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    logo.src = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f13f7b260d533d2884a168/1af041014_gym_smash_rgb200_16_46_250x250-banner-white.png';

    await new Promise((resolve) => {
      logo.onload = resolve;
      logo.onerror = resolve;
    });

    const logoHeight = canvas.height * 0.05;
    const logoWidth = (logo.naturalWidth / logo.naturalHeight) * logoHeight;
    const logoX = canvas.width - logoWidth - 40;
    const logoY = 40;
    ctx.globalAlpha = 0.8;
    ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
    ctx.globalAlpha = 1.0;

    // Workout stats overlay
    const leftPadding = 40;
    const topStart = canvas.height * 0.15;
    const statGap = 150;

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#C8102E';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 20;

    ctx.font = 'bold 48px Arial';
    ctx.fillText('Workout Complete', leftPadding, topStart);

    ctx.font = 'bold 18px Arial';
    ctx.fillText('Exercises:', leftPadding, topStart + statGap);
    ctx.font = 'bold 64px Arial';
    ctx.fillText(`${workoutData.exercisesCompleted}`, leftPadding, topStart + statGap + 60);

    ctx.font = 'bold 18px Arial';
    ctx.fillText('Total Volume:', leftPadding, topStart + statGap * 2);
    ctx.font = 'bold 64px Arial';
    ctx.fillText(`${workoutData.totalVolume.toLocaleString()}kg`, leftPadding, topStart + statGap * 2 + 60);

    ctx.font = 'bold 18px Arial';
    ctx.fillText('Duration:', leftPadding, topStart + statGap * 3);
    ctx.font = 'bold 64px Arial';
    ctx.fillText(`${workoutData.duration} min`, leftPadding, topStart + statGap * 3 + 60);

    ctx.font = 'bold 18px Arial';
    ctx.fillText('Date:', leftPadding, topStart + statGap * 4);
    ctx.font = 'bold 64px Arial';
    ctx.fillText(workoutData.date, leftPadding, topStart + statGap * 4 + 60);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    setCapturedPhoto(blob);
    setPhotoPreviewUrl(URL.createObjectURL(blob));
    stopCamera();
  };

  const savePhoto = async (goToMedia = false) => {
    if (!capturedPhoto) return;
    setIsSaving(true);

    try {
      const file = new File([capturedPhoto], `workout-complete-${Date.now()}.png`, { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      URL.revokeObjectURL(photoPreviewUrl);
      
      if (goToMedia) {
        navigate(createPageUrl("Media") + "?tab=photos");
      } else {
        onComplete(file_url);
      }
    } catch (error) {
      console.error('Error saving photo:', error);
      alert('Failed to save photo');
    } finally {
      setIsSaving(false);
    }
  };

  const retakePhoto = () => {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setCapturedPhoto(null);
    setPhotoPreviewUrl(null);
    startCamera();
  };

  const skipPhoto = () => {
    stopCamera();
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    onComplete();
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, []);

  // Sticker screen
  if (currentStep === 'sticker') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className={`w-32 h-32 mx-auto mb-6 bg-gradient-to-br ${sticker.color} rounded-full flex items-center justify-center shadow-2xl animate-bounce`}>
            <span className="text-6xl">{sticker.emoji}</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{sticker.title}</h1>
          <p className="text-slate-400 mb-4">{sticker.message}</p>

          <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">{workoutData.exercisesCompleted}</p>
                  <p className="text-xs text-slate-400">Exercises</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{workoutData.totalVolume.toLocaleString()}kg</p>
                  <p className="text-xs text-slate-400">Volume</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{workoutData.duration}min</p>
                  <p className="text-xs text-slate-400">Duration</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => {
              if (isPremium || isAdmin) {
                setCurrentStep('photo');
              } else {
                onComplete();
              }
            }}
            size="lg"
            className={`bg-gradient-to-r ${sticker.color} hover:opacity-90 text-white px-8`}
          >
            {isPremium || isAdmin ? 'Continue' : 'Done'}
          </Button>
        </div>
      </div>
    );
  }

  // Photo prompt
  if (currentStep === 'photo' && !cameraActive && !photoPreviewUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
            <Camera className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Take a Workout Photo?</h1>
          <p className="text-slate-400 mb-8">Capture a photo with your workout stats to share</p>

          <div className="flex gap-4 justify-center">
            <Button onClick={skipPhoto} variant="outline" className="border-slate-600 text-white">
              <X className="w-4 h-4 mr-2" />
              No Thanks
            </Button>
            <Button onClick={startCamera} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Camera className="w-4 h-4 mr-2" />
              Yes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Camera active
  if (cameraActive) {
    return (
      <div className="min-h-screen bg-black">
        <div className="relative h-screen">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
            <Button onClick={skipPhoto} variant="outline" className="border-white text-white hover:bg-white/20">
              <X className="w-4 h-4 mr-2" />
              Skip
            </Button>
            <Button onClick={capturePhoto} className="bg-white text-black hover:bg-white/90 px-8">
              <Camera className="w-5 h-5 mr-2" />
              Capture
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Photo preview
  if (photoPreviewUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Photo Preview</h1>
          </div>

          <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardContent className="p-4">
              <img src={photoPreviewUrl} alt="Preview" className="w-full rounded-lg" />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <div className="flex gap-3 justify-center">
              <Button onClick={retakePhoto} variant="outline" className="border-slate-600 text-white">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake
              </Button>
              <Button onClick={skipPhoto} variant="outline" className="border-red-600 text-red-400">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => savePhoto(false)}
                disabled={isSaving}
                variant="outline"
                className="border-green-600 text-green-400 hover:bg-green-600/20"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save & Finish'}
              </Button>
              <Button
                onClick={() => savePhoto(true)}
                disabled={isSaving}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Image className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save & Go to Media'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
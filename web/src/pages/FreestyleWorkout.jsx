import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Video, VideoOff, Play, X, Pause, Camera, Check, Trash2, 
  Plus, Dumbbell, ArrowLeft, Save
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function FreestyleWorkoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const wantsToRecord = location.state?.wantsToRecord || false;

  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stage, setStage] = useState("active"); // active, videoReview, photoPrompt, photoCapture, photoPreview, logExercises
  const [isPaused, setIsPaused] = useState(false);
  const [startTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);

  // Camera & Recording
  const [cameraStream, setCameraStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const liveVideoRef = useRef(null);
  const photoVideoRef = useRef(null);

  // Saved media
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [savedExerciseData, setSavedExerciseData] = useState(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);
  const [finalPhotoUrl, setFinalPhotoUrl] = useState(null);

  // Exercise logging
  const [exercises, setExercises] = useState([
    { name: "", sets: "", reps: "", weight: "" }
  ]);
  const [workoutName, setWorkoutName] = useState("Freestyle Workout");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsPremium(currentUser?.subscription_tier === 'premium');
      setIsAdmin(currentUser?.role === 'admin');
    };
    loadUser();
  }, []);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Elapsed time timer
  useEffect(() => {
    if (stage !== "active" || isPaused) return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, isPaused, startTime]);

  // Connect stream to video element
  useEffect(() => {
    if (liveVideoRef.current && cameraStream) {
      liveVideoRef.current.srcObject = cameraStream;
      liveVideoRef.current.play().catch(console.error);
    }
  }, [cameraStream]);

  useEffect(() => {
    if (photoVideoRef.current && cameraStream) {
      photoVideoRef.current.srcObject = cameraStream;
      photoVideoRef.current.play().catch(console.error);
    }
  }, [cameraStream, stage]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: false
      });
      setCameraStream(stream);
      
      if (wantsToRecord) {
        startRecording(stream);
      }
    } catch (error) {
      console.error("Camera error:", error);
    }
  };

  const startRecording = (stream) => {
    let mimeType = 'video/webm;codecs=vp8';
    if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
    
    const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 500000 });
    chunksRef.current = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = async () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }
      
      mediaRecorderRef.current.onstop = async () => {
        const mimeType = mediaRecorderRef.current.mimeType;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        
        if (blob.size === 0) {
          resolve(null);
          return;
        }
        
        try {
          const file = new File([blob], `freestyle-${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`, { type: mimeType });
          const result = await base44.integrations.Core.UploadFile({ file });
          resolve(result?.file_url || null);
        } catch (error) {
          console.error("Upload error:", error);
          resolve(null);
        }
      };
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    });
  };

  const stopCamera = () => {
    cameraStream?.getTracks().forEach(track => track.stop());
    setCameraStream(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinishWorkout = async () => {
    if (isRecording) {
      const videoUrl = await stopRecording();
      setRecordedVideoUrl(videoUrl);
      if (videoUrl) {
        setStage("videoReview");
        return;
      }
    }
    
    // Go directly to log exercises - photo prompt will come after
    setStage("logExercises");
  };

  const handleCancelWorkout = () => {
    stopCamera();
    navigate(createPageUrl("Dashboard"));
  };

  // Video review handlers
  const handleSaveVideo = () => {
    // Skip photo prompt here - we'll offer it after logging exercises
    setStage("logExercises");
  };

  const handleDeleteVideo = () => {
    setRecordedVideoUrl(null);
    setStage("logExercises");
  };

  const handleSkipVideo = () => {
    setRecordedVideoUrl(null);
    setStage("logExercises");
  };

  // Photo handlers
  const handleTakePhoto = async () => {
    if (!cameraStream) await startCamera();
    setStage("photoCapture");
  };

  const handleCapturePhoto = async () => {
    if (!photoVideoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = photoVideoRef.current.videoWidth || 1080;
    canvas.height = photoVideoRef.current.videoHeight || 1920;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(photoVideoRef.current, 0, 0, canvas.width, canvas.height);
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

    // Add stats overlay
    const leftPadding = 40;
    const topStart = canvas.height * 0.15;

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#C8102E';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 20;

    ctx.font = 'bold 48px Arial';
    ctx.fillText('Freestyle Workout 💪', leftPadding, topStart);

    ctx.font = 'bold 18px Arial';
    ctx.fillText('Duration:', leftPadding, topStart + 150);
    ctx.font = 'bold 64px Arial';
    ctx.fillText(formatTime(elapsedTime), leftPadding, topStart + 210);

    ctx.font = 'bold 18px Arial';
    ctx.fillText('Date:', leftPadding, topStart + 300);
    ctx.font = 'bold 64px Arial';
    ctx.fillText(format(new Date(), 'MMM d, yyyy'), leftPadding, topStart + 360);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
    
    canvas.toBlob((blob) => {
      setCapturedPhoto(blob);
      setPhotoPreviewUrl(URL.createObjectURL(blob));
      setStage("photoPreview");
    }, 'image/jpeg', 0.9);
  };

  const handleSavePhoto = async () => {
    if (capturedPhoto) {
      try {
        const file = new File([capturedPhoto], `freestyle-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const result = await base44.integrations.Core.UploadFile({ file });
        setPhotoPreviewUrl(result?.file_url || null);
      } catch (error) {
        console.error("Photo upload error:", error);
      }
    }
    stopCamera();
    setStage("logExercises");
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    setPhotoPreviewUrl(null);
    setStage("photoCapture");
  };

  const handleSkipPhoto = () => {
    stopCamera();
    setStage("logExercises");
  };

  // Exercise logging
  const addExercise = () => {
    setExercises([...exercises, { name: "", sets: "", reps: "", weight: "" }]);
  };

  const updateExercise = (index, field, value) => {
    const updated = [...exercises];
    updated[index][field] = value;
    setExercises(updated);
  };

  const removeExercise = (index) => {
    if (exercises.length > 1) {
      setExercises(exercises.filter((_, i) => i !== index));
    }
  };

  const handleSaveWorkout = async () => {
    if (!user?.email) return;
    setIsSaving(true);

    const duration = Math.round(elapsedTime / 60);
    const validExercises = exercises.filter(e => e.name.trim());
    
    const totalVolume = validExercises.reduce((sum, ex) => {
      return sum + ((parseInt(ex.sets) || 0) * (parseInt(ex.reps) || 0) * (parseFloat(ex.weight) || 0));
    }, 0);

    // Store exercise data for later use
    setSavedExerciseData({
      validExercises,
      totalVolume,
      duration
    });

    // If we have a recorded video, go to video review first
    if (recordedVideoUrl) {
      setStage("finalVideoReview");
      setIsSaving(false);
      return;
    }

    // If premium/admin, offer photo capture
    if (isPremium || isAdmin) {
      await startCamera();
      setStage("finalPhotoPrompt");
      setIsSaving(false);
      return;
    }

    // Otherwise save directly
    await saveWorkoutToDatabase(validExercises, totalVolume, duration, null, null);
  };

  const saveWorkoutToDatabase = async (validExercises, totalVolume, duration, videoUrl, photoUrl) => {
    try {
      await base44.entities.WorkoutLog.create({
        user_email: user.email,
        workout_name: workoutName,
        muscle_group: "Freestyle",
        date: format(new Date(), 'yyyy-MM-dd'),
        duration_minutes: duration,
        exercises_completed: validExercises.map(ex => ({
          exercise_name: ex.name,
          sets_completed: parseInt(ex.sets) || 0,
          reps_per_set: parseInt(ex.reps) || 0,
          weight_kg: parseFloat(ex.weight) || 0,
          video_url: videoUrl,
          template_url: photoUrl,
        })),
        total_volume: totalVolume,
        workout_video_url: videoUrl,
        workout_summary_template_url: photoUrl,
      });

      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      console.error("Save error:", error);
      alert("Error saving workout");
    }
  };

  // Active workout screen
  if (stage === "active") {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <video
          ref={liveVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover transform scale-x-[-1]"
        />

        {/* Header */}
        <div className="absolute top-3 left-3 bg-gradient-to-r from-[#C8102E] to-[#A00D25] text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg z-10">
          <Dumbbell className="w-4 h-4" />
          <span className="font-bold text-sm">FREESTYLE</span>
        </div>

        {isRecording && (
          <div className="absolute top-3 right-3 bg-red-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg z-10">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="font-semibold">REC</span>
          </div>
        )}

        {/* Timer */}
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-black/60 backdrop-blur-md text-white px-6 py-3 rounded-full text-3xl font-bold">
            {formatTime(elapsedTime)}
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-24 left-0 right-0 px-4 z-10">
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => setIsPaused(!isPaused)}
              size="lg"
              className={isPaused ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"}
            >
              {isPaused ? <Play className="w-5 h-5 mr-2" /> : <Pause className="w-5 h-5 mr-2" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              onClick={handleFinishWorkout}
              size="lg"
              className="bg-green-500 hover:bg-green-600"
            >
              <Check className="w-5 h-5 mr-2" />
              Finish
            </Button>
            <Button
              onClick={handleCancelWorkout}
              size="lg"
              className="bg-red-600 hover:bg-red-700"
            >
              <X className="w-5 h-5 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Video review screen
  if (stage === "videoReview" && recordedVideoUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Review Your Video</h2>
          
          <div className="rounded-xl overflow-hidden mb-6">
            <video src={recordedVideoUrl} controls className="w-full" />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleDeleteVideo} variant="outline" className="flex-1 border-red-500 text-red-500">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button onClick={handleSaveVideo} className="flex-1 bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Photo prompt screen
  if (stage === "photoPrompt") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Camera className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Take a Summary Photo?</h2>
          <p className="text-slate-400 mb-8">Capture a photo to go with your workout summary</p>
          
          <div className="flex gap-4 justify-center">
            <Button onClick={handleSkipPhoto} variant="outline" className="border-slate-600 text-slate-300">
              Skip
            </Button>
            <Button onClick={handleTakePhoto} className="bg-purple-600 hover:bg-purple-700">
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Photo capture screen
  if (stage === "photoCapture") {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <video
          ref={photoVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover transform scale-x-[-1]"
        />
        
        <div className="absolute bottom-24 left-0 right-0 px-4 z-10">
          <div className="flex justify-center gap-4">
            <Button onClick={handleSkipPhoto} variant="outline" className="border-slate-400 text-white">
              Skip
            </Button>
            <Button onClick={handleCapturePhoto} size="lg" className="bg-white text-black hover:bg-slate-200 rounded-full w-16 h-16">
              <Camera className="w-8 h-8" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Photo preview screen
  if (stage === "photoPreview" && photoPreviewUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Your Photo</h2>
          
          <div className="rounded-xl overflow-hidden mb-6">
            <img src={photoPreviewUrl} alt="Workout" className="w-full" />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleRetakePhoto} variant="outline" className="flex-1 border-slate-500 text-slate-300">
              Retake
            </Button>
            <Button onClick={handleSavePhoto} className="flex-1 bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 mr-2" />
              Use Photo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Final video review screen (after logging exercises)
  if (stage === "finalVideoReview" && recordedVideoUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Review Your Video</h2>
          
          <div className="rounded-xl overflow-hidden mb-6">
            <video src={recordedVideoUrl} controls className="w-full" />
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={() => {
                setFinalVideoUrl(null);
                if (isPremium || isAdmin) {
                  startCamera().then(() => setStage("finalPhotoPrompt"));
                } else if (savedExerciseData) {
                  saveWorkoutToDatabase(
                    savedExerciseData.validExercises,
                    savedExerciseData.totalVolume,
                    savedExerciseData.duration,
                    null,
                    null
                  );
                }
              }} 
              variant="outline" 
              className="flex-1 border-red-500 text-red-500"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button 
              onClick={() => {
                setFinalVideoUrl(recordedVideoUrl);
                if (isPremium || isAdmin) {
                  startCamera().then(() => setStage("finalPhotoPrompt"));
                } else if (savedExerciseData) {
                  saveWorkoutToDatabase(
                    savedExerciseData.validExercises,
                    savedExerciseData.totalVolume,
                    savedExerciseData.duration,
                    recordedVideoUrl,
                    null
                  );
                }
              }} 
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Final photo prompt screen (after video review or directly after logging)
  if (stage === "finalPhotoPrompt") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Camera className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Take a Summary Photo?</h2>
          <p className="text-slate-400 mb-8">Capture a photo to go with your workout summary</p>
          
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={() => {
                stopCamera();
                if (savedExerciseData) {
                  saveWorkoutToDatabase(
                    savedExerciseData.validExercises,
                    savedExerciseData.totalVolume,
                    savedExerciseData.duration,
                    finalVideoUrl,
                    null
                  );
                }
              }} 
              variant="outline" 
              className="border-slate-600 text-slate-300"
            >
              Skip
            </Button>
            <Button 
              onClick={() => setStage("finalPhotoCapture")} 
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Final photo capture screen
  if (stage === "finalPhotoCapture") {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <video
          ref={photoVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover transform scale-x-[-1]"
        />
        
        <div className="absolute bottom-24 left-0 right-0 px-4 z-10">
          <div className="flex justify-center gap-4">
            <Button 
              onClick={() => {
                stopCamera();
                if (savedExerciseData) {
                  saveWorkoutToDatabase(
                    savedExerciseData.validExercises,
                    savedExerciseData.totalVolume,
                    savedExerciseData.duration,
                    finalVideoUrl,
                    null
                  );
                }
              }} 
              variant="outline" 
              className="border-slate-400 text-white"
            >
              Skip
            </Button>
            <Button 
              onClick={async () => {
                if (!photoVideoRef.current) return;
                
                const canvas = document.createElement('canvas');
                canvas.width = photoVideoRef.current.videoWidth || 1080;
                canvas.height = photoVideoRef.current.videoHeight || 1920;
                const ctx = canvas.getContext('2d');
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(photoVideoRef.current, 0, 0, canvas.width, canvas.height);
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

                // Add stats overlay
                const leftPadding = 40;
                const topStart = canvas.height * 0.15;

                ctx.globalAlpha = 0.8;
                ctx.fillStyle = '#C8102E';
                ctx.textAlign = 'left';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                ctx.shadowBlur = 20;

                ctx.font = 'bold 48px Arial';
                ctx.fillText('Freestyle Workout 💪', leftPadding, topStart);

                const validExercises = savedExerciseData?.validExercises || [];
                ctx.font = 'bold 18px Arial';
                ctx.fillText('Exercises:', leftPadding, topStart + 150);
                ctx.font = 'bold 64px Arial';
                ctx.fillText(`${validExercises.length}`, leftPadding, topStart + 210);

                ctx.font = 'bold 18px Arial';
                ctx.fillText('Total Volume:', leftPadding, topStart + 300);
                ctx.font = 'bold 64px Arial';
                ctx.fillText(`${(savedExerciseData?.totalVolume || 0).toLocaleString()}kg`, leftPadding, topStart + 360);

                ctx.font = 'bold 18px Arial';
                ctx.fillText('Duration:', leftPadding, topStart + 450);
                ctx.font = 'bold 64px Arial';
                ctx.fillText(`${savedExerciseData?.duration || 0} min`, leftPadding, topStart + 510);

                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1.0;
                
                canvas.toBlob((blob) => {
                  setCapturedPhoto(blob);
                  setPhotoPreviewUrl(URL.createObjectURL(blob));
                  setStage("finalPhotoPreview");
                }, 'image/jpeg', 0.9);
              }} 
              size="lg" 
              className="bg-white text-black hover:bg-slate-200 rounded-full w-16 h-16"
            >
              <Camera className="w-8 h-8" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Final photo preview screen
  if (stage === "finalPhotoPreview" && photoPreviewUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Your Photo</h2>
          
          <div className="rounded-xl overflow-hidden mb-6">
            <img src={photoPreviewUrl} alt="Workout" className="w-full" />
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={() => {
                setCapturedPhoto(null);
                setPhotoPreviewUrl(null);
                startCamera().then(() => setStage("finalPhotoCapture"));
              }} 
              variant="outline" 
              className="flex-1 border-slate-500 text-slate-300"
            >
              Retake
            </Button>
            <Button 
              onClick={async () => {
                let uploadedPhotoUrl = null;
                if (capturedPhoto) {
                  try {
                    const file = new File([capturedPhoto], `freestyle-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    const result = await base44.integrations.Core.UploadFile({ file });
                    uploadedPhotoUrl = result?.file_url || null;
                  } catch (error) {
                    console.error("Photo upload error:", error);
                  }
                }
                stopCamera();
                if (savedExerciseData) {
                  saveWorkoutToDatabase(
                    savedExerciseData.validExercises,
                    savedExerciseData.totalVolume,
                    savedExerciseData.duration,
                    finalVideoUrl,
                    uploadedPhotoUrl
                  );
                }
              }} 
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Use Photo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Log exercises screen
  if (stage === "logExercises") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 pb-24">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-2">Log Your Workout</h2>
          <p className="text-slate-400 text-center text-sm mb-6">Add exercises to save to your history</p>

          <div className="mb-4">
            <Label className="text-white text-sm">Workout Name</Label>
            <Input
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white mt-1"
            />
          </div>

          <div className="space-y-3 mb-4">
            {exercises.map((exercise, index) => (
              <Card key={index} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      placeholder="Exercise name"
                      value={exercise.name}
                      onChange={(e) => updateExercise(index, 'name', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white text-sm"
                    />
                    {exercises.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExercise(index)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-slate-400 text-xs">Sets</Label>
                      <Input
                        type="number"
                        placeholder="3"
                        value={exercise.sets}
                        onChange={(e) => updateExercise(index, 'sets', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Reps</Label>
                      <Input
                        type="number"
                        placeholder="10"
                        value={exercise.reps}
                        onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Weight (kg)</Label>
                      <Input
                        type="number"
                        placeholder="20"
                        value={exercise.weight}
                        onChange={(e) => updateExercise(index, 'weight', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button onClick={addExercise} variant="outline" className="w-full border-slate-600 text-slate-300 mb-6">
            <Plus className="w-4 h-4 mr-2" />
            Add Exercise
          </Button>

          <div className="flex gap-3">
            <Button
              onClick={() => navigate(createPageUrl("Dashboard"))}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300"
            >
              Skip
            </Button>
            <Button
              onClick={handleSaveWorkout}
              disabled={isSaving || !exercises.some(e => e.name.trim())}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isSaving ? "Saving..." : "Save Workout"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
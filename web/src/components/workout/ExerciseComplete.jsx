import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Camera, X, RotateCcw, Save, Trash2, Play, Image } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ExerciseComplete({
  exercise,
  exerciseData,
  finalWeight,
  setFinalWeight,
  recordedVideoUrl,
  onConfirm,
  onDeleteVideo,
  onSaveVideo,
  isPremium,
  isAdmin,
}) {
  const navigate = useNavigate();
  const [showVideoReview, setShowVideoReview] = useState(!!recordedVideoUrl);
  const [showPhotoPrompt, setShowPhotoPrompt] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const adjustFinalWeight = (amount) => {
    setFinalWeight(prev => Math.max(0, prev + amount));
  };

  const handleVideoSave = async () => {
    await onSaveVideo();
    setShowVideoReview(false);
    if (isPremium || isAdmin) {
      setShowPhotoPrompt(true);
    } else {
      onConfirm();
    }
  };

  const handleVideoDelete = () => {
    onDeleteVideo();
    setShowVideoReview(false);
    if (isPremium || isAdmin) {
      setShowPhotoPrompt(true);
    } else {
      onConfirm();
    }
  };

  const handleSkipVideo = () => {
    setShowVideoReview(false);
    if (isPremium || isAdmin) {
      setShowPhotoPrompt(true);
    } else {
      onConfirm();
    }
  };

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

    // Draw mirrored video frame
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Add stats overlay
    const weight = exerciseData?.weight_kg || finalWeight || 0;
    const sets = exerciseData?.sets_completed || exercise.sets || 0;
    const reps = exerciseData?.reps_completed || parseInt(exercise.reps) || 0;
    const volume = weight * sets * reps;

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

    // Stats overlay
    const leftPadding = 40;
    const topStart = canvas.height * 0.15;
    const statGap = 150;

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#C8102E';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 20;

    ctx.font = 'bold 48px Arial';
    ctx.fillText('Smashed It! 💪', leftPadding, topStart);

    ctx.font = 'bold 18px Arial';
    ctx.fillText('Exercise:', leftPadding, topStart + statGap);
    ctx.font = 'bold 48px Arial';
    ctx.fillText(exercise.name, leftPadding, topStart + statGap + 60);

    ctx.font = 'bold 18px Arial';
    ctx.fillText('Weight:', leftPadding, topStart + statGap * 2);
    ctx.font = 'bold 64px Arial';
    ctx.fillText(`${weight}kg`, leftPadding, topStart + statGap * 2 + 60);

    ctx.font = 'bold 18px Arial';
    ctx.fillText('Volume:', leftPadding, topStart + statGap * 3);
    ctx.font = 'bold 64px Arial';
    ctx.fillText(`${volume}kg`, leftPadding, topStart + statGap * 3 + 60);

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
      const file = new File([capturedPhoto], `smashed-it-${exercise.name}-${Date.now()}.png`, { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      URL.revokeObjectURL(photoPreviewUrl);
      setCapturedPhoto(null);
      setPhotoPreviewUrl(null);
      setShowPhotoPrompt(false);
      
      if (goToMedia) {
        // Navigate to Media page to use the photo
        navigate(createPageUrl("Media") + "?tab=photos");
      } else {
        onConfirm(file_url);
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
    setCapturedPhoto(null);
    setPhotoPreviewUrl(null);
    setShowPhotoPrompt(false);
    onConfirm();
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, []);

  // Video Review Screen
  if (showVideoReview && recordedVideoUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Review Your Video</h1>
            <p className="text-slate-400">Save to your media library or delete</p>
          </div>

          <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardContent className="p-4">
              <video
                src={recordedVideoUrl}
                controls
                className="w-full rounded-lg"
                style={{ maxHeight: '50vh' }}
              />
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={handleVideoDelete}
              variant="outline"
              className="border-red-600 text-red-400 hover:bg-red-600/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button
              onClick={handleVideoSave}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save to Media
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Photo Prompt & Capture Screen
  if (showPhotoPrompt) {
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
              <Button
                onClick={skipPhoto}
                variant="outline"
                className="border-white text-white hover:bg-white/20"
              >
                <X className="w-4 h-4 mr-2" />
                Skip
              </Button>
              <Button
                onClick={capturePhoto}
                className="bg-white text-black hover:bg-white/90 px-8"
              >
                <Camera className="w-5 h-5 mr-2" />
                Capture
              </Button>
            </div>
          </div>
        </div>
      );
    }

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
                  {isSaving ? 'Saving...' : 'Save & Continue'}
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

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
            <Camera className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Take a Smashed It Photo?</h1>
          <p className="text-slate-400 mb-8">Capture a photo with your stats to share</p>

          <div className="flex gap-4 justify-center">
            <Button onClick={skipPhoto} variant="outline" className="border-slate-600 text-white">
              <X className="w-4 h-4 mr-2" />
              No Thanks
            </Button>
            <Button onClick={startCamera} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Camera className="w-4 h-4 mr-2" />
              Yes, Take Photo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Weight Confirmation Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Exercise Complete!</h1>
        <p className="text-slate-400 mb-8">Great job! Confirm your final weight for this exercise.</p>

        <Card className="bg-slate-800/50 border-slate-700 mb-6 max-w-md mx-auto">
          <CardContent className="p-6">
            <label className="text-sm text-slate-400 block mb-3">Final Weight Used</label>
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700">
              <div className="text-center mb-6">
                <div className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl shadow-lg ${
                  finalWeight === 0 ? 'bg-slate-700' : 'bg-gradient-to-r from-green-500 to-green-600'
                }`}>
                  <span className="text-5xl font-bold text-white">{finalWeight}</span>
                  <span className="text-2xl text-white/90">kg</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <Button onClick={() => adjustFinalWeight(1)} className="bg-slate-700 hover:bg-slate-600 text-white py-4">+1 kg</Button>
                <Button onClick={() => adjustFinalWeight(5)} className="bg-slate-700 hover:bg-slate-600 text-white py-4">+5 kg</Button>
                <Button onClick={() => adjustFinalWeight(10)} className="bg-slate-700 hover:bg-slate-600 text-white py-4">+10 kg</Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Button onClick={() => adjustFinalWeight(-1)} className="bg-slate-700 hover:bg-slate-600 text-white py-4">-1 kg</Button>
                <Button onClick={() => adjustFinalWeight(-5)} className="bg-slate-700 hover:bg-slate-600 text-white py-4">-5 kg</Button>
                <Button onClick={() => adjustFinalWeight(-10)} className="bg-slate-700 hover:bg-slate-600 text-white py-4">-10 kg</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => {
            if (recordedVideoUrl) {
              setShowVideoReview(true);
            } else if (isPremium || isAdmin) {
              setShowPhotoPrompt(true);
            } else {
              onConfirm();
            }
          }}
          size="lg"
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8"
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          Confirm & Continue
        </Button>
      </div>
    </div>
  );
}
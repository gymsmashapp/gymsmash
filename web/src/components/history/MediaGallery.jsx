import React, { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Share2, Dumbbell, Play, X } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MediaGallery({ log }) {
  const canvasRef = useRef(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [watermarkedVideoUrl, setWatermarkedVideoUrl] = useState(null);
  const watermarkCanvasRef = useRef(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  
  console.log('MediaGallery - Full log:', log);
  console.log('MediaGallery - exercises_completed:', log.exercises_completed);
  
  const exercisesWithVideo = log.exercises_completed?.filter(ex => {
    console.log(`Exercise "${ex.exercise_name}" has video_url:`, ex.video_url);
    return ex.video_url;
  }) || [];
  
  console.log('MediaGallery - Filtered exercises with video:', exercisesWithVideo);
  
  if (exercisesWithVideo.length === 0) {
    console.log('MediaGallery - No exercises with videos found, returning null');
    return null;
    }

    const applyWatermarkToVideo = async (videoUrl) => {
      try {
        setLoadingProgress(0);
        const video = document.createElement('video');
        video.src = videoUrl;
        video.crossOrigin = 'anonymous';
        video.muted = true;

        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve;
          video.onerror = reject;
        });

        setLoadingProgress(20);

      const canvas = document.createElement('canvas');
      const scale = 0.7;
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      const ctx = canvas.getContext('2d');

      const logo = new Image();
      logo.crossOrigin = 'anonymous';
      logo.src = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f13f7b260d533d2884a168/4624d13b0_gym_smash_rgb200_16_46_250x250.jpg';

      await new Promise((resolve, reject) => {
        logo.onload = resolve;
        logo.onerror = reject;
      });

      setLoadingProgress(40);

      const stream = canvas.captureStream(15);

      let mimeType = 'video/webm;codecs=vp8';
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mimeType = 'video/webm;codecs=h264';
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 800000
      });

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setWatermarkedVideoUrl(url);
        setLoadingProgress(100);
      };

      mediaRecorder.start();
      video.play();

      setLoadingProgress(60);

      const drawFrame = () => {
        if (video.paused || video.ended) {
          mediaRecorder.stop();
          setLoadingProgress(90);
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const logoSize = Math.min(canvas.width, canvas.height) * 0.15;
        const padding = 20;
        ctx.globalAlpha = 0.7;
        ctx.drawImage(logo, padding, padding, logoSize, logoSize);
        ctx.globalAlpha = 1.0;

        const progress = 60 + (video.currentTime / video.duration) * 25;
        setLoadingProgress(Math.min(progress, 85));

        requestAnimationFrame(drawFrame);
      };

      drawFrame();
    } catch (error) {
      console.error('Error applying watermark:', error);
      setWatermarkedVideoUrl(playingVideo.video_url);
    }
    };

    const generateShareImage = async () => {
    const canvas = document.createElement('canvas');
    // Instagram square format
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 1080);
    gradient.addColorStop(0, '#1e293b');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1080);

    // Logo area
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, 0, 1080, 150);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GYM SMASH', 540, 95);

    // Workout info
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.fillText(log.workout_name, 540, 250);
    
    ctx.font = '32px Arial';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(format(new Date(log.date), 'MMMM d, yyyy'), 540, 310);

    // Stats section
    const stats = [
      { label: 'Duration', value: `${log.duration_minutes} min`, icon: '⏱️' },
      { label: 'Total Volume', value: `${log.total_volume?.toLocaleString() || 0} kg`, icon: '💪' },
      { label: 'Exercises', value: log.exercises_completed?.length || 0, icon: '🏋️' }
    ];

    let yPos = 400;
    stats.forEach(stat => {
      ctx.fillStyle = '#334155';
      ctx.fillRect(90, yPos, 900, 120);
      
      ctx.font = '40px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(stat.icon, 150, yPos + 75);
      
      ctx.textAlign = 'left';
      ctx.font = '28px Arial';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(stat.label, 220, yPos + 55);
      
      ctx.font = 'bold 42px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(stat.value, 220, yPos + 95);
      
      ctx.textAlign = 'center';
      yPos += 150;
    });

    // Exercise list
    yPos = 800;
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#f97316';
    ctx.fillText('EXERCISES COMPLETED', 540, yPos);
    
    yPos += 50;
    log.exercises_completed?.slice(0, 3).forEach((ex, i) => {
      ctx.font = '26px Arial';
      ctx.fillStyle = '#e2e8f0';
      const text = `${ex.exercise_name} - ${ex.sets_completed}x${ex.reps_per_set} @ ${ex.weight_kg}kg`;
      ctx.fillText(text, 540, yPos + (i * 40));
    });

    // Footer
    ctx.fillStyle = '#64748b';
    ctx.font = '24px Arial';
    ctx.fillText('Made with Gym Smash', 540, 1040);

    // Download
    const link = document.createElement('a');
    link.download = `gym-smash-${log.workout_name}-${log.date}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const downloadVideo = async (videoUrl, exerciseName) => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });

      setDownloadProgress(15);

      const exerciseData = log.exercises_completed?.find(
        ex => ex.exercise_name.toLowerCase() === exerciseName.toLowerCase()
      );
      const weight = exerciseData?.weight_kg || 0;
      const totalReps = (exerciseData?.sets_completed || 0) * (exerciseData?.reps_per_set || 0);
      const timeUnderTension = totalReps * 4;
      
      const canvas = document.createElement('canvas');
      const scale = 0.7;
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      const ctx = canvas.getContext('2d');
      
      const logo = new Image();
      logo.crossOrigin = 'anonymous';
      logo.src = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f13f7b260d533d2884a168/4624d13b0_gym_smash_rgb200_16_46_250x250.jpg';

      await new Promise((resolve, reject) => {
        logo.onload = resolve;
        logo.onerror = reject;
      });

      setDownloadProgress(30);

      const stream = canvas.captureStream(15);

      let mimeType = 'video/webm;codecs=vp8';
      let fileExtension = 'webm';

      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
        fileExtension = 'mp4';
      } else if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
        mimeType = 'video/mp4;codecs=h264';
        fileExtension = 'mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mimeType = 'video/webm;codecs=h264';
        fileExtension = 'webm';
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 800000
      });
      
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exerciseName.replace(/\s+/g, '-')}-${log.date}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        setDownloadProgress(100);
        setTimeout(() => setIsDownloading(false), 500);
      };

      mediaRecorder.start();
      video.play();

      setDownloadProgress(50);
      
      const drawFrame = () => {
        if (video.paused || video.ended) {
          mediaRecorder.stop();
          setDownloadProgress(90);
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const logoSize = Math.min(canvas.width, canvas.height) * 0.15;
        const padding = 20;
        
        // Draw semi-transparent background for header
        const headerHeight = logoSize + (padding * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, headerHeight);
        
        // Draw logo
        ctx.globalAlpha = 0.7;
        ctx.drawImage(logo, padding, padding, logoSize, logoSize);
        ctx.globalAlpha = 1.0;

        // Draw stats next to logo
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        const statsText = `${weight}kg • ${totalReps} Reps • ${timeUnderTension}s TUT`;
        const statsX = padding + logoSize + 15;
        const statsY = padding + (logoSize / 2) + 6;
        ctx.fillText(statsText, statsX, statsY);

        const progress = 50 + (video.currentTime / video.duration) * 35;
        setDownloadProgress(Math.min(progress, 85));

        requestAnimationFrame(drawFrame);
      };

      drawFrame();
      
    } catch (error) {
      console.error('Error downloading video:', error);
      alert('Error downloading video. Please try again.');
      setIsDownloading(false);
      setDownloadProgress(0);
    }
    };

  return (
    <>
      <div className="space-y-4 mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#C8102E]" />
            Workout Videos
          </h3>
          <Button
            onClick={generateShareImage}
            size="sm"
            className="bg-gradient-to-r from-[#C8102E] to-[#A00D25] hover:from-orange-600 hover:to-orange-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Summary
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {exercisesWithVideo.map((exercise, index) => (
            <div
              key={index}
              className="group relative cursor-pointer rounded-lg overflow-hidden border-2 border-slate-200 hover:border-[#E8597A] transition-all shadow-sm hover:shadow-lg"
              onClick={() => {
                setPlayingVideo(exercise);
                applyWatermarkToVideo(exercise.video_url);
              }}
              >
              <div className="relative aspect-video bg-black">
                <video
                  src={exercise.video_url}
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 text-[#C8102E] ml-1" />
                  </div>
                </div>
                <div className="absolute top-2 left-2">
                  <Badge className="bg-[#C8102E] text-white text-xs">
                    {exercise.exercise_name}
                  </Badge>
                </div>
              </div>
              <div className="p-2 bg-slate-50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 truncate">
                    {exercise.sets_completed}×{exercise.reps_per_set}
                  </span>
                  <span className="text-[#C8102E] font-bold">
                    {exercise.weight_kg}kg
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!playingVideo} onOpenChange={() => {
        setPlayingVideo(null);
        if (watermarkedVideoUrl) {
          URL.revokeObjectURL(watermarkedVideoUrl);
          setWatermarkedVideoUrl(null);
        }
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{playingVideo?.exercise_name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPlayingVideo(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {playingVideo && (
            <div className="space-y-4">
              {watermarkedVideoUrl ? (
                <video
                  src={watermarkedVideoUrl}
                  controls
                  autoPlay
                  className="w-full rounded-lg bg-black"
                  style={{ maxHeight: '70vh' }}
                />
              ) : (
                <div className="w-full rounded-lg bg-black flex flex-col items-center justify-center p-8" style={{ height: '50vh' }}>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8102E] mb-4" />
                  <p className="text-white text-sm mb-2">Processing video...</p>
                  <div className="relative w-64">
                    <div className="bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#C8102E] to-[#A00D25] h-full transition-all duration-300"
                        style={{ width: `${loadingProgress}%` }}
                      />
                    </div>
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 transition-all duration-300"
                      style={{ left: `calc(${loadingProgress}% - 12px)` }}
                    >
                      <span className="text-2xl animate-bounce">💪</span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs mt-3">{Math.round(loadingProgress)}%</p>
                </div>
              )}
              
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm text-slate-600">
                    {playingVideo.sets_completed} sets × {playingVideo.reps_per_set} reps @ {playingVideo.weight_kg}kg
                  </p>
                  <p className="text-xs text-slate-500">
                    {log.workout_name} - {format(new Date(log.date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="space-y-3">
                  {isDownloading && (
                    <div className="p-3 bg-[#FCE8EC] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[#5A0712]">Processing download...</span>
                        <span className="text-xs text-[#800A1E]">{Math.round(downloadProgress)}%</span>
                      </div>
                      <div className="relative">
                        <div className="w-full bg-[#F5B3BE] rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-[#C8102E] to-[#A00D25] h-full transition-all duration-300"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 transition-all duration-300"
                          style={{ left: `calc(${downloadProgress}% - 12px)` }}
                        >
                          <span className="text-xl animate-bounce">💪</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = playingVideo.video_url;
                        a.download = `${playingVideo.exercise_name.replace(/\s+/g, '-')}-${log.date}-original.mp4`;
                        a.target = '_blank';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                      }}
                      variant="outline"
                      className="border-slate-300"
                      disabled={isDownloading}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      onClick={() => downloadVideo(playingVideo.video_url, playingVideo.exercise_name)}
                      className="bg-gradient-to-r from-[#C8102E] to-[#A00D25] hover:from-orange-600 hover:to-orange-700"
                      disabled={isDownloading}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      With Stats
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
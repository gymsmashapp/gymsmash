import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Play, Download, X, Calendar, Dumbbell, Trash2, Lock, Crown, 
  ArrowRight, Video, Image as ImageIcon, BarChart3, Search, Filter, Camera, Loader2, Plus
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function MediaPage() {
  const location = useLocation();
  
  // Get tab from URL
  const getCurrentTab = () => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    return (tab && ['videos', 'photos', 'stats'].includes(tab)) ? tab : 'videos';
  };
  
  const currentTab = getCurrentTab();
  const [playingVideo, setPlayingVideo] = useState(null);
  const [dateFilter, setDateFilter] = useState('all');
  const [exerciseFilter, setExerciseFilter] = useState('all');
  const [workoutFilter, setWorkoutFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Photo capture state
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingItem, setDownloadingItem] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [creatingSummaryId, setCreatingSummaryId] = useState(null);
  const [summaryProgress, setSummaryProgress] = useState(0);
  const [creatingTemplateId, setCreatingTemplateId] = useState(null);
  const [templateProgress, setTemplateProgress] = useState(0);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: workoutLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['all-workout-media', currentUser?.email],
    queryFn: async () => {
      const logs = await base44.entities.WorkoutLog.filter({
        user_email: currentUser.email
      }, '-date', 100);
      return logs;
    },
    enabled: !!currentUser?.email,
    staleTime: 5 * 60 * 1000,
  });

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => base44.entities.Exercise.list('name', 500),
  });
  
  const isLoading = userLoading || logsLoading;
  const user = currentUser;

  const allMedia = useMemo(() => {
    const videos = [];
    const photos = [];
    const stats = [];

    workoutLogs.forEach(log => {
      stats.push({
        type: 'workout_summary',
        url: log.workout_summary_template_url || null,
        date: log.date,
        workoutName: log.workout_name,
        exerciseName: null,
        logId: log.id,
        exerciseCount: log.exercises_completed?.length || 0,
        totalVolume: log.total_volume || 0,
        durationMinutes: log.duration_minutes || 0,
        exercises: log.exercises_completed || [],
      });

      log.exercises_completed?.forEach(exercise => {
        if (exercise.video_url) {
          videos.push({
            type: 'video',
            url: exercise.video_url,
            templateUrl: exercise.template_url,
            date: log.date,
            workoutName: log.workout_name,
            exerciseName: exercise.exercise_name,
            logId: log.id,
            weight: exercise.weight_kg,
            sets: exercise.sets_completed,
            reps: exercise.reps_per_set,
          });
        }
        else if (exercise.template_url && !exercise.video_url) {
          photos.push({
            type: 'photo',
            url: exercise.template_url,
            date: log.date,
            workoutName: log.workout_name,
            exerciseName: exercise.exercise_name,
            logId: log.id,
            weight: exercise.weight_kg,
            sets: exercise.sets_completed,
            reps: exercise.reps_per_set,
          });
        }
      });
    });

    return { videos, photos, stats };
  }, [workoutLogs]);

  const uniqueDates = useMemo(() => {
    const dates = new Set();
    workoutLogs.forEach(log => dates.add(log.date));
    return Array.from(dates).sort((a, b) => new Date(b) - new Date(a));
  }, [workoutLogs]);

  const uniqueExercises = useMemo(() => {
    const exerciseSet = new Set();
    workoutLogs.forEach(log => {
      log.exercises_completed?.forEach(ex => exerciseSet.add(ex.exercise_name));
    });
    return Array.from(exerciseSet).sort();
  }, [workoutLogs]);

  const uniqueWorkouts = useMemo(() => {
    const workouts = new Set();
    workoutLogs.forEach(log => workouts.add(log.workout_name));
    return Array.from(workouts).sort();
  }, [workoutLogs]);

  const filterMedia = (items) => {
    return items.filter(item => {
      if (dateFilter !== 'all' && item.date !== dateFilter) return false;
      if (exerciseFilter !== 'all' && item.exerciseName !== exerciseFilter) return false;
      if (workoutFilter !== 'all' && item.workoutName !== workoutFilter) return false;
      if (searchTerm && !item.exerciseName?.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !item.workoutName?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  };

  const createWorkoutSummaryTemplate = async (item) => {
    setCreatingSummaryId(item.logId);
    setSummaryProgress(0);

    try {
      const log = workoutLogs.find(l => l.id === item.logId);
      if (!log) throw new Error('Log not found');

      const profiles = await base44.entities.UserProfile.filter({ user_email: currentUser.email });
      const userProfile = profiles[0];
      const weeklyGoal = userProfile?.available_days?.length || 0;

      setSummaryProgress(10);

      const logDate = new Date(log.date);
      const weekStart = new Date(logDate);
      weekStart.setDate(logDate.getDate() - logDate.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekLogs = workoutLogs.filter(l => {
        const lDate = new Date(l.date);
        return lDate >= weekStart && lDate <= weekEnd;
      });

      const workoutsThisWeek = weekLogs.length;
      const progressPercentage = weeklyGoal > 0 ? Math.min((workoutsThisWeek / weeklyGoal) * 100, 100) : 0;

      setSummaryProgress(20);

      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      setSummaryProgress(30);

      const logo = document.createElement('img');
      logo.crossOrigin = 'anonymous';
      logo.src = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f13f7b260d533d2884a168/1af041014_gym_smash_rgb200_16_46_250x250-banner-white.png';
      await new Promise((resolve) => { logo.onload = resolve; logo.onerror = resolve; });

      setSummaryProgress(40);

      const logoHeight = canvas.height * 0.05;
      const logoWidth = (logo.naturalWidth / logo.naturalHeight) * logoHeight;
      ctx.globalAlpha = 0.8;
      ctx.drawImage(logo, canvas.width - logoWidth - 40, 40, logoWidth, logoHeight);
      ctx.globalAlpha = 1.0;

      const exerciseCount = log.exercises_completed?.length || 0;
      const totalSets = log.exercises_completed?.reduce((sum, ex) => sum + (ex.sets_completed || 0), 0) || 0;
      const totalVolume = log.total_volume || 0;
      const duration = log.duration_minutes || 0;

      const leftPadding = 40;
      const topStart = canvas.height * 0.15;
      const statGap = 150;

      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#C8102E';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 20;

      setSummaryProgress(50);

      ctx.font = 'bold 48px Arial';
      ctx.fillText('Workout Complete', leftPadding, topStart);

      ctx.font = 'bold 18px Arial';
      ctx.fillText('Exercises:', leftPadding, topStart + statGap);
      ctx.font = 'bold 64px Arial';
      ctx.fillText(`${exerciseCount}`, leftPadding, topStart + statGap + 68);

      ctx.font = 'bold 18px Arial';
      ctx.fillText('Total Sets:', leftPadding, topStart + statGap * 2);
      ctx.font = 'bold 64px Arial';
      ctx.fillText(`${totalSets}`, leftPadding, topStart + statGap * 2 + 68);

      ctx.font = 'bold 18px Arial';
      ctx.fillText('Volume:', leftPadding, topStart + statGap * 3);
      ctx.font = 'bold 64px Arial';
      ctx.fillText(`${totalVolume.toLocaleString()}kg`, leftPadding, topStart + statGap * 3 + 68);

      ctx.font = 'bold 18px Arial';
      ctx.fillText('Duration:', leftPadding, topStart + statGap * 4);
      ctx.font = 'bold 64px Arial';
      ctx.fillText(`${duration} min`, leftPadding, topStart + statGap * 4 + 68);

      ctx.font = 'bold 18px Arial';
      ctx.fillText('Weekly Progress:', leftPadding, topStart + statGap * 5);
      ctx.font = 'bold 64px Arial';
      ctx.fillText(`${workoutsThisWeek}/${weeklyGoal}`, leftPadding, topStart + statGap * 5 + 68);

      const progressBarY = topStart + statGap * 5 + 100;
      const progressBarWidth = canvas.width - (leftPadding * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(leftPadding, progressBarY, progressBarWidth, 30);
      const gradient = ctx.createLinearGradient(leftPadding, progressBarY, leftPadding + (progressBarWidth * progressPercentage / 100), progressBarY);
      gradient.addColorStop(0, '#C8102E');
      gradient.addColorStop(1, '#F97316');
      ctx.fillStyle = gradient;
      ctx.fillRect(leftPadding, progressBarY, (progressBarWidth * progressPercentage) / 100, 30);

      ctx.fillStyle = '#C8102E';
      ctx.font = 'bold 18px Arial';
      ctx.fillText('Date:', leftPadding, topStart + statGap * 6 + 50);
      ctx.font = 'bold 64px Arial';
      ctx.fillText(log.date, leftPadding, topStart + statGap * 6 + 118);

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;

      setSummaryProgress(70);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], `${log.workout_name.replace(/\s+/g, '-')}-${log.date}-summary.png`, { type: 'image/png' });

      setSummaryProgress(80);

      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      setSummaryProgress(90);

      await base44.entities.WorkoutLog.update(log.id, { workout_summary_template_url: file_url });

      setSummaryProgress(100);

      await queryClient.invalidateQueries({ queryKey: ['all-workout-media', currentUser?.email] });

      setCreatingSummaryId(null);
      setSummaryProgress(0);

      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.textContent = '✅ Workout summary created!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (error) {
      console.error('Error creating workout summary:', error);
      setCreatingSummaryId(null);
      setSummaryProgress(0);
      alert('Failed to create summary');
    }
  };

  const createExerciseTemplate = async (exercise, date, logId) => {
    const templateId = `${exercise.exercise_name}-${logId}`;
    setCreatingTemplateId(templateId);
    setTemplateProgress(0);

    try {
      const exerciseDef = exercises.find(ex => ex.name === exercise.exercise_name);
      const statsToShow = exerciseDef?.stats_to_display || ["weight", "volume", "time_under_tension"];

      setTemplateProgress(20);

      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      setTemplateProgress(30);

      // Load logo with timeout fallback
      const logo = document.createElement('img');
      logo.crossOrigin = 'anonymous';
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 3000); // 3 second timeout
        logo.onload = () => { clearTimeout(timeout); resolve(); };
        logo.onerror = () => { clearTimeout(timeout); resolve(); };
        logo.src = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f13f7b260d533d2884a168/1af041014_gym_smash_rgb200_16_46_250x250-banner-white.png';
      });

      setTemplateProgress(40);

      // Only draw logo if it loaded successfully
      if (logo.naturalWidth > 0) {
        const logoHeight = canvas.height * 0.05;
        const logoWidth = (logo.naturalWidth / logo.naturalHeight) * logoHeight;
        ctx.globalAlpha = 0.8;
        ctx.drawImage(logo, canvas.width - logoWidth - 40, 40, logoWidth, logoHeight);
        ctx.globalAlpha = 1.0;
      }

      const weight = exercise.weight_kg || 0;
      const sets = exercise.sets_completed || 0;
      const reps = exercise.reps_per_set || 0;
      const totalReps = sets * reps;
      const timeUnderTension = totalReps * 4;
      const volume = weight * totalReps;
      const calories = Math.round(volume * 0.5);

      const allStats = {
        calories: { label: 'Calories', value: `${calories}`, unit: 'kcal' },
        weight: { label: 'Weight', value: `${weight}`, unit: 'kg' },
        volume: { label: 'Volume', value: `${volume}`, unit: 'kg' },
        time_under_tension: { label: 'TUT', value: `${timeUnderTension}`, unit: 's' },
        distance: { label: 'Distance', value: '0', unit: 'm' },
        total_reps: { label: 'Total Reps', value: `${totalReps}`, unit: '' }
      };

      const selectedStats = statsToShow.filter(k => allStats[k]).map(k => allStats[k]);

      setTemplateProgress(50);

      const leftPadding = 40;
      const topStart = canvas.height * 0.15;
      const statGap = 150;

      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#C8102E';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 20;

      selectedStats.forEach((stat, index) => {
        const yPos = topStart + (statGap * index);
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`${stat.label}:`, leftPadding, yPos);
        ctx.font = 'bold 64px Arial';
        ctx.fillText(`${stat.value}${stat.unit}`, leftPadding, yPos + 68);
      });

      const dateYPos = topStart + (statGap * selectedStats.length);
      ctx.font = 'bold 18px Arial';
      ctx.fillText('Date:', leftPadding, dateYPos);
      ctx.font = 'bold 64px Arial';
      ctx.fillText(date || format(new Date(), 'yyyy-MM-dd'), leftPadding, dateYPos + 68);

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;

      setTemplateProgress(60);

      // Create blob with error handling
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        }, 'image/png');
      });
      
      if (!blob) {
        throw new Error('Failed to create image blob');
      }

      const exerciseName = (exercise.exercise_name || 'exercise').replace(/[^a-zA-Z0-9]/g, '-');
      const file = new File([blob], `${exerciseName}-${date || 'template'}.png`, { type: 'image/png' });

      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const file_url = uploadResult?.file_url;
      
      if (!file_url) {
        throw new Error('Upload failed - no URL returned');
      }

      setTemplateProgress(80);

      const log = workoutLogs.find(l => l.id === logId);
      if (log && log.exercises_completed) {
        const updatedExercises = log.exercises_completed.map(ex =>
          ex.exercise_name === exercise.exercise_name ? { ...ex, template_url: file_url } : ex
        );
        await base44.entities.WorkoutLog.update(logId, { exercises_completed: updatedExercises });
      }

      setTemplateProgress(100);

      await queryClient.invalidateQueries({ queryKey: ['all-workout-media', currentUser?.email] });

      setCreatingTemplateId(null);
      setTemplateProgress(0);

      // Auto-download after creation
      const a = document.createElement('a');
      a.href = file_url;
      a.download = `${exerciseName}-${date || 'template'}.png`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();

      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.textContent = '✅ Template downloaded!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (error) {
      console.error('Error creating template:', error);
      setCreatingTemplateId(null);
      setTemplateProgress(0);
      alert('Failed to create template: ' + (error.message || 'Unknown error'));
    }
  };

  const deleteMediaMutation = useMutation({
    mutationFn: async ({ logId, exerciseName, field }) => {
      const log = workoutLogs.find(l => l.id === logId);
      if (!log) throw new Error('Log not found');

      if (field === 'workout_summary_template_url') {
        await base44.entities.WorkoutLog.update(logId, { workout_summary_template_url: null });
      } else {
        const updatedExercises = log.exercises_completed.map(ex => {
          if (ex.exercise_name === exerciseName) {
            const updated = { ...ex };
            delete updated[field];
            return updated;
          }
          return ex;
        });
        await base44.entities.WorkoutLog.update(logId, { exercises_completed: updatedExercises });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-workout-media'] });
    },
  });

  const downloadMedia = async (item, type) => {
    const itemKey = `${item.logId}-${item.exerciseName || 'summary'}`;
    setDownloadingItem(itemKey);
    setDownloadProgress(0);
    
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      
      setDownloadProgress(30);
      
      if (type === 'Videos') {
        const videoEl = document.createElement('video');
        videoEl.src = URL.createObjectURL(blob);
        videoEl.muted = true;
        
        await new Promise((resolve) => {
          videoEl.onloadedmetadata = resolve;
        });
        
        setDownloadProgress(40);
        
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext('2d');
        
        const logo = document.createElement('img');
        logo.crossOrigin = 'anonymous';
        logo.src = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f13f7b260d533d2884a168/1af041014_gym_smash_rgb200_16_46_250x250-banner-white.png';
        await new Promise((resolve) => { logo.onload = resolve; logo.onerror = resolve; });
        
        setDownloadProgress(50);
        
        const canvasStream = canvas.captureStream(30);
        let mimeType = 'video/webm;codecs=vp8';
        if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
        
        const mediaRecorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 2000000 });
        const chunks = [];
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        const recordingPromise = new Promise((resolve) => {
          mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
        });
        
        mediaRecorder.start();
        videoEl.play();
        
        const duration = videoEl.duration * 1000;
        const startPlayTime = Date.now();
        
        const drawFrame = () => {
          if (videoEl.ended || videoEl.paused) {
            mediaRecorder.stop();
            return;
          }
          
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(videoEl, -canvas.width, 0, canvas.width, canvas.height);
          ctx.restore();
          
          const logoHeight = canvas.height * 0.05;
          const logoWidth = (logo.naturalWidth / logo.naturalHeight) * logoHeight;
          const logoX = canvas.width - logoWidth - 40;
          const logoY = 40;
          ctx.globalAlpha = 0.8;
          ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
          ctx.globalAlpha = 1.0;
          
          const leftPadding = 40;
          const topStart = canvas.height * 0.15;
          
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = '#C8102E';
          ctx.textAlign = 'left';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 20;
          
          ctx.font = 'bold 48px Arial';
          ctx.fillText(item.exerciseName || 'Workout', leftPadding, topStart);
          
          if (item.weight) {
            ctx.font = 'bold 18px Arial';
            ctx.fillText('Weight:', leftPadding, topStart + 100);
            ctx.font = 'bold 64px Arial';
            ctx.fillText(`${item.weight}kg`, leftPadding, topStart + 160);
          }
          
          if (item.sets && item.reps) {
            ctx.font = 'bold 18px Arial';
            ctx.fillText('Sets × Reps:', leftPadding, topStart + 240);
            ctx.font = 'bold 64px Arial';
            ctx.fillText(`${item.sets} × ${item.reps}`, leftPadding, topStart + 300);
          }
          
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1.0;
          
          const elapsed = Date.now() - startPlayTime;
          const progress = 50 + Math.min(40, (elapsed / duration) * 40);
          setDownloadProgress(Math.floor(progress));
          
          requestAnimationFrame(drawFrame);
        };
        
        drawFrame();
        
        const finalBlob = await recordingPromise;
        URL.revokeObjectURL(videoEl.src);
        
        setDownloadProgress(95);
        
        const downloadUrl = window.URL.createObjectURL(finalBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${item.exerciseName || 'workout'}-${item.date}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
      } else {
        setDownloadProgress(80);
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${item.exerciseName || 'workout'}-${item.date}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
      }
      
      setDownloadProgress(100);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download');
    } finally {
      setTimeout(() => {
        setDownloadingItem(null);
        setDownloadProgress(0);
      }, 500);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: false
      });
      setCameraStream(stream);
      setShowPhotoCapture(true);
    } catch (error) {
      console.error("Camera error:", error);
      alert("Camera access denied");
    }
  };

  const stopCamera = () => {
    cameraStream?.getTracks().forEach(track => track.stop());
    setCameraStream(null);
    setShowPhotoCapture(false);
    setCapturedPhoto(null);
  };

  React.useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(console.error);
    }
  }, [cameraStream]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;
    
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
    
    const logo = document.createElement('img');
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

    const leftPadding = 40;
    const topStart = canvas.height * 0.15;

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#C8102E';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 20;

    ctx.font = 'bold 48px Arial';
    ctx.fillText('Progress Photo 📸', leftPadding, topStart);

    ctx.font = 'bold 18px Arial';
    ctx.fillText('Date:', leftPadding, topStart + 150);
    ctx.font = 'bold 64px Arial';
    ctx.fillText(format(new Date(), 'MMM d, yyyy'), leftPadding, topStart + 210);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(dataUrl);
  };

  const savePhoto = async () => {
    if (!capturedPhoto) return;
    
    setIsUploading(true);
    try {
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      const result = await base44.integrations.Core.UploadFile({ file });
      
      if (result?.file_url) {
        await base44.entities.WorkoutLog.create({
          user_email: user.email,
          workout_name: 'Progress Photo',
          date: format(new Date(), 'yyyy-MM-dd'),
          duration_minutes: 0,
          exercises_completed: [{
            exercise_name: 'Progress Photo',
            template_url: result.file_url,
            sets_completed: 0,
            reps_per_set: 0,
            weight_kg: 0,
          }],
        });
        
        queryClient.invalidateQueries({ queryKey: ['all-workout-media'] });
        stopCamera();
        
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.textContent = '📸 Photo saved!';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to save photo');
    }
    setIsUploading(false);
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const isPremium = user?.subscription_tier === 'premium';
  const isAdmin = user?.role === 'admin';

  if (!isPremium && !isAdmin) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <Card className="border-none shadow-2xl bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Crown className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Premium Feature</h1>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              The Media Library is a premium feature. Upgrade to record workout videos, create shareable templates, and track your visual progress.
            </p>
            <Button
              onClick={() => window.location.href = '/Dashboard'}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-lg px-10 py-6"
            >
              <Crown className="w-6 h-6 mr-2" />
              Upgrade to Premium
              <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredVideos = filterMedia(allMedia.videos);
  const filteredPhotos = filterMedia(allMedia.photos);
  const filteredStats = filterMedia(allMedia.stats);

  const renderMediaGrid = (items, type) => {
    if (items.length === 0) {
      return (
        <Card className="p-12 text-center">
          <Dumbbell className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h2 className="text-2xl font-bold mb-2">No {type} Yet</h2>
          <p className="text-slate-600">
            {type === 'Videos' && 'Record videos during your workout sessions'}
            {type === 'Photos' && 'Take photos after completing exercises'}
            {type === 'Stats' && 'Create workout summary templates from your sessions'}
          </p>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, idx) => (
          <Card key={idx} className="border-slate-200 hover:border-blue-400 transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  type === 'Videos' ? 'bg-blue-100' : type === 'Photos' ? 'bg-purple-100' : 'bg-green-100'
                }`}>
                  {type === 'Videos' && <Video className="w-6 h-6 text-blue-600" />}
                  {type === 'Photos' && <ImageIcon className="w-6 h-6 text-purple-600" />}
                  {type === 'Stats' && <BarChart3 className="w-6 h-6 text-green-600" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {item.exerciseName || 'Workout Summary'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{item.workoutName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">{format(new Date(item.date), 'MMM d')}</span>
                    {item.weight && (
                      <span className="text-xs text-blue-600 font-medium">{item.weight}kg</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {downloadingItem === `${item.logId}-${item.exerciseName || 'summary'}` ? (
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-xs text-slate-600">{downloadProgress}%</span>
                    </div>
                  ) : (
                    <>
                      {type === 'Videos' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPlayingVideo(item)}
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadMedia(item, type)}
                        className={`${
                          type === 'Videos' ? 'border-blue-300 text-blue-600 hover:bg-blue-50' : 
                          type === 'Photos' ? 'border-purple-300 text-purple-600 hover:bg-purple-50' : 
                          'border-green-300 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Delete this media?')) {
                        deleteMediaMutation.mutate({
                          logId: item.logId,
                          exerciseName: item.exerciseName,
                          field: type === 'Videos' ? 'video_url' : type === 'Photos' ? 'template_url' : 'workout_summary_template_url'
                        });
                      }
                    }}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    disabled={!!downloadingItem}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto pb-40">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Media Library</h1>
        <p className="text-slate-600">Your workout videos, photos, and stats templates</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
            </div>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                {uniqueDates.map(date => (
                  <SelectItem key={date} value={date}>
                    {format(new Date(date), 'MMM d, yyyy')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={workoutFilter} onValueChange={setWorkoutFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Workout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workouts</SelectItem>
                {uniqueWorkouts.map(workout => (
                  <SelectItem key={workout} value={workout}>{workout}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={exerciseFilter} onValueChange={setExerciseFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Exercise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exercises</SelectItem>
                {uniqueExercises.map(ex => (
                  <SelectItem key={ex} value={ex}>{ex}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(dateFilter !== 'all' || exerciseFilter !== 'all' || workoutFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFilter('all');
                  setExerciseFilter('all');
                  setWorkoutFilter('all');
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      {currentTab === 'videos' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Video className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">Videos</h2>
            <Badge variant="outline">{filteredVideos.length}</Badge>
          </div>
          {renderMediaGrid(filteredVideos, 'Videos')}
        </div>
      )}

      {currentTab === 'photos' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-bold text-slate-900">Photos</h2>
              <Badge variant="outline">{filteredPhotos.length}</Badge>
            </div>
            <Button
              onClick={startCamera}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
          </div>
          {renderMediaGrid(filteredPhotos, 'Photos')}
        </div>
      )}

      {currentTab === 'stats' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-bold text-slate-900">Stats Templates</h2>
            <Badge variant="outline">{filteredStats.length}</Badge>
          </div>
          
          {filteredStats.length === 0 ? (
            <Card className="p-12 text-center">
              <Dumbbell className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <h2 className="text-2xl font-bold mb-2">No Workouts Yet</h2>
              <p className="text-slate-600">Complete workouts to create stats templates</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredStats.map((item, idx) => (
                <Card key={idx} className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <BarChart3 className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{item.workoutName}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{format(new Date(item.date), 'MMM d, yyyy')}</span>
                            <span>•</span>
                            <span>{item.exerciseCount} exercises</span>
                            <span>•</span>
                            <span>{item.totalVolume.toLocaleString()}kg</span>
                          </div>
                        </div>
                      </div>
                      
                      {creatingSummaryId === item.logId ? (
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                          <span className="text-xs text-slate-600">{Math.round(summaryProgress)}%</span>
                        </div>
                      ) : item.url ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadMedia(item, 'Stats')}
                            className="border-green-300 text-green-600 hover:bg-green-50"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm('Delete this summary?')) {
                                deleteMediaMutation.mutate({
                                  logId: item.logId,
                                  exerciseName: null,
                                  field: 'workout_summary_template_url'
                                });
                              }
                            }}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => createWorkoutSummaryTemplate(item)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download Summary
                        </Button>
                      )}
                    </div>
                    
                    {/* Exercise templates */}
                    <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-2">Exercise Templates</p>
                      {item.exercises.map((exercise, exIdx) => {
                        const templateId = `${exercise.exercise_name}-${item.logId}`;
                        const isCreating = creatingTemplateId === templateId;
                        
                        return (
                          <div key={exIdx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Dumbbell className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-700">{exercise.exercise_name}</span>
                              <span className="text-xs text-slate-500">
                                {exercise.sets_completed}×{exercise.reps_per_set} @ {exercise.weight_kg || 0}kg
                              </span>
                            </div>
                            
                            {isCreating ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                <span className="text-xs text-slate-600">{Math.round(templateProgress)}%</span>
                              </div>
                            ) : exercise.template_url ? (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => downloadMedia({
                                    url: exercise.template_url,
                                    exerciseName: exercise.exercise_name,
                                    date: item.date,
                                    logId: item.logId
                                  }, 'Photos')}
                                  className="h-7 text-xs text-blue-600 hover:bg-blue-50"
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm('Delete this template?')) {
                                      deleteMediaMutation.mutate({
                                        logId: item.logId,
                                        exerciseName: exercise.exercise_name,
                                        field: 'template_url'
                                      });
                                    }
                                  }}
                                  className="h-7 text-xs text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => createExerciseTemplate(exercise, item.date, item.logId)}
                                className="h-7 text-xs text-blue-600 hover:bg-blue-50"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Photo Capture Dialog */}
      <Dialog open={showPhotoCapture} onOpenChange={stopCamera}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Take Progress Photo</DialogTitle>
          </DialogHeader>
          <canvas ref={canvasRef} className="hidden" />
          
          {!capturedPhoto ? (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full aspect-[3/4] object-cover transform scale-x-[-1]"
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <Button
                  onClick={stopCamera}
                  variant="outline"
                  className="bg-white/90"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={capturePhoto}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Capture
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <img src={capturedPhoto} alt="Captured" className="w-full aspect-[3/4] object-cover" />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <Button
                  onClick={() => setCapturedPhoto(null)}
                  variant="outline"
                  className="bg-white/90"
                >
                  Retake
                </Button>
                <Button
                  onClick={savePhoto}
                  disabled={isUploading}
                  className="bg-green-600 hover:bg-green-700 text-white px-8"
                >
                  {isUploading ? 'Saving...' : 'Save Photo'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Player Dialog */}
      <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{playingVideo?.exerciseName}</DialogTitle>
            <DialogDescription>
              {playingVideo?.workoutName} - {playingVideo?.date && format(new Date(playingVideo.date), 'MMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          {playingVideo && (
            <div className="space-y-4">
              <video
                src={playingVideo.url}
                controls
                autoPlay
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: '60vh' }}
              />
              <div className="flex justify-between items-center">
                <div className="text-sm text-slate-600">
                  {playingVideo.sets} sets × {playingVideo.reps} reps @ {playingVideo.weight}kg
                </div>
                <Button
                  onClick={() => {
                    setPlayingVideo(null);
                    downloadMedia(playingVideo, 'Videos');
                  }}
                  variant="outline"
                  disabled={!!downloadingItem}
                >
                  {downloadingItem === `${playingVideo.logId}-${playingVideo.exerciseName || 'summary'}` ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {downloadProgress}%
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download with Overlay
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
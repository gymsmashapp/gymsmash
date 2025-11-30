import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Download, X, Sparkles } from "lucide-react";
import { format } from "date-fns";

export default function WorkoutSummaryShare({ 
  isOpen, 
  onClose, 
  workoutData,
  onShareComplete 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);

  React.useEffect(() => {
    if (isOpen && workoutData && !generatedImageUrl) {
      generateSummaryImage();
    }
  }, [isOpen, workoutData]);

  const generateSummaryImage = async () => {
    if (!workoutData) return;

    setIsGenerating(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(1, '#1e293b');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load logo
      const logo = new Image();
      logo.crossOrigin = 'anonymous';
      logo.src = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f13f7b260d533d2884a168/1af041014_gym_smash_rgb200_16_46_250x250-banner-white.png';

      await new Promise((resolve, reject) => {
        logo.onload = resolve;
        logo.onerror = reject;
      });

      // Draw logo at top
      const logoHeight = 60;
      const logoWidth = (logo.naturalWidth / logo.naturalHeight) * logoHeight;
      ctx.drawImage(logo, (canvas.width - logoWidth) / 2, 60, logoWidth, logoHeight);

      // Title
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 56px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Workout Complete! 💪', canvas.width / 2, 220);

      // Workout name
      ctx.font = 'bold 36px Arial';
      ctx.fillStyle = '#E8597A';
      ctx.fillText(workoutData.workoutName, canvas.width / 2, 280);

      // Stats section
      const stats = [
        { label: 'Exercises', value: workoutData.exercisesCompleted },
        { label: 'Total Volume', value: `${workoutData.totalVolume.toLocaleString()}kg` },
        { label: 'Duration', value: `${workoutData.duration}min` },
        { label: 'Date', value: format(new Date(workoutData.date), 'MMM d, yyyy') }
      ];

      let yPos = 380;
      stats.forEach(stat => {
        // Label
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(stat.label, canvas.width / 2, yPos);
        
        // Value
        ctx.font = 'bold 64px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText(stat.value, canvas.width / 2, yPos + 70);
        
        yPos += 150;
      });

      // Footer
      ctx.font = 'bold 28px Arial';
      ctx.fillStyle = '#64748b';
      ctx.fillText('#GymSmash', canvas.width / 2, canvas.height - 60);

      // Convert to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const url = URL.createObjectURL(blob);
      setGeneratedImageUrl(url);
      setIsGenerating(false);
    } catch (error) {
      console.error('Error generating summary:', error);
      setIsGenerating(false);
      alert('Failed to generate summary image');
    }
  };

  const handleShare = async () => {
    if (!generatedImageUrl) return;

    try {
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `gym-smash-workout-${Date.now()}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Gym Smash Workout',
          text: `Just completed ${workoutData.workoutName}! 💪 #GymSmash`
        });
        onShareComplete?.();
      } else {
        // Fallback: download the image
        const a = document.createElement('a');
        a.href = generatedImageUrl;
        a.download = `gym-smash-workout-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Silent fail or show gentle message
    }
  };

  const handleDownload = () => {
    if (!generatedImageUrl) return;
    
    const a = document.createElement('a');
    a.href = generatedImageUrl;
    a.download = `gym-smash-workout-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Great Work!
          </DialogTitle>
          <DialogDescription>
            Share your workout achievement with friends
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-slate-600 text-sm">Creating your summary...</p>
          </div>
        ) : generatedImageUrl ? (
          <div className="space-y-4">
            <img 
              src={generatedImageUrl} 
              alt="Workout Summary" 
              className="w-full rounded-lg border border-slate-200 shadow-lg"
            />
            <div className="flex gap-3">
              <Button
                onClick={handleShare}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                onClick={handleDownload}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full"
            >
              Skip
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Video, Camera, Timer, Dumbbell, ChevronRight, 
  Play, X, Lock
} from "lucide-react";

const STAGES = [
  { id: 'description', icon: FileText, label: 'Info' },
  { id: 'demo', icon: Video, label: 'Demo' },
  { id: 'record', icon: Camera, label: 'Record' },
  { id: 'timer', icon: Timer, label: 'Timer' },
  { id: 'weight', icon: Dumbbell, label: 'Weight' },
];

export default function ExerciseStages({
  exercise,
  currentWeight,
  setCurrentWeight,
  videoUrl,
  isPremium,
  isAdmin,
  onStartExercise,
  onCancel,
  previousWeight,
}) {
  const [currentStage, setCurrentStage] = useState(0);
  const [wantsToRecord, setWantsToRecord] = useState(false);
  const [useTimer, setUseTimer] = useState(true);

  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com|youtu\.be)\/shorts\/([a-zA-Z0-9_-]{11})/,
      /[?&]v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  };

  const adjustWeight = (amount) => {
    setCurrentWeight(prev => Math.max(0, prev + amount));
  };

  const handleNext = () => {
    if (currentStage < STAGES.length - 1) {
      setCurrentStage(currentStage + 1);
    }
  };

  const handleStart = () => {
    onStartExercise({
      wantsToRecord: wantsToRecord && (isPremium || isAdmin),
      useTimer,
      weight: currentWeight,
    });
  };

  const targetReps = parseInt(exercise.reps) || 10;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Stage Navigation Bar - positioned above main nav */}
      <div className="fixed bottom-[70px] left-0 right-0 bg-slate-800 border-t border-slate-700 px-2 py-2 z-40">
        <div className="flex justify-center gap-2 max-w-lg mx-auto">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = index === currentStage;
            const isCompleted = index < currentStage;
            
            return (
              <button
                key={stage.id}
                onClick={() => setCurrentStage(index)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : isCompleted
                    ? 'bg-green-600/20 text-green-400'
                    : 'text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{stage.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 pb-52 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Badge className="bg-blue-600 text-white">
            Step {currentStage + 1} of {STAGES.length}
          </Badge>
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-6">{exercise.name}</h1>

        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardContent className="p-6">
            {currentStage === 0 && (
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-4">Exercise Instructions</h2>
                <div className="bg-slate-700/50 rounded-lg p-4 text-left">
                  <p className="text-slate-300 leading-relaxed">
                    {exercise.notes || `Set the weight for ${targetReps} reps on the first set - where you could only do 2 more to failure. Go heavy but don't go ego heavy! Remember time under tension is key to muscle growth. If you need to do less reps as you go through the sets, that's OK, keep good form and don't drop below 8 reps.`}
                  </p>
                </div>
                <div className="mt-4 flex gap-4 justify-center text-sm text-slate-400">
                  <span>{exercise.sets} sets</span>
                  <span>×</span>
                  <span>{exercise.reps} reps</span>
                  {exercise.is_unilateral && <span className="text-blue-400">(per side)</span>}
                </div>
              </div>
            )}

            {currentStage === 1 && (
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-4">Demo Video</h2>
                {videoUrl && getYouTubeVideoId(videoUrl) ? (
                  <div className="relative rounded-xl overflow-hidden aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeVideoId(videoUrl)}`}
                      className="w-full h-full rounded-xl"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="bg-slate-700/50 rounded-lg p-8 text-slate-400">
                    <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No demo video available</p>
                  </div>
                )}
              </div>
            )}

            {currentStage === 2 && (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-4">Record Your Exercise?</h2>
                <p className="text-slate-400 mb-6">
                  {isPremium || isAdmin 
                    ? "Would you like to record video of your exercise?"
                    : "Video recording is a premium feature"}
                </p>
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => setWantsToRecord(false)}
                    variant={!wantsToRecord ? "default" : "outline"}
                    className={!wantsToRecord 
                      ? "bg-red-600 hover:bg-red-500 text-white" 
                      : "border-slate-600 text-slate-300"
                    }
                    size="lg"
                  >
                    <X className="w-5 h-5 mr-2" />
                    No
                  </Button>
                  <Button
                    onClick={() => setWantsToRecord(true)}
                    disabled={!isPremium && !isAdmin}
                    variant={wantsToRecord ? "default" : "outline"}
                    className={wantsToRecord 
                      ? "bg-red-600 hover:bg-red-500 text-white" 
                      : "border-slate-600 text-slate-300 hover:bg-slate-600/20"
                    }
                    size="lg"
                  >
                    {!isPremium && !isAdmin && <Lock className="w-4 h-4 mr-2" />}
                    <Camera className="w-5 h-5 mr-2" />
                    Yes
                  </Button>
                </div>
              </div>
            )}

            {currentStage === 3 && (
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Timer className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-4">Use Exercise Timer?</h2>
                <p className="text-slate-400 mb-6">
                  The timer guides you through each rep with proper time under tension
                </p>
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => setUseTimer(false)}
                    variant={!useTimer ? "default" : "outline"}
                    className={!useTimer 
                      ? "bg-slate-600 hover:bg-slate-500 text-white" 
                      : "border-slate-600 text-slate-300"
                    }
                    size="lg"
                  >
                    <X className="w-5 h-5 mr-2" />
                    No
                  </Button>
                  <Button
                    onClick={() => setUseTimer(true)}
                    variant={useTimer ? "default" : "outline"}
                    className={useTimer 
                      ? "bg-orange-600 hover:bg-orange-500 text-white" 
                      : "border-orange-600 text-orange-400 hover:bg-orange-600/20"
                    }
                    size="lg"
                  >
                    <Timer className="w-5 h-5 mr-2" />
                    Yes
                  </Button>
                </div>
              </div>
            )}

            {currentStage === 4 && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Set Your Weight</h2>
                  {previousWeight > 0 && (
                    <span className="text-slate-400 text-sm">(Last: {previousWeight}kg)</span>
                  )}
                </div>
                
                <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700 max-w-xs mx-auto">
                  <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl shadow-lg mb-4 ${
                    currentWeight === 0 ? 'bg-slate-700' : 'bg-gradient-to-r from-green-500 to-green-600'
                  }`}>
                    <span className="text-4xl font-bold text-white">{currentWeight}</span>
                    <span className="text-xl text-white/90">kg</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <Button onClick={() => adjustWeight(1)} className="bg-slate-700 hover:bg-slate-600 text-white py-2">+1</Button>
                    <Button onClick={() => adjustWeight(5)} className="bg-slate-700 hover:bg-slate-600 text-white py-2">+5</Button>
                    <Button onClick={() => adjustWeight(10)} className="bg-slate-700 hover:bg-slate-600 text-white py-2">+10</Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button onClick={() => adjustWeight(-1)} className="bg-slate-700 hover:bg-slate-600 text-white py-2">-1</Button>
                    <Button onClick={() => adjustWeight(-5)} className="bg-slate-700 hover:bg-slate-600 text-white py-2">-5</Button>
                    <Button onClick={() => adjustWeight(-10)} className="bg-slate-700 hover:bg-slate-600 text-white py-2">-10</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-center">
          {currentStage < STAGES.length - 1 ? (
            <Button
              onClick={handleNext}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleStart}
              size="lg"
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Exercise
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Pause, Play, X, Dumbbell, Video } from "lucide-react";
import { motion } from "framer-motion";

export default function ActiveExercise({
  exercise,
  currentSet,
  currentWeight,
  wantsToRecord,
  useTimer,
  cameraStream,
  isRecording,
  onSetComplete,
  onCancel,
  videoUrl,
  userProfile,
}) {
  const [currentRep, setCurrentRep] = useState(0);
  const [repPhase, setRepPhase] = useState("contraction");
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSide, setCurrentSide] = useState("left");
  const [sideTransition, setSideTransition] = useState(false);
  const [sideCountdown, setSideCountdown] = useState(10);
  const [audioContext, setAudioContext] = useState(null);
  const liveVideoRef = useRef(null);

  const targetReps = parseInt(exercise.reps) || 10;

  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(ctx);
    return () => ctx.close();
  }, []);

  useEffect(() => {
    if (liveVideoRef.current && cameraStream) {
      liveVideoRef.current.srcObject = cameraStream;
      liveVideoRef.current.play().catch(console.error);
    }
  }, [cameraStream]);

  const playBeep = (frequency = 800, duration = 0.1) => {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  };

  // Side transition countdown
  useEffect(() => {
    if (sideTransition && sideCountdown > 0) {
      const interval = setInterval(() => {
        setSideCountdown(prev => {
          if (prev <= 1) {
            setCurrentSide("right");
            setCurrentRep(0);
            setRepPhase("contraction");
            setPhaseProgress(0);
            setSideTransition(false);
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sideTransition, sideCountdown]);

  // Timer-based exercise progression
  useEffect(() => {
    if (!useTimer || isPaused || sideTransition) return;

    const interval = setInterval(() => {
      setPhaseProgress(prev => {
        if (prev >= 100) {
          if (repPhase === "contraction") {
            playBeep(1000, 0.15);
            setRepPhase("extension");
            return 0;
          } else {
            playBeep(600, 0.15);
            
            if (currentRep + 1 >= targetReps) {
              if (exercise.is_unilateral && currentSide === "left") {
                setSideTransition(true);
                setSideCountdown(10);
                return 0;
              } else {
                onSetComplete();
                return 0;
              }
            } else {
              setCurrentRep(prev => prev + 1);
              setRepPhase("contraction");
              return 0;
            }
          }
        }
        const phaseDuration = repPhase === "contraction" ? 1000 : 3000;
        return prev + (100 / (phaseDuration / 50));
      });
    }, 50);

    return () => clearInterval(interval);
  }, [useTimer, isPaused, repPhase, currentRep, sideTransition, currentSide, targetReps]);

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

  // Side transition screen
  if (sideTransition) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-40 h-40 mx-auto mb-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl relative">
            <motion.div
              className="absolute inset-0 rounded-full border-8 border-green-400"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-6xl font-bold text-white relative z-10">{sideCountdown}</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Switch Sides!</h3>
          <p className="text-slate-400">Get ready for RIGHT side in {sideCountdown} seconds</p>
        </div>
      </div>
    );
  }

  // Camera view (recording or mirror mode)
  if (cameraStream) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50"
      >
        <div className="relative w-full h-full bg-black">
          <video
            ref={liveVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover transform scale-x-[-1]"
          />

          <div className="absolute top-3 left-3 bg-gradient-to-r from-[#C8102E] to-[#A00D25] text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg z-10">
            <Dumbbell className="w-4 h-4" />
            <span className="font-bold text-sm">GYM SMASH</span>
          </div>

          {isRecording ? (
            <div className="absolute top-3 right-3 bg-red-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg z-10">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="font-semibold">REC</span>
            </div>
          ) : (
            <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg z-10">
              <span className="font-semibold">MIRROR</span>
            </div>
          )}

          <div className="absolute bottom-36 left-3 z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-white text-xs font-bold uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Set</span>
                <span className="text-white text-3xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{currentSet}/{exercise.sets}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white text-xs font-bold uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Rep</span>
                <span className="text-white text-3xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{currentRep + 1}/{targetReps}</span>
              </div>
              {currentWeight > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-bold uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Weight</span>
                  <span className="text-white text-3xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{currentWeight}kg</span>
                </div>
              )}
            </div>
          </div>

          {exercise.is_unilateral && (
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-10">
              <div className={`${currentSide === "left" ? "bg-blue-500" : "bg-green-500"} text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg`}>
                {currentSide === "left" ? "⬅️ LEFT SIDE" : "➡️ RIGHT SIDE"}
              </div>
            </div>
          )}

          {/* Timer bar or Complete Set button at bottom */}
          <div className="absolute bottom-20 left-3 right-3 z-10">
            {useTimer ? (
              <div className="bg-black/90 backdrop-blur-md rounded-lg px-3 py-2 shadow-xl border border-[#C8102E]">
                <p className="text-center text-sm text-white font-semibold mb-1">
                  {repPhase === "contraction" ? "🔥 CONTRACTING" : "💧 EXTENDING"}
                </p>
                <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`absolute top-0 h-full ${
                      repPhase === "contraction"
                        ? "bg-gradient-to-r from-[#C8102E] to-[#dc2626] left-0"
                        : "bg-gradient-to-r from-blue-500 to-cyan-600 right-0"
                    }`}
                    style={{ width: `${phaseProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <Button
                onClick={onSetComplete}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-6 text-xl font-bold rounded-xl"
              >
                ✓ Complete Set {currentSet}/{exercise.sets}
              </Button>
            )}
          </div>

          {/* Control buttons */}
          <div className="absolute bottom-36 right-3 z-10 flex gap-2">
            {useTimer && (
              <Button
                onClick={() => setIsPaused(!isPaused)}
                size="sm"
                className={isPaused ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"}
              >
                {isPaused ? <Play className="w-4 h-4 mr-1" /> : <Pause className="w-4 h-4 mr-1" />}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
            )}
            <Button onClick={onCancel} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Non-recording view (show demo video or stats)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    >
      <div className="h-full flex flex-col p-6">
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white">{exercise.name}</h2>
          {exercise.is_unilateral && (
            <div className={`inline-block mt-2 ${currentSide === "left" ? "bg-blue-500" : "bg-green-500"} text-white px-4 py-1 rounded-full text-sm font-bold`}>
              {currentSide === "left" ? "⬅️ LEFT SIDE" : "➡️ RIGHT SIDE"}
            </div>
          )}
        </div>

        {/* Demo Video */}
        {videoUrl && getYouTubeVideoId(videoUrl) && (
          <div className="flex-1 max-h-[40vh] mb-4">
            <iframe
              src={`https://www.youtube.com/embed/${getYouTubeVideoId(videoUrl)}?autoplay=1&mute=1&loop=1`}
              className="w-full h-full rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        )}

        {/* Stats */}
        <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 mb-4 border border-slate-700">
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <p className="text-[#E8597A] text-xs font-semibold uppercase mb-1">Set</p>
              <p className="text-3xl font-bold text-white">{currentSet}<span className="text-slate-400 text-xl">/{exercise.sets}</span></p>
            </div>
            <div>
              <p className="text-[#E8597A] text-xs font-semibold uppercase mb-1">Rep</p>
              <p className="text-3xl font-bold text-white">{currentRep + 1}<span className="text-slate-400 text-xl">/{targetReps}</span></p>
            </div>
            <div>
              <p className="text-[#E8597A] text-xs font-semibold uppercase mb-1">Weight</p>
              <p className="text-3xl font-bold text-white">{currentWeight}<span className="text-slate-400 text-xl">kg</span></p>
            </div>
          </div>

          {useTimer && (
            <div className="pt-4 border-t border-slate-700">
              <p className="text-center text-sm text-slate-400 mb-2">
                {repPhase === "contraction" ? "🔥 CONTRACTING" : "💧 EXTENDING"}
              </p>
              <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className={`absolute top-0 h-full ${
                    repPhase === "contraction"
                      ? "bg-gradient-to-r from-[#C8102E] to-[#dc2626] left-0"
                      : "bg-gradient-to-r from-blue-500 to-cyan-600 right-0"
                  }`}
                  style={{ width: `${phaseProgress}%` }}
                />
              </div>
            </div>
          )}
          </div>

          {/* Controls - Fixed at bottom */}
          <div className="fixed bottom-20 right-3 z-50 flex gap-2">
          {useTimer && (
            <Button
              onClick={() => setIsPaused(!isPaused)}
              size="sm"
              className={isPaused ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"}
            >
              {isPaused ? <Play className="w-4 h-4 mr-1" /> : <Pause className="w-4 h-4 mr-1" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
          )}
          <Button onClick={onCancel} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          </div>
          </div>
          </motion.div>
          );
}
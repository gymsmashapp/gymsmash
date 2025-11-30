import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Play, X, Lock, Dumbbell } from "lucide-react";

export default function FreestyleSetupPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [wantsToRecord, setWantsToRecord] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsPremium(currentUser?.subscription_tier === 'premium');
      setIsAdmin(currentUser?.role === 'admin');
    };
    loadUser();
  }, []);

  const canRecord = isPremium || isAdmin;

  const handleStart = () => {
    navigate(createPageUrl("FreestyleWorkout"), { 
      state: { wantsToRecord: wantsToRecord && canRecord } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
      <div className="max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Dumbbell className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Freestyle Workout</h1>
          <p className="text-slate-400">Do your own thing with optional recording</p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-4">Record Your Workout?</h2>
              <p className="text-slate-400 mb-6">
                {canRecord 
                  ? "Would you like to record video of your workout?"
                  : "Video recording is a premium feature"}
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => setWantsToRecord(false)}
                  variant={!wantsToRecord ? "default" : "outline"}
                  className={!wantsToRecord 
                    ? "bg-[#C8102E] hover:bg-[#A00D25] text-white" 
                    : "bg-white hover:bg-slate-100 text-slate-900"
                  }
                  size="lg"
                >
                  <X className="w-5 h-5 mr-2" />
                  No
                </Button>
                <Button
                  onClick={() => setWantsToRecord(true)}
                  disabled={!canRecord}
                  variant={wantsToRecord ? "default" : "outline"}
                  className={wantsToRecord 
                    ? "bg-[#C8102E] hover:bg-[#A00D25] text-white" 
                    : "bg-white hover:bg-slate-100 text-slate-900"
                  }
                  size="lg"
                >
                  {!canRecord && <Lock className="w-4 h-4 mr-2" />}
                  <Camera className="w-5 h-5 mr-2" />
                  Yes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => navigate(createPageUrl("Dashboard"))}
            variant="outline"
            className="border-slate-600 text-slate-300 px-8"
            size="lg"
          >
            <X className="w-5 h-5 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleStart}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8"
            size="lg"
          >
            <Play className="w-5 h-5 mr-2" />
            Start
          </Button>
        </div>
      </div>
    </div>
  );
}
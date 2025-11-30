
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Target, Dumbbell, Calendar, Cake } from "lucide-react"; // Removed Shield and Clock

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({
          user_email: user.email
        });
        if (profiles.length > 0) {
          setProfile(profiles[0]);
        }
      } catch (error) {
        console.error("Error:", error);
      }
      setIsLoading(false);
    };
    loadProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="text-center py-12">
            <User className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h2 className="text-2xl font-bold mb-2">No Profile Found</h2>
            <p className="text-slate-600 mb-6">Complete the questionnaire to get started</p>
            <Button
              onClick={() => navigate(createPageUrl("Questionnaire"))}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              Start Questionnaire
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatText = (text) => text?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Your Profile</h1>
        <p className="text-slate-600">Manage your fitness preferences</p>
      </div>

      <div className="space-y-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Personal Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-slate-500">Gender</p>
                  <p className="font-semibold">{formatText(profile.gender)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Cake className="w-5 h-5 text-pink-600" />
                <div>
                  <p className="text-sm text-slate-500">Age Range</p>
                  <p className="font-semibold">{profile.age_range} years</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Fitness Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-slate-500">Primary Goal</p>
                <p className="font-semibold">{formatText(profile.primary_goal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Training Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Dumbbell className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-slate-500">Equipment</p>
                <p className="font-semibold">{formatText(profile.equipment_access)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              Training Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.available_days?.map(day => (
                <Badge key={day} className="bg-orange-100 text-orange-800 px-3 py-1">
                  {formatText(day)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={() => navigate(createPageUrl("Questionnaire"))}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
          >
            Update Profile
          </Button>
        </div>
      </div>
    </div>
  );
}

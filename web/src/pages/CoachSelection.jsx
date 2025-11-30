import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Check, RefreshCw, Video, ExternalLink } from "lucide-react";

export default function CoachSelectionPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.UserProfile.filter({
        user_email: user.email
      });
      return profiles.length > 0 ? profiles[0] : null;
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (profile) {
      setUserProfile(profile);
    }
  }, [profile]);

  const { data: coaches, isLoading: coachesLoading } = useQuery({
    queryKey: ['coaches'],
    queryFn: () => base44.entities.Coach.filter({ is_active: true }, 'name'),
    enabled: !!user,
  });

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    
    const cleanUrl = url.trim();
    if (cleanUrl.includes('youtube.com/embed/')) return cleanUrl;

    let videoId = null;
    
    const shortsMatch = cleanUrl.match(/(?:youtube\.com|youtu\.be)\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) {
      videoId = shortsMatch[1];
    }
    
    if (!videoId) {
      const watchMatch = cleanUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (watchMatch) {
        videoId = watchMatch[1];
      }
    }
    
    if (!videoId) {
      const shortLinkMatch = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      if (shortLinkMatch) {
        videoId = shortLinkMatch[1];
      }
    }

    if (videoId && videoId.length === 11) {
      return `https://www.youtube.com/embed/${videoId}`;
    }

    return null;
  };

  const getYouTubeVideoId = (url) => {
    const embedUrl = getYouTubeEmbedUrl(url);
    if (!embedUrl) return null;
    const match = embedUrl.match(/embed\/([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const updatePreferenceMutation = useMutation({
    mutationFn: async (coachId) => {
      if (!userProfile) throw new Error('No profile found');
      
      await base44.entities.UserProfile.update(userProfile.id, {
        preferred_coach_id: coachId
      });
      
      // Trigger sync after updating preference
      setIsSyncing(true);
      try {
        await base44.functions.invoke('syncExercisesToSchedules');
      } catch (syncError) {
        console.error('Sync error:', syncError);
      }
      setIsSyncing(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['current-workout'], exact: false });
      
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
      toast.textContent = '✅ Coach preference saved and synced!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    },
  });

  if (!user || coachesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Choose Your Coach</h1>
        <p className="text-slate-600">
          Select your preferred coach for exercise demonstrations
        </p>
      </div>

      {(!coaches || coaches.length === 0) ? (
        <Card className="p-12 text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600">No coaches available yet</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coaches.map((coach) => {
            const isSelected = userProfile?.preferred_coach_id === coach.id;
            
            return (
              <Card 
                key={coach.id} 
                className={`border-2 transition-all ${
                  isSelected 
                    ? 'border-orange-500 shadow-lg' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <CardHeader>
                  <CardTitle className="text-xl flex items-center justify-between">
                    <span>{coach.name}</span>
                    {isSelected && (
                      <Badge className="bg-orange-500 text-white">
                        <Check className="w-3 h-3 mr-1" />
                        Selected
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {coach.specialty && (
                    <Badge variant="secondary" className="mb-3">
                      {coach.specialty}
                    </Badge>
                  )}
                  {coach.bio && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-3">{coach.bio}</p>
                  )}
                  {coach.demo_video_url && getYouTubeVideoId(coach.demo_video_url) && (
                    <a
                      href={coach.demo_video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative rounded-lg overflow-hidden group cursor-pointer hover:opacity-90 transition-opacity mb-4"
                    >
                      <img
                        src={`https://img.youtube.com/vi/${getYouTubeVideoId(coach.demo_video_url)}/maxresdefault.jpg`}
                        alt="Demo video thumbnail"
                        className="w-full rounded-lg"
                        onError={(e) => {
                          e.target.src = `https://img.youtube.com/vi/${getYouTubeVideoId(coach.demo_video_url)}/hqdefault.jpg`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center group-hover:bg-opacity-50 transition-all">
                        <div className="bg-red-600 rounded-full p-3 group-hover:scale-110 transition-transform">
                          <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                        <p className="text-white text-xs font-semibold flex items-center gap-2">
                          <Video className="w-3 h-3" />
                          Watch demo video
                        </p>
                      </div>
                    </a>
                  )}
                  <Button
                    onClick={() => updatePreferenceMutation.mutate(coach.id)}
                    disabled={isSelected || updatePreferenceMutation.isPending || isSyncing}
                    className={`w-full ${
                      isSelected
                        ? "bg-green-600 text-white cursor-default"
                        : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                    }`}
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : isSelected ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Your Coach
                      </>
                    ) : (
                      "Save Preference"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
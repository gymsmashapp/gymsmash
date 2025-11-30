import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Edit2, User, RefreshCw, AlertCircle, Video, ExternalLink, Upload, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminCoachesPage() {
  const queryClient = useQueryClient();
  const [coachDialogOpen, setCoachDialogOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [videoInputType, setVideoInputType] = useState('youtube'); // 'youtube' or 'upload'
  const [coachFormData, setCoachFormData] = useState({
    name: "",
    bio: "",
    demo_video_url: "",
    specialty: "",
    is_active: true,
  });

  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const cleanUrl = url.trim();
    
    let videoId = null;
    const shortsMatch = cleanUrl.match(/(?:youtube\.com|youtu\.be)\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) videoId = shortsMatch[1];
    
    if (!videoId) {
      const watchMatch = cleanUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (watchMatch) videoId = watchMatch[1];
    }
    
    if (!videoId) {
      const shortLinkMatch = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      if (shortLinkMatch) videoId = shortLinkMatch[1];
    }
    
    if (!videoId && cleanUrl.includes('youtube.com/embed/')) {
      const embedMatch = cleanUrl.match(/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) videoId = embedMatch[1];
    }

    return videoId && videoId.length === 11 ? videoId : null;
  };
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        console.log('Current user:', currentUser);
        console.log('User role:', currentUser.role);
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const { data: coaches, isLoading, error, refetch } = useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      console.log('🔍 Fetching coaches with filter({})...');
      try {
        // Try filter instead of list to get ALL coaches
        const result = await base44.entities.Coach.filter({}, '-created_date', 100);
        console.log('✅ Coaches fetched:', result);
        console.log('✅ Number of coaches:', result?.length);
        if (result && result.length > 0) {
          console.log('✅ First coach:', result[0]);
        }
        return result;
      } catch (err) {
        console.error('❌ Error fetching coaches:', err);
        console.error('❌ Error details:', {
          message: err.message,
          name: err.name,
          stack: err.stack
        });
        throw err;
      }
    },
    enabled: !!user,
    staleTime: 0,
  });

  const createCoachMutation = useMutation({
    mutationFn: (data) => base44.entities.Coach.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
      resetCoachForm();
      setCoachDialogOpen(false);
      setTimeout(() => refetch(), 500);
    },
  });

  const updateCoachMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Coach.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
      resetCoachForm();
      setCoachDialogOpen(false);
      setTimeout(() => refetch(), 500);
    },
  });

  const deleteCoachMutation = useMutation({
    mutationFn: (id) => base44.entities.Coach.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
      setTimeout(() => refetch(), 500);
    },
  });

  const resetCoachForm = () => {
    setCoachFormData({
      name: "",
      bio: "",
      demo_video_url: "",
      specialty: "",
      is_active: true,
    });
    setEditingCoach(null);
    setVideoInputType('youtube');
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert('Video must be under 100MB');
      return;
    }

    setIsUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      if (result?.file_url) {
        setCoachFormData(prev => ({ ...prev, demo_video_url: result.file_url }));
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.textContent = '✅ Video uploaded!';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload video');
    }
    setIsUploading(false);
  };

  const handleEditCoach = (coach) => {
    setEditingCoach(coach);
    setCoachFormData({
      name: coach.name || "",
      bio: coach.bio || "",
      demo_video_url: coach.demo_video_url || "",
      specialty: coach.specialty || "",
      is_active: coach.is_active ?? true,
    });
    setCoachDialogOpen(true);
  };

  const handleSubmitCoach = () => {
    if (!coachFormData.name) {
      alert("Please enter coach name");
      return;
    }

    console.log('Creating/updating coach with data:', coachFormData);

    if (editingCoach) {
      updateCoachMutation.mutate({ id: editingCoach.id, data: coachFormData });
    } else {
      createCoachMutation.mutate(coachFormData);
    }
  };

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    refetch();
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
    toast.textContent = '🔄 Coaches refreshed!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4" />
        <p className="text-slate-600">Loading coaches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-900 mb-2">Error Loading Coaches</h2>
            <p className="text-red-700 mb-4">{error.message || 'Unknown error occurred'}</p>
            <div className="bg-white p-4 rounded-lg mb-4">
              <p className="text-sm text-slate-600 mb-2">Debug info:</p>
              <pre className="text-xs text-left overflow-auto">
                {JSON.stringify({ error: error.toString(), user: user?.email, role: user?.role }, null, 2)}
              </pre>
            </div>
            <Button onClick={handleRefresh} className="bg-red-600 hover:bg-red-700 text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log('Rendering with coaches:', coaches);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Manage Coaches</h1>
            <p className="text-slate-600">
              Add coaches and their demonstration videos ({coaches?.length || 0} total)
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Logged in as: {user?.email} (Role: <strong>{user?.role || 'unknown'}</strong>)
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="border-slate-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={coachDialogOpen} onOpenChange={setCoachDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => resetCoachForm()}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Coach
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingCoach ? 'Edit Coach' : 'Add New Coach'}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Coach Name *</label>
                    <Input
                      value={coachFormData.name}
                      onChange={(e) => setCoachFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., John Smith"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Specialty</label>
                    <Input
                      value={coachFormData.specialty}
                      onChange={(e) => setCoachFormData(prev => ({ ...prev, specialty: e.target.value }))}
                      placeholder="e.g., Bodybuilding, Calisthenics, CrossFit"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Bio</label>
                    <Textarea
                      value={coachFormData.bio}
                      onChange={(e) => setCoachFormData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Brief description about the coach..."
                      className="h-24"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Demo Video</label>
                    
                    {/* Toggle between YouTube and Upload */}
                    <div className="flex gap-2 mb-3">
                      <Button
                        type="button"
                        variant={videoInputType === 'youtube' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setVideoInputType('youtube')}
                        className={videoInputType === 'youtube' ? 'bg-red-600 hover:bg-red-700' : ''}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        YouTube Link
                      </Button>
                      <Button
                        type="button"
                        variant={videoInputType === 'upload' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setVideoInputType('upload')}
                        className={videoInputType === 'upload' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Video
                      </Button>
                    </div>

                    {videoInputType === 'youtube' ? (
                      <>
                        <Input
                          value={coachFormData.demo_video_url}
                          onChange={(e) => setCoachFormData(prev => ({ ...prev, demo_video_url: e.target.value }))}
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                        {coachFormData.demo_video_url && getYouTubeVideoId(coachFormData.demo_video_url) && (
                          <div className="mt-3">
                            <p className="text-xs text-purple-700 mb-2">Preview:</p>
                            <a
                              href={coachFormData.demo_video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block relative rounded-lg overflow-hidden group cursor-pointer hover:opacity-90 transition-opacity"
                            >
                              <img
                                src={`https://img.youtube.com/vi/${getYouTubeVideoId(coachFormData.demo_video_url)}/maxresdefault.jpg`}
                                alt="Video thumbnail"
                                className="w-full rounded-lg"
                                onError={(e) => {
                                  e.target.src = `https://img.youtube.com/vi/${getYouTubeVideoId(coachFormData.demo_video_url)}/hqdefault.jpg`;
                                }}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center group-hover:bg-opacity-50 transition-all">
                                <div className="bg-red-600 rounded-full p-4 group-hover:scale-110 transition-transform">
                                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                  </svg>
                                </div>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                                <p className="text-white text-sm font-semibold flex items-center gap-2">
                                  <ExternalLink className="w-4 h-4" />
                                  Click to watch on YouTube
                                </p>
                              </div>
                            </a>
                          </div>
                        )}
                        {coachFormData.demo_video_url && !getYouTubeVideoId(coachFormData.demo_video_url) && !coachFormData.demo_video_url.includes('supabase') && (
                          <p className="text-xs text-red-600 mt-2">
                            ⚠️ Invalid YouTube URL
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                          <input
                            type="file"
                            accept="video/*"
                            onChange={handleVideoUpload}
                            className="hidden"
                            id="video-upload"
                            disabled={isUploading}
                          />
                          <label htmlFor="video-upload" className="cursor-pointer">
                            {isUploading ? (
                              <div className="flex flex-col items-center">
                                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-2" />
                                <p className="text-sm text-slate-600">Uploading...</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <Upload className="w-10 h-10 text-slate-400 mb-2" />
                                <p className="text-sm text-slate-600">Click to upload video</p>
                                <p className="text-xs text-slate-400 mt-1">Max 100MB • MP4, MOV, WebM</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Show uploaded video preview */}
                    {coachFormData.demo_video_url && coachFormData.demo_video_url.includes('supabase') && (
                      <div className="mt-3">
                        <p className="text-xs text-green-700 mb-2">✅ Uploaded Video:</p>
                        <video
                          src={coachFormData.demo_video_url}
                          controls
                          className="w-full rounded-lg max-h-48"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCoachFormData(prev => ({ ...prev, demo_video_url: '' }))}
                          className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remove Video
                        </Button>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleSubmitCoach}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingCoach ? 'Update Coach' : 'Create Coach'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {(!coaches || coaches.length === 0) ? (
        <Card className="p-12 text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h2 className="text-2xl font-bold mb-2">No Coaches Found</h2>
          <p className="text-slate-600 mb-2">
            {user?.role === 'admin' 
              ? 'Add your first coach to get started' 
              : '⚠️ You need admin role to manage coaches'}
          </p>
          <p className="text-xs text-slate-500 mb-6">
            Check the browser console for detailed debugging info
          </p>
          <Button
            onClick={() => {
              resetCoachForm();
              setCoachDialogOpen(true);
            }}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add First Coach
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coaches.map((coach) => (
            <Card key={coach.id} className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center justify-between">
                  <span>{coach.name}</span>
                  {!coach.is_active && (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      Inactive
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
                {coach.demo_video_url && (
                  <a
                    href={coach.demo_video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mb-3 text-sm text-purple-600 hover:text-purple-700"
                  >
                    <Video className="w-4 h-4" />
                    <span>View Demo Video</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditCoach(coach)}
                    className="flex-1"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Delete coach "${coach.name}"?`)) {
                        deleteCoachMutation.mutate(coach.id);
                      }
                    }}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
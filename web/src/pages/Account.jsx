import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Crown, Sparkles, CheckCircle2, Calendar, Mail, User as UserIcon, ArrowRight, Target, Dumbbell, Cake, Check, RefreshCw, Video, Lock, LogOut, Pencil, Save, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { createPortalSession } from "@/api/functions";
import { createCheckout } from "@/api/functions";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AccountUpgradeModal from "../components/premium/AccountUpgradeModal";

export default function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setIsLoading(false);
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

  const { data: coaches } = useQuery({
    queryKey: ['coaches'],
    queryFn: () => base44.entities.Coach.filter({ is_active: true }, 'name'),
    enabled: !!user,
  });

  const handleManageSubscription = async () => {
    setIsManagingSubscription(true);
    try {
      const response = await createPortalSession({});
      if (response.data && response.data.url) {
        window.top.location.href = response.data.url;
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error) {
      console.error('Error accessing subscription portal:', error);
      alert('Error accessing subscription management. Please try again.');
      setIsManagingSubscription(false);
    }
  };

  const handleUpgrade = async (selectedPlan) => {
    setIsUpgrading(true);
    try {
      const checkoutParams = selectedPlan ? {
        plan_type: selectedPlan.plan_type,
        stripe_price_id: selectedPlan.stripe_price_id
      } : {};
      const response = await createCheckout(checkoutParams);
      if (response.data && response.data.url) {
        window.top.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Error starting checkout. Please try again.');
      setIsUpgrading(false);
    }
  };

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
      if (!profile) throw new Error('No profile found');
      
      await base44.entities.UserProfile.update(profile.id, {
        preferred_coach_id: coachId
      });
      
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

  // Profile update mutation - updates individual fields without regenerating schedule
  const updateProfileFieldMutation = useMutation({
    mutationFn: async ({ field, value }) => {
      if (!profile) throw new Error('No profile found');
      await base44.entities.UserProfile.update(profile.id, { [field]: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
      toast.textContent = '✅ Profile updated!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const isOnTrial = user?.trial_end_date && new Date(user.trial_end_date) > new Date() && user?.subscription_tier === 'premium';
  const isPremium = user?.subscription_tier === 'premium';
  const isAdmin = user?.role === 'admin';
  const formatText = (text) => text?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <AccountUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
        isUpgrading={isUpgrading}
      />
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Account</h1>
            {isPremium ? (
              <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 text-base">
                <Crown className="w-4 h-4 mr-2" />
                {isOnTrial ? 'Premium Trial' : 'Premium Member'}
              </Badge>
            ) : isAdmin ? (
              <Badge className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 text-base">
                <Crown className="w-4 h-4 mr-2" />
                Administrator
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-slate-100 text-slate-700 px-4 py-2 text-base">
                Free Account
              </Badge>
            )}
          </div>
        </div>
        <p className="text-slate-600">Manage your subscription, profile and preferences</p>
      </div>

      <Tabs defaultValue="subscription" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="coach">Coach</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="space-y-6">
          {/* Upgrade Banner - Top */}
          {!isPremium && !isAdmin && (
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg text-white shadow-lg">
              <div>
                <p className="font-bold text-lg">Unlock Premium Features</p>
                <p className="text-sm text-blue-100">£7.99/month • Cancel anytime</p>
              </div>
              <Button
                onClick={() => setShowUpgradeModal(true)}
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                Upgrade Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Features Comparison Card */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Features Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Standard Features */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-slate-600" />
                    </div>
                    <h3 className="font-bold text-slate-900">Standard User Features</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm text-slate-900">Set your goals</p>
                        <p className="text-xs text-slate-600">Customize your fitness objectives</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm text-slate-900">Generate a personalised workout</p>
                        <p className="text-xs text-slate-600">Your workout schedule created by gym experts</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm text-slate-900">Track your progress</p>
                        <p className="text-xs text-slate-600">See your performance stats as you achieve</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Premium Features */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-lg flex items-center justify-center shadow-md">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-slate-900">Premium User Features</h3>
                    {!isPremium && !isAdmin && (
                      <Badge className="bg-blue-600 text-white ml-auto">
                        Upgrade
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className={`flex items-start gap-3 p-3 rounded-lg ${
                      isPremium || isAdmin ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 opacity-60'
                    }`}>
                      <CheckCircle2 className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        isPremium || isAdmin ? 'text-blue-600' : 'text-slate-400'
                      }`} />
                      <div>
                        <p className="font-semibold text-sm text-slate-900">Record your own in-session workout videos</p>
                        <p className="text-xs text-slate-600">Capture your workout to review and share using video/stats templates optimised for social media</p>
                      </div>
                    </div>
                    <div className={`flex items-start gap-3 p-3 rounded-lg ${
                      isPremium || isAdmin ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 opacity-60'
                    }`}>
                      <CheckCircle2 className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        isPremium || isAdmin ? 'text-blue-600' : 'text-slate-400'
                      }`} />
                      <div>
                        <p className="font-semibold text-sm text-slate-900">Personalise your workouts</p>
                        <p className="text-xs text-slate-600">Create your own/add workouts from our library</p>
                      </div>
                    </div>
                    <div className={`flex items-start gap-3 p-3 rounded-lg ${
                      isPremium || isAdmin ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 opacity-60'
                    }`}>
                      <CheckCircle2 className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        isPremium || isAdmin ? 'text-blue-600' : 'text-slate-400'
                      }`} />
                      <div>
                        <p className="font-semibold text-sm text-slate-900">View coaches' videos</p>
                        <p className="text-xs text-slate-600">See expert YouTube coach demonstrations for your workout exercises</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


            </CardContent>
          </Card>

          {/* Account Status Card */}
          <Card className={`border-none shadow-lg ${
            isPremium 
              ? 'bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100' 
              : 'bg-gradient-to-br from-slate-50 to-white'
          }`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {isPremium ? (
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-slate-200 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-8 h-8 text-slate-600" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      {isPremium ? (isOnTrial ? 'Premium Trial' : 'Premium Member') : 'Free Account'}
                      {isPremium && (
                        <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-none">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {isOnTrial ? 'Trial Active' : 'Active'}
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-1">
                      {isPremium 
                        ? (isOnTrial 
                            ? `Free trial until ${format(new Date(user.trial_end_date), 'MMM d, yyyy')}` 
                            : 'You have full access to all premium features')
                        : 'Upgrade to unlock premium workout customization'}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isPremium ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 bg-white/50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-900">Edit Workouts</p>
                        <p className="text-sm text-slate-600">Customize your weekly schedule</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-white/50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-900">Swap Days</p>
                        <p className="text-sm text-slate-600">Move workouts between days</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={handleManageSubscription}
                        disabled={isManagingSubscription}
                        variant="outline"
                        className="w-full md:w-auto"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {isManagingSubscription ? 'Loading...' : 'Manage Subscription'}
                      </Button>
                      <Button
                        onClick={handleManageSubscription}
                        disabled={isManagingSubscription}
                        variant="outline"
                        className="w-full md:w-auto border-red-300 text-red-600 hover:bg-red-50"
                      >
                        {isManagingSubscription ? 'Loading...' : 'Cancel Subscription'}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Update payment method, view invoices, or cancel your subscription
                    </p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* User Information Card */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-slate-600" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                  <Mail className="w-5 h-5 text-slate-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 mb-1">Email Address</p>
                    <p className="font-semibold text-slate-900">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                  <UserIcon className="w-5 h-5 text-slate-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 mb-1">Full Name</p>
                    <p className="font-semibold text-slate-900">{user?.full_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-slate-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 mb-1">Member Since</p>
                    <p className="font-semibold text-slate-900">
                      {format(new Date(user?.created_date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Crown className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-600 mb-1">Account Type</p>
                      <p className="font-semibold text-blue-900">Administrator</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200">
                  <Button
                    onClick={() => base44.auth.logout()}
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          {!profile ? (
            <Card>
              <CardContent className="text-center py-12">
                <UserIcon className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <h2 className="text-2xl font-bold mb-2">No Profile Found</h2>
                <p className="text-slate-600 mb-6">Complete the questionnaire to get started</p>
                <Button
                  onClick={() => navigate(createPageUrl("Questionnaire"))}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                >
                  Start Questionnaire
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800">
                  💡 <strong>Tip:</strong> Updating these settings will NOT affect your current workout schedule or history. 
                  To regenerate your workout plan based on new settings, use the questionnaire.
                </p>
              </div>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Personal Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-blue-600" />
                          <p className="text-sm text-slate-500">Gender</p>
                        </div>
                      </div>
                      <Select
                        value={profile.gender}
                        onValueChange={(value) => updateProfileFieldMutation.mutate({ field: 'gender', value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Cake className="w-4 h-4 text-pink-600" />
                          <p className="text-sm text-slate-500">Age Range</p>
                        </div>
                      </div>
                      <Select
                        value={profile.age_range}
                        onValueChange={(value) => updateProfileFieldMutation.mutate({ field: 'age_range', value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="under_25">Under 25</SelectItem>
                          <SelectItem value="26-35">26-35</SelectItem>
                          <SelectItem value="36-45">36-45</SelectItem>
                          <SelectItem value="46-55">46-55</SelectItem>
                          <SelectItem value="56+">56+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-purple-600" />
                          <p className="text-sm text-slate-500">Experience Level</p>
                        </div>
                      </div>
                      <Select
                        value={profile.experience_level || 'intermediate'}
                        onValueChange={(value) => updateProfileFieldMutation.mutate({ field: 'experience_level', value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-green-600" />
                          <p className="text-sm text-slate-500">Body Type</p>
                        </div>
                      </div>
                      <Select
                        value={profile.body_type || 'average'}
                        onValueChange={(value) => updateProfileFieldMutation.mutate({ field: 'body_type', value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="slim">Slim</SelectItem>
                          <SelectItem value="average">Average</SelectItem>
                          <SelectItem value="athletic">Athletic</SelectItem>
                          <SelectItem value="heavy">Heavy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Fitness Goals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        <p className="text-sm text-slate-500">Primary Goal</p>
                      </div>
                    </div>
                    <Select
                      value={profile.primary_goal}
                      onValueChange={(value) => updateProfileFieldMutation.mutate({ field: 'primary_goal', value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tone_body">Tone Body</SelectItem>
                        <SelectItem value="build_muscle">Build Muscle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Training Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-purple-600" />
                        <p className="text-sm text-slate-500">Equipment Access</p>
                      </div>
                    </div>
                    <Select
                      value={profile.equipment_access}
                      onValueChange={(value) => updateProfileFieldMutation.mutate({ field: 'equipment_access', value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_gym">Full Gym</SelectItem>
                        <SelectItem value="bodyweight_only">At Home</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-2">💡 If you want to train at home and at a gym, select Full Gym</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Training Days
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                      const isSelected = profile.available_days?.includes(day);
                      return (
                        <div
                          key={day}
                          onClick={() => {
                            const currentDays = profile.available_days || [];
                            const newDays = isSelected
                              ? currentDays.filter(d => d !== day)
                              : [...currentDays, day];
                            updateProfileFieldMutation.mutate({ field: 'available_days', value: newDays });
                          }}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-100 border-2 border-blue-500'
                              : 'bg-slate-50 border-2 border-transparent hover:border-slate-300'
                          }`}
                        >
                          <Checkbox checked={isSelected} />
                          <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                            {formatText(day)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">Want to regenerate your workout plan?</p>
                      <p className="text-sm text-slate-600">Use the questionnaire to create a new schedule based on your updated preferences</p>
                    </div>
                    <Button
                      onClick={() => navigate(createPageUrl("Questionnaire"))}
                      variant="outline"
                      className="border-blue-300 text-blue-600 hover:bg-blue-100"
                    >
                      Go to Questionnaire
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="coach" className="space-y-6">
          {(!coaches || coaches.length === 0) ? (
            <Card className="p-12 text-center">
              <UserIcon className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-600">No coaches available yet</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {coaches.map((coach) => {
                const isSelected = profile?.preferred_coach_id === coach.id;
                
                return (
                  <Card 
                    key={coach.id} 
                    className={`border-2 transition-all ${
                      isSelected 
                        ? 'border-blue-600 shadow-lg' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center justify-between">
                        <span>{coach.name}</span>
                        {isSelected && (
                          <Badge className="bg-blue-600 text-white">
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
                            : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
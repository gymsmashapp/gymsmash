
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dumbbell, Settings, Users, Video, Crown, UserPlus, BarChart3, Trophy, Camera, Image } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import UpgradeModal from "./components/premium/UpgradeModal";
import { createCheckout } from "@/api/functions";

const navItems = [
  { title: "Workouts", url: createPageUrl("Dashboard"), icon: Dumbbell },
  { title: "Performance", url: createPageUrl("History"), icon: BarChart3 },
  { title: "Media", url: createPageUrl("Media"), icon: Video, premium: true, hasSecondary: true },
  { title: "Community", url: createPageUrl("Community"), icon: Trophy },
  { title: "Buddies", url: createPageUrl("Buddies"), icon: UserPlus },
  { title: "Settings", url: createPageUrl("Account"), icon: Settings },
];

const mediaSecondaryNav = [
  { title: "Videos", url: createPageUrl("Media") + "?tab=videos", icon: Video },
  { title: "Photos", url: createPageUrl("Media") + "?tab=photos", icon: Camera },
  { title: "Stats", url: createPageUrl("Media") + "?tab=stats", icon: BarChart3 },
];

const adminItems = [
  { title: "Manage Workouts", url: createPageUrl("AdminWorkouts"), icon: Settings },
  { title: "Manage Coaches", url: createPageUrl("AdminCoaches"), icon: Users },
  { title: "View All Users", url: createPageUrl("AdminUsers"), icon: Users },
  { title: "Premium Features", url: createPageUrl("AdminPremium"), icon: Crown },
];

function LayoutContent({ children, user, isAdmin, isPremium, currentPageName }) {
  const location = useLocation();
  const isMediaPage = currentPageName === 'Media';
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const [isUpgrading, setIsUpgrading] = React.useState(false);
  const [upgradeFeatureName, setUpgradeFeatureName] = React.useState("");

  // Check for unread buddy messages
  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['unread-buddy-messages', user?.email],
    queryFn: async () => {
      const messages = await base44.entities.BuddyMessage.filter({
        to_email: user.email,
        is_read: false
      });
      return messages.filter(m => new Date(m.expires_at) > new Date());
    },
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  const hasUnreadMessages = unreadMessages.length > 0;

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

  const handlePremiumNavClick = (item, e) => {
    if (item.premium && !isPremium && !isAdmin) {
      e.preventDefault();
      setUpgradeFeatureName(item.title);
      setShowUpgradeModal(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
        isUpgrading={isUpgrading}
        featureName={upgradeFeatureName}
      />

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isMediaPage && (isPremium || isAdmin) ? 'pb-32' : 'pb-20'}`}>
        {children}
      </main>

      {/* Secondary Navigation for Media */}
      {isMediaPage && (isPremium || isAdmin) && (
        <nav className={`fixed left-0 right-0 bg-slate-50 border-t border-slate-200 px-2 py-2 z-40 ${isAdmin ? 'bottom-[140px]' : 'bottom-[70px]'}`}>
          <div className="flex justify-center gap-4 max-w-lg mx-auto">
            {mediaSecondaryNav.map((item) => {
              const params = new URLSearchParams(window.location.search);
              const currentTab = params.get('tab') || 'videos';
              const itemTab = item.url.split('tab=')[1];
              const isActive = currentTab === itemTab;
              
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                    isActive 
                      ? item.title === 'Videos' ? 'bg-blue-600 text-white' 
                        : item.title === 'Photos' ? 'bg-purple-600 text-white'
                        : 'bg-green-600 text-white'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.title}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 z-50">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.url || (item.hasSecondary && isMediaPage);
            const isBuddies = item.title === "Buddies";

            return (
              <Link
                key={item.title}
                to={item.url}
                onClick={(e) => item.premium ? handlePremiumNavClick(item, e) : null}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all relative ${
                  isActive 
                    ? 'text-blue-600' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <item.icon className={`w-6 h-6 ${isActive ? 'text-blue-600' : ''}`} />
                <span className={`text-[10px] mt-1 ${isActive ? 'font-semibold' : ''}`}>
                  {item.title}
                </span>
                {isBuddies && hasUnreadMessages && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Admin quick access */}
        {isAdmin && (
          <div className="flex justify-center gap-4 mt-2 pt-2 border-t border-slate-100">
            {adminItems.map((item) => (
              <Link
                key={item.title}
                to={item.url}
                className={`p-2 rounded-lg transition-all ${
                  location.pathname === item.url 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title={item.title}
              >
                <item.icon className="w-5 h-5" />
              </Link>
            ))}
          </div>
        )}
      </nav>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';
  const isPremium = user?.subscription_tier === 'premium';

  // Pages that don't need the layout
  const noLayoutPages = ['Home'];
  if (noLayoutPages.includes(currentPageName)) {
    return <>{children}</>;
  }

  return (
    <LayoutContent 
      children={children} 
      user={user} 
      isAdmin={isAdmin} 
      isPremium={isPremium}
      currentPageName={currentPageName}
    />
  );
}

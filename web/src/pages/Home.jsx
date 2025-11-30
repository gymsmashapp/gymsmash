import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { acceptBuddyInvite } from "@/api/functions";

export default function HomePage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        console.log("[Home] Starting user check...");
        
        // Check for buddy invite params
        const urlParams = new URLSearchParams(window.location.search);
        const buddyInviteId = urlParams.get('buddyInvite');
        const fromEmail = urlParams.get('from');
        
        // Check if user is authenticated
        const user = await base44.auth.me();
        console.log("[Home] User loaded:", user);
        
        if (!user) {
          console.log("[Home] No user, redirecting to login");
          // If there's a buddy invite, preserve it in the redirect
          if (buddyInviteId) {
            const currentUrl = window.location.href;
            base44.auth.redirectToLogin(currentUrl);
          } else {
            base44.auth.redirectToLogin();
          }
          return;
        }

        // If there's a buddy invite, process it
        if (buddyInviteId) {
          console.log("[Home] Processing buddy invite:", buddyInviteId);
          try {
            const result = await acceptBuddyInvite({ inviteId: buddyInviteId });
            if (result.data?.success) {
              console.log("[Home] Buddy invite accepted!");
              // Store buddy info for the Buddies page to show send sticker prompt
              sessionStorage.setItem('buddyAccepted', JSON.stringify({
                email: result.data.buddyEmail,
                name: result.data.buddyName || fromEmail,
                showSendSticker: result.data.showSendSticker,
                grantedTrial: result.data.grantedTrial,
                buddyPromoApplied: result.data.buddyPromoApplied
              }));
            }
          } catch (inviteError) {
            console.error("[Home] Error accepting buddy invite:", inviteError);
          }
        }

        // User is authenticated, check if they have a profile
        console.log("[Home] Fetching user profile...");
        const profiles = await base44.entities.UserProfile.filter({ 
          user_email: user.email 
        });
        console.log("[Home] Profiles found:", profiles);

        if (profiles.length > 0) {
          // If buddy was just accepted, go to Buddies page instead
          if (buddyInviteId && sessionStorage.getItem('buddyAccepted')) {
            console.log("[Home] Buddy accepted, navigating to Buddies page");
            navigate(createPageUrl("Buddies"), { replace: true });
          } else {
            // Has profile, go to Dashboard
            console.log("[Home] Profile exists, navigating to Dashboard");
            navigate(createPageUrl("Dashboard"), { 
              replace: true, 
              state: { user, userProfile: profiles[0] } 
            });
          }
        } else {
          // No profile, go to Questionnaire
          console.log("[Home] No profile, navigating to Questionnaire");
          navigate(createPageUrl("Questionnaire"), { 
            replace: true, 
            state: { user } 
          });
        }
      } catch (error) {
        console.error("[Home] Error during redirect:", error);
        setError(error.message);
        // On error, try to go to Dashboard after a short delay
        setTimeout(() => {
          navigate(createPageUrl("Dashboard"), { replace: true });
        }, 2000);
      }
    };

    checkUserAndRedirect();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center max-w-md p-6">
          <div className="text-red-400 mb-4">
            <p className="text-xl font-bold mb-2">Oops! Something went wrong</p>
            <p className="text-sm mb-4">{error}</p>
          </div>
          <p className="text-slate-400 text-sm">Redirecting to Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 relative">
          <div className="absolute inset-0 border-4 border-orange-500 rounded-full animate-ping opacity-20" />
          <div className="absolute inset-0 border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Loading Gym Smash</h2>
        <p className="text-slate-400">Please wait...</p>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Check, X, Mail, TrendingUp, Send, Trash2, RefreshCw } from "lucide-react";
import { sendBuddyInvite } from "@/api/functions";
import SendStickerModal from "../components/buddies/SendStickerModal";
import ReceivedStickers from "../components/buddies/ReceivedStickers";
import SentStickers from "../components/buddies/SentStickers";

export default function BuddiesPage() {
  const [user, setUser] = useState(null);
  const [buddyEmail, setBuddyEmail] = useState("");
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [selectedBuddyForSticker, setSelectedBuddyForSticker] = useState(null);
  const [newBuddyPrompt, setNewBuddyPrompt] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: sentRequests = [] } = useQuery({
    queryKey: ['buddy-requests-sent', user?.email],
    queryFn: () => base44.entities.WorkoutBuddy.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: receivedRequests = [] } = useQuery({
    queryKey: ['buddy-requests-received', user?.email],
    queryFn: () => base44.entities.WorkoutBuddy.filter({ buddy_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const users = await base44.asServiceRole.entities.User.list('full_name', 100);
      return users;
    },
    enabled: !!user,
  });

  const { data: allStats = [] } = useQuery({
    queryKey: ['all-stats'],
    queryFn: () => base44.entities.UserStats.list('-total_workouts', 100),
  });

  // Fetch received sticker messages (not expired)
  const { data: receivedMessages = [] } = useQuery({
    queryKey: ['buddy-messages', user?.email],
    queryFn: async () => {
      const messages = await base44.entities.BuddyMessage.filter({
        to_email: user.email
      });
      // Filter out expired messages
      return messages.filter(m => new Date(m.expires_at) > new Date());
    },
    enabled: !!user?.email,
    refetchInterval: 60000, // Refetch every minute to check for new messages
  });

  // Fetch sent sticker messages (not expired)
  const { data: sentMessages = [] } = useQuery({
    queryKey: ['buddy-messages-sent', user?.email],
    queryFn: async () => {
      const messages = await base44.entities.BuddyMessage.filter({
        from_email: user.email
      });
      // Filter out expired messages
      return messages.filter(m => new Date(m.expires_at) > new Date());
    },
    enabled: !!user?.email,
    refetchInterval: 60000,
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (email) => {
      // Create the buddy request in DB
      const invite = await base44.entities.WorkoutBuddy.create({
        user_email: user.email,
        buddy_email: email,
        status: 'pending',
        created_date: new Date().toISOString().split('T')[0]
      });
      // Send the invite email with invite ID for auto-linking
      await sendBuddyInvite({ buddyEmail: email, inviteId: invite.id });
    },
    onSuccess: () => {
      setBuddyEmail("");
      
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.textContent = '✅ Buddy invite sent!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      
      // Refresh page to show the pending invite
      window.location.reload();
    },
  });

  const respondToRequestMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.WorkoutBuddy.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buddy-requests-received'] });
      queryClient.invalidateQueries({ queryKey: ['buddy-requests-sent'] });
    },
  });

  const dismissMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.BuddyMessage.update(messageId, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buddy-messages'] });
    },
  });

  const deleteBuddyMutation = useMutation({
    mutationFn: async (buddyId) => {
      await base44.entities.WorkoutBuddy.delete(buddyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buddy-requests-sent'] });
      queryClient.invalidateQueries({ queryKey: ['buddy-requests-received'] });
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.textContent = '✅ Removed successfully';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    },
  });

  const acceptedBuddies = [...sentRequests, ...receivedRequests].filter(r => r.status === 'accepted');
  const pendingSentRequests = sentRequests.filter(r => r.status === 'pending');

  const getBuddyData = (buddyEmail) => {
    const userData = allUsers.find(u => u.email === buddyEmail);
    const stats = allStats.find(s => s.user_email === buddyEmail);
    return { ...userData, ...stats };
  };

  const handleSendRequest = () => {
    if (!buddyEmail || buddyEmail === user.email) {
      alert('Please enter a valid email');
      return;
    }
    sendRequestMutation.mutate(buddyEmail);
  };

  // Check for buddy accepted notification
  React.useEffect(() => {
    const buddyAcceptedStr = sessionStorage.getItem('buddyAccepted');
    if (buddyAcceptedStr) {
      sessionStorage.removeItem('buddyAccepted');
      try {
        const buddyData = JSON.parse(buddyAcceptedStr);
        // Show success toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.innerHTML = buddyData.grantedTrial 
          ? `🎉 You're now workout buddies with ${buddyData.name || buddyData.email}!<br/><span class="text-sm">🎁 You've got 1 week of Premium free!</span>`
          : `🎉 You're now workout buddies with ${buddyData.name || buddyData.email}!`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);

        // Show buddy promo notification if applied (for the invite SENDER)
        if (buddyData.buddyPromoApplied) {
          setTimeout(() => {
            const promoToast = document.createElement('div');
            promoToast.className = 'fixed top-20 right-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-sm';
            promoToast.innerHTML = `
              <div class="font-bold text-lg mb-1">👑 Buddy Promo Unlocked!</div>
              <div class="text-sm opacity-90">You've got 4 months of Premium for the price of 1! Applied immediately to your account.</div>
            `;
            document.body.appendChild(promoToast);
            setTimeout(() => promoToast.remove(), 8000);
          }, 1000);
        }
        
        // Show send sticker prompt
        if (buddyData.showSendSticker) {
          setNewBuddyPrompt(buddyData);
        }
      } catch (e) {
        // Legacy format - just show toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.textContent = `🎉 You're now workout buddies!`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
      }
      // Refresh buddy lists
      queryClient.invalidateQueries({ queryKey: ['buddy-requests-sent'] });
      queryClient.invalidateQueries({ queryKey: ['buddy-requests-received'] });
    }
  }, [queryClient]);

  const handleSendSticker = (buddyEmail, buddyName) => {
    setSelectedBuddyForSticker({ email: buddyEmail, name: buddyName });
    setShowStickerModal(true);
  };

  // Get sender names for received messages
  const senderNames = React.useMemo(() => {
    const names = {};
    receivedMessages.forEach(msg => {
      const userData = allUsers.find(u => u.email === msg.from_email);
      names[msg.from_email] = userData?.full_name || msg.from_email;
    });
    return names;
  }, [receivedMessages, allUsers]);

  // Get recipient names for sent messages
  const recipientNames = React.useMemo(() => {
    const names = {};
    sentMessages.forEach(msg => {
      const userData = allUsers.find(u => u.email === msg.to_email);
      names[msg.to_email] = userData?.full_name || msg.to_email;
    });
    return names;
  }, [sentMessages, allUsers]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <SendStickerModal
        isOpen={showStickerModal}
        onClose={() => {
          setShowStickerModal(false);
          setSelectedBuddyForSticker(null);
        }}
        buddyEmail={selectedBuddyForSticker?.email}
        buddyName={selectedBuddyForSticker?.name}
        onSent={() => {
          setNewBuddyPrompt(null);
          queryClient.invalidateQueries({ queryKey: ['buddy-messages'] });
        }}
      />

      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Workout Buddies</h1>
        <p className="text-slate-600">Connect with friends and share your fitness journey</p>
      </div>

      {/* Received Stickers */}
      <ReceivedStickers
        messages={receivedMessages.filter(m => !m.is_read)}
        senderNames={senderNames}
        onDismiss={(id) => dismissMessageMutation.mutate(id)}
      />

      {/* Sent Stickers */}
      <SentStickers
        messages={sentMessages}
        recipientNames={recipientNames}
      />

      {/* New Buddy Prompt */}
      {newBuddyPrompt && (
        <Card className="mb-6 border-none shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-green-900">
                  🎉 You're now buddies with {newBuddyPrompt.name || newBuddyPrompt.email}!
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Send them a motivational sticker to celebrate!
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setNewBuddyPrompt(null)}
                  className="border-green-300"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={() => handleSendSticker(newBuddyPrompt.email, newBuddyPrompt.name)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Sticker
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Add a Workout Buddy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Enter buddy's email"
              value={buddyEmail}
              onChange={(e) => setBuddyEmail(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleSendRequest}
              disabled={sendRequestMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Request
            </Button>
          </div>
        </CardContent>
      </Card>

      {receivedRequests.filter(r => r.status === 'pending').length > 0 && (
        <Card className="mb-6 border-none shadow-lg bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-orange-600" />
              Pending Requests ({receivedRequests.filter(r => r.status === 'pending').length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {receivedRequests.filter(r => r.status === 'pending').map((request) => {
                const buddy = getBuddyData(request.user_email);
                return (
                  <div key={request.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-200">
                    <div>
                      <p className="font-semibold text-slate-900">{buddy.full_name || 'Unknown User'}</p>
                      <p className="text-sm text-slate-600">{request.user_email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => respondToRequestMutation.mutate({ id: request.id, status: 'accepted' })}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respondToRequestMutation.mutate({ id: request.id, status: 'rejected' })}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            My Workout Buddies ({acceptedBuddies.length + pendingSentRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {acceptedBuddies.length === 0 && pendingSentRequests.length === 0 ? (
            <p className="text-slate-600 text-center py-8">
              No workout buddies yet. Send a request to connect!
            </p>
          ) : (
            <div className="space-y-4">
              {/* Pending sent requests */}
              {pendingSentRequests.map((request) => (
                <Card key={request.id} className="border border-yellow-200 bg-yellow-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-lg text-slate-900">{request.buddy_email}</p>
                          <Badge className="bg-yellow-200 text-yellow-800 text-xs">Pending</Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          Invite sent {request.created_date ? new Date(request.created_date).toLocaleDateString() : 'recently'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                                                        onClick={async () => {
                                                          try {
                                                            await sendBuddyInvite({ buddyEmail: request.buddy_email, inviteId: request.id });
                                                            const toast = document.createElement('div');
                                                            toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                                                            toast.textContent = '✅ Invite resent!';
                                                            document.body.appendChild(toast);
                                                            setTimeout(() => toast.remove(), 3000);
                                                          } catch (e) {
                                                            alert('Failed to resend invite');
                                                          }
                                                        }}
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                                      >
                                                        Resend Invite
                                                      </Button>
                        <Button
                          onClick={() => {
                            if (confirm('Cancel this invite?')) {
                              deleteBuddyMutation.mutate(request.id);
                            }
                          }}
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {/* Accepted buddies */}
              {acceptedBuddies.map((buddy) => {
                const buddyEmail = buddy.user_email === user.email ? buddy.buddy_email : buddy.user_email;
                const buddyData = getBuddyData(buddyEmail);

                return (
                  <Card key={buddy.id} className="border border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-lg text-slate-900">{buddyData.full_name || 'Unknown User'}</p>
                          <p className="text-sm text-slate-600">{buddyEmail}</p>
                          <div className="flex gap-2 mt-3">
                            <Badge className="bg-blue-100 text-blue-800">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {buddyData.total_workouts || 0} workouts
                            </Badge>
                            <Badge className="bg-purple-100 text-purple-800">
                              {buddyData.current_streak || 0} week streak
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSendSticker(buddyEmail, buddyData.full_name)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send Sticker
                          </Button>
                          <Button
                            onClick={() => {
                              if (confirm('Remove this buddy?')) {
                                deleteBuddyMutation.mutate(buddy.id);
                              }
                            }}
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
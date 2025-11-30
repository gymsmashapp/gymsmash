import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

const STICKER_MAP = {
  proud_of_you: { emoji: "🏆", label: "Proud of You" },
  smashed_it: { emoji: "💪", label: "Smashed It" },
  keep_going: { emoji: "🔥", label: "Keep Going" },
  lets_go: { emoji: "🚀", label: "Let's Go!" },
  fire: { emoji: "🔥", label: "On Fire!" },
  muscle: { emoji: "💪", label: "Strong!" },
};

export default function SentStickers({ messages, recipientNames }) {
  if (!messages || messages.length === 0) return null;

  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Your Sent Stickers (visible for 24 hours)
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {messages.map((msg) => {
          const sticker = STICKER_MAP[msg.message_type] || { emoji: "✨", label: "Message" };
          const recipientName = recipientNames[msg.to_email] || msg.to_email;
          
          return (
            <Card key={msg.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{sticker.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-slate-900">
                      Sent to {recipientName}
                    </p>
                    <p className="text-xs text-slate-600">{sticker.label}</p>
                    {msg.custom_message && (
                      <p className="text-xs text-slate-500 mt-1 italic">"{msg.custom_message}"</p>
                    )}
                  </div>
                  <div className="text-xs text-blue-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getTimeRemaining(msg.expires_at)}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
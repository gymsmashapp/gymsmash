import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { format } from "date-fns";

const STICKER_INFO = {
  proud_of_you: { emoji: "🏆", label: "Proud of You" },
  smashed_it: { emoji: "💪", label: "Smashed It" },
  keep_going: { emoji: "🔥", label: "Keep Going" },
  lets_go: { emoji: "🚀", label: "Let's Go!" },
  fire: { emoji: "🔥", label: "On Fire!" },
  muscle: { emoji: "💪", label: "Strong!" },
};

export default function ReceivedStickers({ messages, senderNames, onDismiss }) {
  if (!messages || messages.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {messages.map((msg) => {
        const sticker = STICKER_INFO[msg.message_type] || { emoji: "💬", label: "Message" };
        const senderName = senderNames[msg.from_email] || msg.from_email;
        const expiresAt = new Date(msg.expires_at);
        const hoursLeft = Math.max(0, Math.round((expiresAt - new Date()) / (1000 * 60 * 60)));

        return (
          <Card key={msg.id} className="border-none shadow-lg bg-gradient-to-r from-purple-50 to-pink-50 animate-in slide-in-from-top duration-300">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md animate-bounce">
                    <span className="text-4xl">{sticker.emoji}</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">
                      {senderName} sent you: {sticker.label}!
                    </p>
                    {msg.custom_message && (
                      <p className="text-sm text-slate-600 mt-1">"{msg.custom_message}"</p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      Expires in {hoursLeft} hour{hoursLeft !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDismiss(msg.id)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
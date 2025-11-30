import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

const STICKERS = [
  { type: "proud_of_you", emoji: "🏆", label: "Proud of You" },
  { type: "smashed_it", emoji: "💪", label: "Smashed It" },
  { type: "keep_going", emoji: "🔥", label: "Keep Going" },
  { type: "lets_go", emoji: "🚀", label: "Let's Go!" },
  { type: "fire", emoji: "🔥", label: "On Fire!" },
  { type: "muscle", emoji: "💪", label: "Strong!" },
];

export default function SendStickerModal({ isOpen, onClose, buddyEmail, buddyName, onSent }) {
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!selectedSticker) return;
    
    setIsSending(true);
    try {
      const user = await base44.auth.me();
      
      // Create message that expires in 24 hours
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      await base44.entities.BuddyMessage.create({
        from_email: user.email,
        to_email: buddyEmail,
        message_type: selectedSticker,
        custom_message: customMessage || null,
        is_read: false,
        expires_at: expiresAt.toISOString()
      });

      onSent?.();
      onClose();
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.textContent = `✅ Sticker sent to ${buddyName || buddyEmail}!`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (error) {
      console.error("Error sending sticker:", error);
      alert("Failed to send sticker. Please try again.");
    }
    setIsSending(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send a Sticker to {buddyName || buddyEmail}</DialogTitle>
          <DialogDescription>
            Choose a motivational sticker to send your buddy!
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-3 gap-3 py-4">
          {STICKERS.map((sticker) => (
            <button
              key={sticker.type}
              onClick={() => setSelectedSticker(sticker.type)}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 hover:scale-105 ${
                selectedSticker === sticker.type
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-4xl">{sticker.emoji}</span>
              <span className="text-xs font-medium text-slate-700">{sticker.label}</span>
            </button>
          ))}
        </div>

        <Textarea
          placeholder="Add a personal message (optional)"
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          className="resize-none"
          rows={2}
        />

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!selectedSticker || isSending}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending ? "Sending..." : "Send Sticker"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
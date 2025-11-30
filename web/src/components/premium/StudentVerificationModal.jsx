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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function StudentVerificationModal({ isOpen, onClose, onVerified, studentPlan }) {
  const [studentEmail, setStudentEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState("email"); // email, verify
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sentEmail, setSentEmail] = useState("");

  const isValidStudentEmail = (email) => {
    // Common student email domains
    const studentDomains = ['.ac.uk', '.edu', '.edu.au', '.edu.sg', '.ac.nz', '.edu.cn', '.ac.jp', '.ac.in'];
    return studentDomains.some(domain => email.toLowerCase().endsWith(domain));
  };

  const handleSendCode = async () => {
    if (!studentEmail) {
      setError("Please enter your student email");
      return;
    }

    if (!isValidStudentEmail(studentEmail)) {
      setError("Please enter a valid student email address (e.g., ending in .ac.uk or .edu)");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Generate a 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store the code temporarily on the user
      const user = await base44.auth.me();
      await base44.auth.updateMe({
        student_verification_code: code,
        student_verification_email: studentEmail,
        student_verification_expires: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min expiry
      });

      // Send verification email
      await base44.integrations.Core.SendEmail({
        to: studentEmail,
        subject: "Gym Smash - Student Verification Code",
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #C8102E;">🎓 Student Verification</h2>
            <p>Hi there!</p>
            <p>Your verification code for Gym Smash student discount is:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1e40af;">${code}</span>
            </div>
            <p>This code expires in 15 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">— The Gym Smash Team</p>
          </div>
        `
      });

      setSentEmail(studentEmail);
      setStep("verify");
    } catch (err) {
      console.error("Error sending verification:", err);
      setError("Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const user = await base44.auth.me();
      
      // Check if code matches and hasn't expired
      if (user.student_verification_code !== verificationCode) {
        setError("Invalid verification code. Please try again.");
        setIsLoading(false);
        return;
      }

      if (new Date(user.student_verification_expires) < new Date()) {
        setError("Verification code has expired. Please request a new one.");
        setStep("email");
        setIsLoading(false);
        return;
      }

      // Mark user as student verified
      await base44.auth.updateMe({
        student_verified: true,
        student_email: sentEmail,
        student_verified_date: new Date().toISOString(),
        student_verification_code: null,
        student_verification_expires: null
      });

      // Proceed to checkout with student plan
      onVerified(studentPlan);
    } catch (err) {
      console.error("Error verifying code:", err);
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep("email");
    setStudentEmail("");
    setVerificationCode("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl text-center">
            Student Verification
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {step === "email" 
              ? "Enter your student email to verify your student status"
              : `Enter the code sent to ${sentEmail}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {step === "email" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="studentEmail">Student Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="studentEmail"
                    type="email"
                    placeholder="your.name@university.ac.uk"
                    value={studentEmail}
                    onChange={(e) => {
                      setStudentEmail(e.target.value);
                      setError("");
                    }}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Must be a valid student email (e.g., .ac.uk, .edu)
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSendCode} 
                  disabled={isLoading || !studentEmail}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Code"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value.replace(/\D/g, ''));
                    setError("");
                  }}
                  className="text-center text-2xl tracking-widest"
                />
                <p className="text-xs text-slate-500 text-center">
                  Check your student email for the 6-digit code
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("email")} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleVerifyCode} 
                  disabled={isLoading || verificationCode.length !== 6}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Verify & Continue
                    </>
                  )}
                </Button>
              </div>

              <button 
                onClick={() => { setStep("email"); setError(""); }}
                className="w-full text-sm text-blue-600 hover:underline"
              >
                Didn't receive the code? Try again
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
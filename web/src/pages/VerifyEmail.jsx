import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

export default function VerifyEmailPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
        setError("Please log in to verify your email");
      }
      setIsLoading(false);
    };
    loadUser();
  }, []);

  const handleResendVerification = async () => {
    if (!user) return;
    
    setIsSending(true);
    setMessage(null);
    setError(null);

    try {
      await base44.functions.invoke('sendVerificationEmail', {
        email: user.email,
        fullName: user.full_name
      });
      
      setMessage("Verification email sent! Please check your inbox and spam folder.");
    } catch (err) {
      console.error("Error sending verification email:", err);
      setError("Failed to send verification email. Please try again later.");
    }
    
    setIsSending(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
            <p className="text-slate-600 mb-6">Please log in to access email verification</p>
            <Button
              onClick={() => base44.auth.redirectToLogin()}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <Card className="max-w-md w-full border-none shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-slate-600 mb-2">Signed in as:</p>
            <p className="font-semibold text-slate-900">{user.email}</p>
          </div>

          {message && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h3 className="font-semibold mb-2 text-slate-900">Need a verification email?</h3>
            <p className="text-sm text-slate-600 mb-4">
              Click the button below to receive a new verification email. Check your inbox and spam folder.
            </p>
            <Button
              onClick={handleResendVerification}
              disabled={isSending}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-500">
              Didn't receive an email? Please check your spam folder or contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft } from "lucide-react";

export default function QuestionStep({ 
  title, 
  subtitle,
  children, 
  onNext, 
  onBack,
  currentStep,
  totalSteps,
  canProgress = true,
  showButtons = true
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto"
    >
      <Card className="border-none shadow-2xl bg-white/80 backdrop-blur">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500">
              Step {currentStep} of {totalSteps}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i < currentStep 
                      ? 'w-8 bg-orange-500' 
                      : i === currentStep - 1
                      ? 'w-12 bg-orange-500'
                      : 'w-8 bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-slate-900">
            {title}
          </CardTitle>
          {subtitle && (
            <p className="text-slate-600 mt-2">{subtitle}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {children}
          
          {showButtons && (
            <div className="flex gap-3 pt-4">
              {onBack && (
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="flex-1"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              {onNext && (
                <Button
                  onClick={onNext}
                  disabled={!canProgress}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                >
                  {currentStep === totalSteps ? 'Generate My Plan' : 'Continue'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
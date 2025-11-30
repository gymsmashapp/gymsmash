import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, CheckCircle2, ArrowRight, GraduationCap, Loader2, Sparkles, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import StudentVerificationModal from "./StudentVerificationModal";

export default function AccountUpgradeModal({ isOpen, onClose, onUpgrade, isUpgrading }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showStudentVerification, setShowStudentVerification] = useState(false);
  const [pendingStudentPlan, setPendingStudentPlan] = useState(null);

  const { data: pricingPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['pricing-plans-account-modal'],
    queryFn: async () => {
      const plans = await base44.entities.PricingConfig.filter({ is_active: true });
      // Filter out buddy promo - it's auto-applied when user gets 5 accepted invites
      const filteredPlans = plans.filter(p => !p.plan_name?.toLowerCase().includes('buddy promo'));
      return filteredPlans.sort((a, b) => a.price_monthly - b.price_monthly);
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (pricingPlans.length > 0 && !selectedPlan) {
      const standardPlan = pricingPlans.find(p => p.plan_type === 'standard');
      setSelectedPlan(standardPlan || pricingPlans[0]);
    }
  }, [pricingPlans, selectedPlan]);

  const handleUpgrade = () => {
    if (selectedPlan) {
      // If student plan, require verification first
      if (selectedPlan.plan_type === 'student') {
        setPendingStudentPlan(selectedPlan);
        setShowStudentVerification(true);
      } else {
        onUpgrade(selectedPlan);
      }
    }
  };

  const handleStudentVerified = (plan) => {
    setShowStudentVerification(false);
    onUpgrade(plan);
  };

  const getPlanIcon = (planType) => {
    switch (planType) {
      case 'student': return GraduationCap;
      case 'bundle_6month': return Sparkles;
      default: return Crown;
    }
  };

  const getPlanColor = (planType) => {
    switch (planType) {
      case 'student': return 'from-green-500 to-emerald-600';
      case 'bundle_6month': return 'from-purple-500 to-indigo-600';
      default: return 'from-amber-400 to-yellow-600';
    }
  };

  return (
    <>
    <StudentVerificationModal
      isOpen={showStudentVerification}
      onClose={() => setShowStudentVerification(false)}
      onVerified={handleStudentVerified}
      studentPlan={pendingStudentPlan}
    />
    <Dialog open={isOpen && !showStudentVerification} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl text-center flex items-center justify-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Upgrade To Premium
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Buddy Promo Banner */}
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-2.5 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2">
              <Gift className="w-4 h-4" />
              <p className="font-bold text-sm">Invite 5 buddies, get 5 months FREE!</p>
            </div>
          </div>

          {/* Features List - Compact */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-900">Record & share workout videos with stats</p>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-900">Customize your workouts from our library</p>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-900">Watch expert coach demonstrations</p>
              </div>
            </div>
          </div>

          {/* Pricing Plans */}
          {plansLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {pricingPlans.map((plan) => {
                const Icon = getPlanIcon(plan.plan_type);
                const colorClass = getPlanColor(plan.plan_type);
                const isSelected = selectedPlan?.id === plan.id;
                const isStudentPlan = plan.plan_type === 'student';
                const is6MonthPlan = plan.plan_type === 'bundle_6month';

                return (
                  <div 
                    key={plan.id} 
                    onClick={() => setSelectedPlan(plan)}
                    className={`p-2.5 rounded-lg border-2 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div className={`w-7 h-7 bg-gradient-to-br ${colorClass} rounded-md flex items-center justify-center`}>
                          <Icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-sm">{plan.plan_name}</span>
                            {is6MonthPlan && (
                              <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0">Best Value</Badge>
                            )}
                            {isStudentPlan && (
                              <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">.edu required</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm">£{plan.price_monthly.toFixed(2)}</span>
                        <span className="text-slate-500 text-xs">/mo</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-9"
              disabled={isUpgrading}
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={isUpgrading || !selectedPlan}
              className="flex-1 h-9 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
            >
              {isUpgrading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Upgrade Now
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
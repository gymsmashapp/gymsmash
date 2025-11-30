import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, CheckCircle2, ArrowRight, GraduationCap, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import StudentVerificationModal from "./StudentVerificationModal";

export default function UpgradeModal({ isOpen, onClose, onUpgrade, isUpgrading, featureName }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showStudentVerification, setShowStudentVerification] = useState(false);
  const [pendingStudentPlan, setPendingStudentPlan] = useState(null);

  const { data: pricingPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['pricing-plans-modal'],
    queryFn: async () => {
      const plans = await base44.entities.PricingConfig.filter({ is_active: true });
      // Filter out buddy promo - it's auto-applied when user gets 5 accepted invites
      const filteredPlans = plans.filter(p => !p.plan_name?.toLowerCase().includes('buddy promo'));
      return filteredPlans.sort((a, b) => a.price_monthly - b.price_monthly);
    },
    enabled: isOpen,
  });

  const { data: activeOffer } = useQuery({
    queryKey: ['active-offer-modal'],
    queryFn: async () => {
      const now = new Date().toISOString().split('T')[0];
      const offers = await base44.entities.SpecialOffer.filter({ is_active: true });
      return offers.find(o => o.start_date <= now && o.end_date >= now) || null;
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (pricingPlans.length > 0 && !selectedPlan) {
      const standardPlan = pricingPlans.find(p => p.plan_type === 'standard');
      setSelectedPlan(standardPlan || pricingPlans[0]);
    }
  }, [pricingPlans, selectedPlan]);

  const getDiscountedPrice = (plan) => {
    if (!activeOffer) return null;
    if (!activeOffer.applies_to_plans?.includes('all') && 
        !activeOffer.applies_to_plans?.includes(plan.plan_type)) {
      return null;
    }
    
    if (activeOffer.discount_type === 'percentage') {
      return plan.price_monthly * (1 - activeOffer.discount_value / 100);
    } else {
      return Math.max(0, plan.price_monthly - activeOffer.discount_value);
    }
  };

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

  // Fallback for when no plans exist yet
  const defaultPricing = pricingPlans.length === 0;

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
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
              <Crown className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl text-center">
            Premium Feature
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {featureName ? `"${featureName}" is a premium feature` : "This is a premium feature"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Active Offer Banner */}
          {activeOffer && (
            <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-3 rounded-lg text-center">
              <p className="font-bold">{activeOffer.banner_text || activeOffer.offer_name}</p>
              <p className="text-sm opacity-90">
                {activeOffer.discount_type === 'percentage' 
                  ? `${activeOffer.discount_value}% off` 
                  : `£${activeOffer.discount_value} off`}
                {' '}• Ends {new Date(activeOffer.end_date).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Features List */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-900 font-semibold mb-3">
              Unlock all premium features:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-blue-900">Post your own workout videos and stats</p>
                  <p className="text-xs text-blue-800">Capture your workout to review and share on socials</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-blue-900">Change your workouts</p>
                  <p className="text-xs text-blue-800">Create your own/add workouts from our library</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-blue-900">View coaches' videos</p>
                  <p className="text-xs text-blue-800">See expert demonstrations for exercises</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Plans */}
          {plansLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : defaultPricing ? (
            // Fallback default pricing
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 text-white text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5" />
                <span className="text-2xl font-bold">£7.99/month</span>
              </div>
              <p className="text-sm text-blue-100">£7.99/month • Cancel anytime</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Choose your plan:</p>
              {pricingPlans.map((plan) => {
                const Icon = getPlanIcon(plan.plan_type);
                const colorClass = getPlanColor(plan.plan_type);
                const discountedPrice = getDiscountedPrice(plan);
                const isSelected = selectedPlan?.id === plan.id;
                const isStudentPlan = plan.plan_type === 'student';

                return (
                  <div 
                    key={plan.id} 
                    onClick={() => setSelectedPlan(plan)}
                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 bg-gradient-to-br ${colorClass} rounded-lg flex items-center justify-center`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{plan.plan_name}</span>
                            {plan.plan_type === 'bundle_6month' && (
                              <Badge className="bg-purple-100 text-purple-700 text-xs">Best Value</Badge>
                            )}
                            {isStudentPlan && (
                              <Badge className="bg-green-100 text-green-700 text-xs">Student Email Required</Badge>
                            )}
                          </div>
                          {plan.description && (
                            <p className="text-xs text-slate-500">{plan.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {discountedPrice !== null && (
                            <span className="text-slate-400 line-through text-xs">
                              £{plan.price_monthly.toFixed(2)}
                            </span>
                          )}
                          <span className="font-bold">
                            £{(discountedPrice ?? plan.price_monthly).toFixed(2)}
                          </span>
                          <span className="text-slate-500 text-xs">/mo</span>
                        </div>
                        {plan.billing_period === '6_months' && plan.price_total && (
                          <p className="text-xs text-slate-500">
                            £{plan.price_total.toFixed(2)} total
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isUpgrading}
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={isUpgrading || (!selectedPlan && !defaultPricing)}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Upgrade Now
                  <ArrowRight className="w-4 h-4 ml-2" />
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
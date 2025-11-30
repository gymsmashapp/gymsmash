import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, GraduationCap, Sparkles, Check, ArrowRight } from "lucide-react";

export default function PricingPlans({ 
  plans, 
  activeOffer, 
  selectedPlan, 
  onSelectPlan, 
  onUpgrade, 
  isUpgrading,
  isStudentVerified = false 
}) {
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
    <div className="space-y-4">
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

      <div className="grid gap-4">
        {plans.map((plan) => {
          const Icon = getPlanIcon(plan.plan_type);
          const colorClass = getPlanColor(plan.plan_type);
          const discountedPrice = getDiscountedPrice(plan);
          const isSelected = selectedPlan?.plan_type === plan.plan_type;
          const isStudentPlan = plan.plan_type === 'student';
          const isDisabled = isStudentPlan && !isStudentVerified;

          return (
            <Card 
              key={plan.id} 
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:shadow-lg'
              } ${isDisabled ? 'opacity-60' : ''}`}
              onClick={() => !isDisabled && onSelectPlan(plan)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${colorClass} rounded-lg flex items-center justify-center shadow-md`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900">{plan.plan_name}</h3>
                        {plan.plan_type === 'bundle_6month' && (
                          <Badge className="bg-purple-100 text-purple-800 text-xs">Best Value</Badge>
                        )}
                        {isStudentPlan && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            {isStudentVerified ? 'Verified' : 'Verification Required'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{plan.description}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {discountedPrice !== null && (
                        <span className="text-slate-400 line-through text-sm">
                          £{plan.price_monthly.toFixed(2)}
                        </span>
                      )}
                      <span className="text-xl font-bold text-slate-900">
                        £{(discountedPrice ?? plan.price_monthly).toFixed(2)}
                      </span>
                      <span className="text-slate-600 text-sm">/month</span>
                    </div>
                    {plan.billing_period === '6_months' && plan.price_total && (
                      <p className="text-xs text-slate-500">
                        £{plan.price_total.toFixed(2)} total for 6 months
                      </p>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-3 flex items-center gap-2 text-blue-600 text-sm">
                    <Check className="w-4 h-4" />
                    <span>Selected</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedPlan && (
        <Button
          onClick={() => onUpgrade(selectedPlan)}
          disabled={isUpgrading || (selectedPlan.plan_type === 'student' && !isStudentVerified)}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-6"
        >
          {isUpgrading ? 'Loading...' : (
            <>
              Upgrade to {selectedPlan.plan_name}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
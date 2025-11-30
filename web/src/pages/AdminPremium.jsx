import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, CheckCircle2, Sparkles, ArrowLeft, Plus, Pencil, Trash2, Calendar, Percent, PoundSterling, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const premiumFeatures = [
  { id: 1, name: "My Media", description: "Access the My Media section to view and download all your workout videos and social media templates", category: "Media", benefit: "Store and share workout content" },
  { id: 2, name: "Create Workouts", description: "Create custom exercises and workout templates from our library", category: "Customization", benefit: "Build personalised workout routines" },
  { id: 3, name: "Add/Remove Workouts", description: "Add or remove workouts from your weekly schedule", category: "Customization", benefit: "Full control over daily workout assignments" },
  { id: 4, name: "Move Workout", description: "Swap workouts between different days in your schedule", category: "Customization", benefit: "Flexible scheduling to fit your lifestyle" },
  { id: 5, name: "Record workout videos", description: "Record your exercise sets during workouts with stats overlay", category: "Media", benefit: "Document progress and track form" },
  { id: 6, name: "View coaches' videos", description: "See expert YouTube coach demonstrations for your workout exercises", category: "Guidance", benefit: "Learn proper form from professionals" }
];

export default function AdminPremiumPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingOffer, setEditingOffer] = useState(null);

  const [planForm, setPlanForm] = useState({
    plan_type: 'standard',
    plan_name: '',
    price_monthly: '',
    price_total: '',
    stripe_price_id: '',
    description: '',
    billing_period: 'monthly',
    is_active: true
  });

  const [offerForm, setOfferForm] = useState({
    offer_name: '',
    discount_type: 'percentage',
    discount_value: '',
    applies_to_plans: ['all'],
    start_date: '',
    end_date: '',
    promo_code: '',
    stripe_coupon_id: '',
    banner_text: '',
    is_active: true
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser.role !== 'admin') {
          navigate(createPageUrl("Dashboard"));
        }
      } catch (error) {
        navigate(createPageUrl("Dashboard"));
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, [navigate]);

  const { data: pricingPlans = [] } = useQuery({
    queryKey: ['pricing-plans'],
    queryFn: () => base44.entities.PricingConfig.list('plan_type'),
    enabled: !isLoading && user?.role === 'admin',
  });

  const { data: specialOffers = [] } = useQuery({
    queryKey: ['special-offers'],
    queryFn: () => base44.entities.SpecialOffer.list('-created_date'),
    enabled: !isLoading && user?.role === 'admin',
  });

  const savePlanMutation = useMutation({
    mutationFn: async (data) => {
      if (editingPlan) {
        return base44.entities.PricingConfig.update(editingPlan.id, data);
      }
      return base44.entities.PricingConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-plans'] });
      setShowPlanDialog(false);
      setEditingPlan(null);
      resetPlanForm();
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.PricingConfig.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pricing-plans'] }),
  });

  const saveOfferMutation = useMutation({
    mutationFn: async (data) => {
      if (editingOffer) {
        return base44.entities.SpecialOffer.update(editingOffer.id, data);
      }
      return base44.entities.SpecialOffer.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['special-offers'] });
      setShowOfferDialog(false);
      setEditingOffer(null);
      resetOfferForm();
    },
  });

  const deleteOfferMutation = useMutation({
    mutationFn: (id) => base44.entities.SpecialOffer.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['special-offers'] }),
  });

  const resetPlanForm = () => {
    setPlanForm({
      plan_type: 'standard',
      plan_name: '',
      price_monthly: '',
      price_total: '',
      stripe_price_id: '',
      description: '',
      billing_period: 'monthly',
      is_active: true
    });
  };

  const resetOfferForm = () => {
    setOfferForm({
      offer_name: '',
      discount_type: 'percentage',
      discount_value: '',
      applies_to_plans: ['all'],
      start_date: '',
      end_date: '',
      promo_code: '',
      stripe_coupon_id: '',
      banner_text: '',
      is_active: true
    });
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      plan_type: plan.plan_type,
      plan_name: plan.plan_name,
      price_monthly: plan.price_monthly,
      price_total: plan.price_total || '',
      stripe_price_id: plan.stripe_price_id,
      description: plan.description || '',
      billing_period: plan.billing_period || 'monthly',
      is_active: plan.is_active
    });
    setShowPlanDialog(true);
  };

  const handleEditOffer = (offer) => {
    setEditingOffer(offer);
    setOfferForm({
      offer_name: offer.offer_name,
      discount_type: offer.discount_type,
      discount_value: offer.discount_value,
      applies_to_plans: offer.applies_to_plans || ['all'],
      start_date: offer.start_date,
      end_date: offer.end_date,
      promo_code: offer.promo_code || '',
      stripe_coupon_id: offer.stripe_coupon_id || '',
      banner_text: offer.banner_text || '',
      is_active: offer.is_active
    });
    setShowOfferDialog(true);
  };

  const handleSavePlan = () => {
    savePlanMutation.mutate({
      ...planForm,
      price_monthly: parseFloat(planForm.price_monthly),
      price_total: planForm.price_total ? parseFloat(planForm.price_total) : null,
    });
  };

  const handleSaveOffer = () => {
    saveOfferMutation.mutate({
      ...offerForm,
      discount_value: parseFloat(offerForm.discount_value),
    });
  };

  const getOfferStatus = (offer) => {
    const now = new Date();
    const start = new Date(offer.start_date);
    const end = new Date(offer.end_date);
    
    if (!offer.is_active) return { label: 'Disabled', color: 'bg-slate-100 text-slate-600' };
    if (now < start) return { label: 'Scheduled', color: 'bg-yellow-100 text-yellow-800' };
    if (now > end) return { label: 'Expired', color: 'bg-red-100 text-red-800' };
    return { label: 'Active', color: 'bg-green-100 text-green-800' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(createPageUrl("AdminUsers"))} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Users
        </Button>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Premium Management</h1>
        </div>
        <p className="text-slate-600">Manage pricing plans, special offers, and premium features</p>
      </div>

      <Tabs defaultValue="pricing" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pricing">Pricing Plans</TabsTrigger>
          <TabsTrigger value="offers">Special Offers</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Pricing Plans</h2>
            <Button onClick={() => { resetPlanForm(); setEditingPlan(null); setShowPlanDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Plan
            </Button>
          </div>

          {pricingPlans.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-slate-600 mb-4">No pricing plans configured yet.</p>
              <Button onClick={() => setShowPlanDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Plan
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pricingPlans.map((plan) => (
                <Card key={plan.id} className={`${!plan.is_active ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          plan.plan_type === 'student' ? 'bg-green-100' :
                          plan.plan_type === 'bundle_6month' ? 'bg-purple-100' : 'bg-amber-100'
                        }`}>
                          <Crown className={`w-6 h-6 ${
                            plan.plan_type === 'student' ? 'text-green-600' :
                            plan.plan_type === 'bundle_6month' ? 'text-purple-600' : 'text-amber-600'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{plan.plan_name}</h3>
                            <Badge variant="outline">{plan.plan_type}</Badge>
                            {!plan.is_active && <Badge className="bg-slate-100 text-slate-600">Inactive</Badge>}
                          </div>
                          <p className="text-sm text-slate-600">{plan.description}</p>
                          <p className="text-xs text-slate-500 mt-1">Stripe ID: {plan.stripe_price_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold">£{plan.price_monthly.toFixed(2)}</p>
                          <p className="text-sm text-slate-600">
                            {plan.billing_period === '6_months' ? 'per month (6mo bundle)' : 'per month'}
                          </p>
                          {plan.price_total && (
                            <p className="text-xs text-slate-500">Total: £{plan.price_total.toFixed(2)}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon" onClick={() => handleEditPlan(plan)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => {
                            if (confirm('Delete this plan?')) deletePlanMutation.mutate(plan.id);
                          }}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="offers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Special Offers</h2>
            <Button onClick={() => { resetOfferForm(); setEditingOffer(null); setShowOfferDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Offer
            </Button>
          </div>

          {specialOffers.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-slate-600 mb-4">No special offers configured yet.</p>
              <Button onClick={() => setShowOfferDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Offer
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {specialOffers.map((offer) => {
                const status = getOfferStatus(offer);
                return (
                  <Card key={offer.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                            {offer.discount_type === 'percentage' 
                              ? <Percent className="w-6 h-6 text-red-600" />
                              : <PoundSterling className="w-6 h-6 text-red-600" />
                            }
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg">{offer.offer_name}</h3>
                              <Badge className={status.color}>{status.label}</Badge>
                            </div>
                            <p className="text-sm text-slate-600">
                              {offer.discount_type === 'percentage' 
                                ? `${offer.discount_value}% off` 
                                : `£${offer.discount_value} off`}
                              {' '}• Applies to: {offer.applies_to_plans?.join(', ') || 'all'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                              <Calendar className="w-3 h-3" />
                              {offer.start_date} to {offer.end_date}
                              {offer.promo_code && (
                                <>
                                  <Tag className="w-3 h-3 ml-2" />
                                  Code: {offer.promo_code}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon" onClick={() => handleEditOffer(offer)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => {
                            if (confirm('Delete this offer?')) deleteOfferMutation.mutate(offer.id);
                          }}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <h2 className="text-xl font-bold">Premium Features</h2>
          <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Feature</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {premiumFeatures.map((feature) => (
                  <tr key={feature.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-slate-900">{feature.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">{feature.category}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{feature.description}</td>
                    <td className="px-6 py-4">
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Add Pricing Plan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plan Type</Label>
              <Select value={planForm.plan_type} onValueChange={(v) => setPlanForm({...planForm, plan_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="bundle_6month">6 Month Bundle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plan Name</Label>
              <Input value={planForm.plan_name} onChange={(e) => setPlanForm({...planForm, plan_name: e.target.value})} placeholder="e.g. Premium Monthly" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monthly Price (£)</Label>
                <Input type="number" step="0.01" value={planForm.price_monthly} onChange={(e) => setPlanForm({...planForm, price_monthly: e.target.value})} />
              </div>
              <div>
                <Label>Total Price (£) - for bundles</Label>
                <Input type="number" step="0.01" value={planForm.price_total} onChange={(e) => setPlanForm({...planForm, price_total: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Billing Period</Label>
              <Select value={planForm.billing_period} onValueChange={(v) => setPlanForm({...planForm, billing_period: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="6_months">6 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stripe Price ID</Label>
              <Input value={planForm.stripe_price_id} onChange={(e) => setPlanForm({...planForm, stripe_price_id: e.target.value})} placeholder="price_..." />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={planForm.description} onChange={(e) => setPlanForm({...planForm, description: e.target.value})} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={planForm.is_active} onCheckedChange={(v) => setPlanForm({...planForm, is_active: v})} />
              <Label>Active</Label>
            </div>
            <Button onClick={handleSavePlan} disabled={savePlanMutation.isPending} className="w-full">
              {savePlanMutation.isPending ? 'Saving...' : 'Save Plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOffer ? 'Edit Offer' : 'Add Special Offer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Offer Name</Label>
              <Input value={offerForm.offer_name} onChange={(e) => setOfferForm({...offerForm, offer_name: e.target.value})} placeholder="e.g. New Year Sale" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Type</Label>
                <Select value={offerForm.discount_type} onValueChange={(v) => setOfferForm({...offerForm, discount_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount Value</Label>
                <Input type="number" step="0.01" value={offerForm.discount_value} onChange={(e) => setOfferForm({...offerForm, discount_value: e.target.value})} placeholder={offerForm.discount_type === 'percentage' ? 'e.g. 20' : 'e.g. 2.00'} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={offerForm.start_date} onChange={(e) => setOfferForm({...offerForm, start_date: e.target.value})} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={offerForm.end_date} onChange={(e) => setOfferForm({...offerForm, end_date: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Applies to Plans</Label>
              <Select value={offerForm.applies_to_plans[0]} onValueChange={(v) => setOfferForm({...offerForm, applies_to_plans: [v]})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="standard">Standard Only</SelectItem>
                  <SelectItem value="student">Student Only</SelectItem>
                  <SelectItem value="bundle_6month">6 Month Bundle Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Promo Code (optional)</Label>
              <Input value={offerForm.promo_code} onChange={(e) => setOfferForm({...offerForm, promo_code: e.target.value})} placeholder="e.g. NEWYEAR20" />
            </div>
            <div>
              <Label>Stripe Coupon ID (optional)</Label>
              <Input value={offerForm.stripe_coupon_id} onChange={(e) => setOfferForm({...offerForm, stripe_coupon_id: e.target.value})} />
            </div>
            <div>
              <Label>Banner Text</Label>
              <Input value={offerForm.banner_text} onChange={(e) => setOfferForm({...offerForm, banner_text: e.target.value})} placeholder="e.g. 🎉 New Year Sale - 20% Off!" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={offerForm.is_active} onCheckedChange={(v) => setOfferForm({...offerForm, is_active: v})} />
              <Label>Active</Label>
            </div>
            <Button onClick={handleSaveOffer} disabled={saveOfferMutation.isPending} className="w-full">
              {saveOfferMutation.isPending ? 'Saving...' : 'Save Offer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
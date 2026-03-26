import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Switch } from "../components/ui/switch";
import {
  User,
  CreditCard,
  Bell,
  Shield,
  Check,
  Zap,
  FileText,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fallbackPlans = [
  {
    id: "basic",
    name: "Basic Advisor",
    monthly_price: 9.99,
    annual_monthly_price: 5.99,
    annual_price: 71.88,
    monthly_checkout_url: "https://whop.com/checkout/plan_PPUUTjaMeSwJ2",
    annual_checkout_url: "https://whop.com/checkout/plan_iwtWTjCmve5Xj",
    features: [
      "Document Simplifier",
      "AI Copilot Chat",
      "Upload PDFs & Images",
      "Key Points & Risks Analysis",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    monthly_price: 39.99,
    annual_monthly_price: 23.99,
    annual_price: 287.88,
    monthly_checkout_url: "https://whop.com/checkout/plan_2oAqaWyrKqxEL",
    annual_checkout_url: "https://whop.com/checkout/plan_6T3qi11GRXcq4",
    features: [
      "Everything in Basic",
      "AI Bookkeeper Assistant",
      "Transaction Categorization",
      "P&L, Monthly Summary",
      "MRR, Burn Rate, CAC Insights",
      "Auto Integrations (Shopify, Stripe, PayPal, Whop)",
      "Financial Statements Auto-Generated",
      "Manual Editing & Custom Entries",
      "PDF/CSV Export",
      "AI Tax Insights",
    ],
    popular: true,
  },
];

const normalizePlan = (plan) => {
  const fallbackPlan = fallbackPlans.find((p) => p.id === plan?.id);

  return {
    id: plan?.id || fallbackPlan?.id,
    name: plan?.name || fallbackPlan?.name,
    monthly_price: Number(plan?.monthly_price ?? fallbackPlan?.monthly_price),
    annual_monthly_price: Number(
      plan?.annual_monthly_price ?? fallbackPlan?.annual_monthly_price
    ),
    annual_price: Number(plan?.annual_price ?? fallbackPlan?.annual_price),
    features: Array.isArray(plan?.features)
      ? plan.features
      : fallbackPlan?.features,
    popular: Boolean(plan?.popular ?? fallbackPlan?.popular),
    monthly_checkout_url:
      plan?.monthly_checkout_url || fallbackPlan?.monthly_checkout_url,
    annual_checkout_url:
      plan?.annual_checkout_url || fallbackPlan?.annual_checkout_url,
  };
};

const SettingsPage = () => {
  const { user, token } = useAuth() || {};

  const [plans, setPlans] = useState(fallbackPlans.map(normalizePlan));
  const [isAnnual, setIsAnnual] = useState(false);
  const [name, setName] = useState(user?.name || "");

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await axios.get(`${API}/subscription/plans`);
        const apiPlans = Array.isArray(res?.data?.plans)
          ? res.data.plans
              .filter((p) => p.id !== "enterprise")
              .map(normalizePlan)
          : [];

        setPlans(apiPlans.length ? apiPlans : fallbackPlans.map(normalizePlan));
      } catch {
        setPlans(fallbackPlans.map(normalizePlan));
      }
    };

    fetchPlans();
  }, []);

  const getPrice = (plan) => {
    return isAnnual
      ? plan.annual_monthly_price.toFixed(2)
      : plan.monthly_price.toFixed(2);
  };

  const handlePlanChange = (planId) => {
    if (!token) return toast.error("Login required");

    const plan = plans.find((p) => p.id === planId);

    const url = isAnnual
      ? plan.annual_checkout_url
      : plan.monthly_checkout_url;

    if (!url) return toast.error("Missing checkout link");

    window.location.href = url;
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex gap-2 items-center">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription>Manage your plan and billing</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">

          {/* Toggle */}
          <div className="flex justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex gap-4 items-center">
              <span>Monthly</span>
              <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
              <span>Annual</span>
            </div>
            {isAnnual && (
              <Badge className="bg-green-500/20 text-green-400">
                Save 40%
              </Badge>
            )}
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan) => {
              const current = plan.id === user?.plan;

              return (
                <Card key={plan.id} className={current ? "border-primary" : ""}>
                  <CardContent className="p-4">

                    <h3 className="font-semibold">{plan.name}</h3>

                    <p className="text-lg">
                      ${getPrice(plan)}/mo
                    </p>

                    <ul className="text-xs mt-2 space-y-1">
                      {plan.features.slice(0, 3).map((f, i) => (
                        <li key={i} className="flex gap-1">
                          <Check className="h-3 w-3" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="w-full mt-4"
                      disabled={current}
                      onClick={() => handlePlanChange(plan.id)}
                    >
                      {current ? "Current Plan" : "Upgrade"}
                    </Button>

                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 🔥 BUTTON */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => {
                window.open("https://whop.com/user/orders", "_blank");
              }}
            >
              Cancel or Manage Subscription
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Subscription managed by Whop
          </p>

        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;

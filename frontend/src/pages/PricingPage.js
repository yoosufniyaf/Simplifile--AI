import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { FileText, Check, ArrowRight, Zap } from "lucide-react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
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
      "PDF & CSV Export",
      "AI Tax Insights & Planning",
    ],
    popular: true,
  },
];

const normalizePlan = (plan) => {
  const fallbackPlan = fallbackPlans.find((p) => p.id === plan?.id);

  return {
    id: plan?.id || fallbackPlan?.id || "plan",
    name: plan?.name || fallbackPlan?.name || "Plan",
    monthly_price: Number(plan?.monthly_price ?? fallbackPlan?.monthly_price ?? 0),
    annual_monthly_price: Number(
      plan?.annual_monthly_price ?? fallbackPlan?.annual_monthly_price ?? 0
    ),
    annual_price: Number(plan?.annual_price ?? fallbackPlan?.annual_price ?? 0),
    features: Array.isArray(plan?.features)
      ? plan.features
      : fallbackPlan?.features || [],
    popular: Boolean(plan?.popular ?? fallbackPlan?.popular),
    monthly_checkout_url:
      plan?.monthly_checkout_url ||
      plan?.checkout_url ||
      fallbackPlan?.monthly_checkout_url ||
      null,
    annual_checkout_url:
      plan?.annual_checkout_url ||
      fallbackPlan?.annual_checkout_url ||
      null,
  };
};

const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [plans, setPlans] = useState(fallbackPlans.map(normalizePlan));
  const [loadingPlans, setLoadingPlans] = useState(true);

  const navigate = useNavigate();

  const auth = useAuth() || {};
  const { token } = auth;

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axios.get(`${API}/subscription/plans`);

        const apiPlans = Array.isArray(response?.data?.plans)
          ? response.data.plans
              .filter((p) => p.id !== "enterprise")
              .map((plan) => {
                if (plan.id === "basic") {
                  return normalizePlan({
                    ...plan,
                    monthly_price: 9.99,
                    annual_monthly_price: 5.99,
                    annual_price: 71.88,
                    monthly_checkout_url: "https://whop.com/checkout/plan_PPUUTjaMeSwJ2",
                    annual_checkout_url: "https://whop.com/checkout/plan_iwtWTjCmve5Xj",
                  });
                }

                if (plan.id === "premium") {
                  return normalizePlan({
                    ...plan,
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
                      "PDF & CSV Export",
                      "AI Tax Insights & Planning",
                    ],
                    popular: true,
                  });
                }

                return normalizePlan(plan);
              })
          : [];

        setPlans(apiPlans.length > 0 ? apiPlans : fallbackPlans.map(normalizePlan));
      } catch (error) {
        console.error("Failed to fetch plans:", error);
        setPlans(fallbackPlans.map(normalizePlan));
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, []);

  const getPrice = (plan) => {
    if (isAnnual) {
      return Number(plan.annual_monthly_price || 0).toFixed(2);
    }
    return Number(plan.monthly_price || 0).toFixed(2);
  };

  const getTotalPrice = (plan) => {
    if (isAnnual) {
      return Number(plan.annual_price || 0).toFixed(2);
    }
    return (Number(plan.monthly_price || 0) * 12).toFixed(2);
  };

  const getPlanIcon = (planId) => {
    if (planId === "premium") {
      return <Zap className="h-6 w-6" />;
    }
    return <FileText className="h-6 w-6" />;
  };

  const handlePlanClick = (plan) => {
    const storedToken = localStorage.getItem("token") || token;

    if (!storedToken) {
      navigate("/register");
      return;
    }

    const fallbackPlan = fallbackPlans.find((p) => p.id === plan.id);

    let checkoutUrl = isAnnual
      ? plan?.annual_checkout_url || fallbackPlan?.annual_checkout_url
      : plan?.monthly_checkout_url || fallbackPlan?.monthly_checkout_url;

    if (!checkoutUrl) {
      toast.error(`Checkout link is missing for ${plan.name}`);
      return;
    }

    const billing = isAnnual ? "annual" : "monthly";
    const separator = checkoutUrl.includes("?") ? "&" : "?";
    const successUrl = encodeURIComponent(
      `${window.location.origin}/checkout/success?plan=${plan.id}&billing=${billing}&status=success`
    );

    checkoutUrl = `${checkoutUrl}${separator}success_url=${successUrl}`;

    window.location.href = checkoutUrl;
  };

  const displayPlans = useMemo(
    () => (loadingPlans ? fallbackPlans.map(normalizePlan) : plans),
    [loadingPlans, plans]
  );

  return (
    <div className="min-h-screen bg-background">
      <section className="py-20 md:py-28 text-center">
        <h1 className="text-5xl font-bold mb-6">Simple, transparent pricing</h1>

        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={!isAnnual ? "font-medium" : "text-muted-foreground"}>
            Monthly
          </span>

          <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />

          <span className={isAnnual ? "font-medium" : "text-muted-foreground"}>
            Annual
          </span>

          {isAnnual && (
            <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm">
              Save 40%
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {displayPlans.map((plan) => (
            <motion.div
              key={plan.id}
              className={`p-8 rounded-3xl border ${
                plan.popular ? "border-primary" : "border-border"
              }`}
            >
              {plan.popular && (
                <span className="mb-4 inline-block bg-primary text-white px-4 py-1 rounded-full text-sm">
                  Most Popular
                </span>
              )}

              <div className="mb-6">
                <div className="flex justify-center mb-4">
                  <div className={plan.popular ? "text-primary" : "text-primary/80"}>
                    {getPlanIcon(plan.id)}
                  </div>
                </div>

                <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>

                <p className="text-4xl font-bold mb-2">
                  ${getPrice(plan)}
                  <span className="text-sm text-muted-foreground"> /month</span>
                </p>

                {isAnnual && (
                  <p className="text-sm text-muted-foreground mb-4">
                    ${getTotalPrice(plan)} billed annually
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-6 text-left">
                {plan.features.map((feature, i) => (
                  <li key={`${plan.id}-${i}`} className="flex gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button className="w-full" onClick={() => handlePlanClick(plan)}>
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PricingPage;

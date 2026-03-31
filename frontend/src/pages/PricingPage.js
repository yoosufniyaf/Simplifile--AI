import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { FileText, Check, ArrowRight, Zap } from "lucide-react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/*
  IMPORTANT:
  Replace these 4 values with your NEW Whop checkout links.

  Use:
  - Monthly links = the ones with 3-day free trial and initial fee = 0
  - Annual links = no trial, initial fee = 0
  - They should look like: https://whop.com/checkout/plan_xxxxx
  - DO NOT use product-page links like https://whop.com/simplifile-ai/...
*/
const WHOP_LINKS = {
  basic: {
    monthly: "https://whop.com/checkout/plan_95AtzzUy28TLQ",
    annual: "https://whop.com/checkout/plan_RWSxmii5PJhrt",
  },
  premium: {
    monthly: "https://whop.com/checkout/plan_cW1iWYsM39DyN",
    annual: "https://whop.com/checkout/plan_dbWKSXNvLU8aZ",
  },
};

const fallbackPlans = [
  {
    id: "basic",
    name: "Basic Advisor",
    monthly_price: 9.99,
    annual_monthly_price: 5.99,
    annual_price: 71.88,
    monthly_checkout_url: WHOP_LINKS.basic.monthly,
    annual_checkout_url: WHOP_LINKS.basic.annual,
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
    monthly_checkout_url: WHOP_LINKS.premium.monthly,
    annual_checkout_url: WHOP_LINKS.premium.annual,
    features: [
      "Everything in Basic",
      "AI Bookkeeper Assistant",
      "Transaction Categorization",
      "P&L, Monthly Summary",
      "MRR, Burn Rate, CAC Insights",
      "Auto Integrations (Shopify, Whop)",
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
  const [activatingCheckout, setActivatingCheckout] = useState(false);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const auth = useAuth() || {};
  const { token, user } = auth;
  const hasHandledCheckoutRef = useRef(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axios.get(`${API}/subscription/plans`);

        const apiPlans = Array.isArray(response?.data?.plans)
          ? response.data.plans.map((plan) => {
              if (plan.id === "basic") {
                return normalizePlan({
                  ...plan,
                  monthly_price: 9.99,
                  annual_monthly_price: 5.99,
                  annual_price: 71.88,
                  monthly_checkout_url: WHOP_LINKS.basic.monthly,
                  annual_checkout_url: WHOP_LINKS.basic.annual,
                  features: [
                    "Document Simplifier",
                    "AI Copilot Chat",
                    "Upload PDFs & Images",
                    "Key Points & Risks Analysis",
                  ],
                });
              }

              if (plan.id === "premium") {
                return normalizePlan({
                  ...plan,
                  monthly_price: 39.99,
                  annual_monthly_price: 23.99,
                  annual_price: 287.88,
                  monthly_checkout_url: WHOP_LINKS.premium.monthly,
                  annual_checkout_url: WHOP_LINKS.premium.annual,
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

  useEffect(() => {
    const handleCheckoutReturn = async () => {
      const success =
        searchParams.get("success") ||
        searchParams.get("status") ||
        searchParams.get("checkout_status");

      const isSuccessful =
        success === "true" ||
        success === "success" ||
        searchParams.get("status") === "success" ||
        searchParams.get("checkout_status") === "success";

      if (!isSuccessful || hasHandledCheckoutRef.current) {
        return;
      }

      hasHandledCheckoutRef.current = true;

      const storedToken = localStorage.getItem("token") || token;
      const plan = searchParams.get("plan") || user?.plan || "basic";
      const billing = searchParams.get("billing") || "monthly";
      const email = searchParams.get("email") || user?.email || "";
      const paymentId =
        searchParams.get("payment_id") ||
        searchParams.get("receipt_id") ||
        "";

      if (!storedToken) {
        const redirectPath = `/pricing?${searchParams.toString()}`;
        toast.error("Please log in again before activating your subscription.");
        navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`);
        return;
      }

      try {
        setActivatingCheckout(true);

        await axios.post(
          `${API}/subscription/activate`,
          {
            email,
            plan,
            billing,
            payment_id: paymentId,
          },
          {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          }
        );

        const meResponse = await axios.get(`${API}/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        localStorage.setItem("token", storedToken);
        localStorage.setItem("user", JSON.stringify(meResponse.data));

        if (typeof auth.setUser === "function") {
          auth.setUser(meResponse.data);
        }

        toast.success("Subscription activated successfully.");

        const cleanedParams = new URLSearchParams(searchParams);
        [
          "success",
          "plan",
          "billing",
          "receipt_id",
          "payment_id",
          "checkout_status",
          "status",
          "state_id",
          "email",
        ].forEach((key) => cleanedParams.delete(key));

        setSearchParams(cleanedParams, { replace: true });

        window.location.replace("/dashboard");
      } catch (error) {
        console.error("Checkout activation failed:", error);
        const message =
          error?.response?.data?.detail ||
          "Payment succeeded, but subscription activation failed.";
        toast.error(message);
        hasHandledCheckoutRef.current = false;
      } finally {
        setActivatingCheckout(false);
      }
    };

    handleCheckoutReturn();
  }, [searchParams, token, user, auth, navigate, setSearchParams]);

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

  const getCheckoutButtonText = () => {
    return isAnnual ? "Get Annual Plan" : "Start Free Trial";
  };

  const handlePlanClick = (plan) => {
    const storedToken = localStorage.getItem("token") || token;
    const billing = isAnnual ? "annual" : "monthly";
    const planId = plan?.id || "basic";

    if (!storedToken || !user) {
      navigate(`/register?plan=${planId}&billing=${billing}`);
      return;
    }

    const fallbackPlan = fallbackPlans.find((p) => p.id === plan.id);

    const checkoutUrl = isAnnual
      ? plan?.annual_checkout_url || fallbackPlan?.annual_checkout_url
      : plan?.monthly_checkout_url || fallbackPlan?.monthly_checkout_url;

    if (!checkoutUrl) {
      toast.error(`Checkout link is missing for ${plan.name}`);
      return;
    }

    if (
      checkoutUrl.includes("YOUR_NEW_") ||
      !checkoutUrl.startsWith("https://whop.com/checkout/")
    ) {
      toast.error(`Please paste the correct Whop checkout link for ${plan.name}`);
      return;
    }

    const userEmail = user?.email || "";

    const successParams = new URLSearchParams({
      success: "true",
      plan: planId,
      billing,
      email: userEmail,
    });

    const successUrl = `${window.location.origin}/pricing?${successParams.toString()}`;
    const separator = checkoutUrl.includes("?") ? "&" : "?";

    window.location.href = `${checkoutUrl}${separator}success_url=${encodeURIComponent(
      successUrl
    )}`;
  };

  const displayPlans = useMemo(
    () => (loadingPlans ? fallbackPlans.map(normalizePlan) : plans),
    [loadingPlans, plans]
  );

  return (
    <div className="min-h-screen bg-background">
      <section className="py-20 md:py-28 text-center">
        <h1 className="text-5xl font-bold mb-6">Simple, transparent pricing</h1>

        {activatingCheckout && (
          <div className="mb-6 text-primary font-medium">
            Activating your subscription...
          </div>
        )}

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

                {!isAnnual && (
                  <p className="text-sm text-green-600 mb-4">
                    Includes 3-day free trial
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
                {getCheckoutButtonText()}
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

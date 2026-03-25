import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { FileText, Check, ArrowRight, Zap, Crown } from "lucide-react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fallbackPlans = [
  {
    id: "basic",
    name: "Basic Advisor",
    monthly_price: 9.99,
    annual_price: 89.91,
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
    monthly_price: 29.99,
    annual_price: 269.91,
    monthly_checkout_url: "https://whop.com/checkout/plan_2oAqaWyrKqxEL",
    annual_checkout_url: "https://whop.com/checkout/plan_6T3qi11GRXcq4",
    features: [
      "Everything in Basic",
      "AI Bookkeeper Assistant",
      "Transaction Categorization",
      "P&L, Monthly Summary",
      "MRR, Burn Rate, CAC Insights",
    ],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthly_price: 49.99,
    annual_price: 449.91,
    monthly_checkout_url: "https://whop.com/checkout/plan_HxIPDg1O5ClHn",
    annual_checkout_url: "https://whop.com/checkout/plan_1nnO8tkh9GCCd",
    features: [
      "Everything in Premium",
      "Auto Integrations (Shopify, Stripe, PayPal, Whop)",
      "Financial Statements Auto-Generated",
      "Manual Editing & Custom Entries",
      "PDF/CSV Export",
      "AI Tax Insights",
    ],
  },
];

const normalizePlan = (plan) => ({
  id: plan?.id || "plan",
  name: plan?.name || "Plan",
  monthly_price: Number(plan?.monthly_price ?? 0),
  annual_price: Number(plan?.annual_price ?? 0),
  features: Array.isArray(plan?.features) ? plan.features : [],
  popular: Boolean(plan?.popular),
  monthly_checkout_url: plan?.monthly_checkout_url || plan?.checkout_url || null,
  annual_checkout_url: plan?.annual_checkout_url || null,
});

const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [plans, setPlans] = useState(fallbackPlans.map(normalizePlan));
  const [loadingPlans, setLoadingPlans] = useState(true);

  const navigate = useNavigate();
  const auth = useAuth() || {};
  const { token, user } = auth;

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axios.get(`${API}/subscription/plans`);
        const apiPlans = Array.isArray(response?.data?.plans)
          ? response.data.plans.map(normalizePlan)
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
      return (Number(plan.annual_price || 0) / 12).toFixed(2);
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
    switch (planId) {
      case "enterprise":
        return <Crown className="h-6 w-6" />;
      case "premium":
        return <Zap className="h-6 w-6" />;
      default:
        return <FileText className="h-6 w-6" />;
    }
  };

  const handlePlanClick = (plan) => {
    if (!token) {
      navigate("/register");
      return;
    }

    const checkoutUrl = isAnnual
      ? plan?.annual_checkout_url
      : plan?.monthly_checkout_url;

    if (!checkoutUrl) {
      toast.error("Checkout link is missing for this plan");
      return;
    }

    window.location.href = checkoutUrl;
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary glow-button flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span
              className="font-semibold text-xl"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Simplifile AI
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {!token ? (
              <>
                <Link to="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link to="/register">
                  <Button className="glow-button">Get Started</Button>
                </Link>
              </>
            ) : (
              <Link to="/dashboard">
                <Button variant="ghost">Go to Dashboard</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Simple, transparent pricing
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Choose the plan that fits your business. All plans include a 3-day free trial.
            </p>

            <div className="flex items-center justify-center gap-4 mb-12">
              <span className={!isAnnual ? "text-foreground font-medium" : "text-muted-foreground"}>
                Monthly
              </span>

              <Switch
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
                data-testid="billing-toggle"
              />

              <span className={isAnnual ? "text-foreground font-medium" : "text-muted-foreground"}>
                Annual
              </span>

              {isAnnual && (
                <span className="bg-primary/20 text-primary text-sm px-3 py-1 rounded-full">
                  Save 25%
                </span>
              )}
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm mb-12">
              <Check className="h-4 w-4 text-primary" />
              <span>3-day free trial • Cancel anytime</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(loadingPlans ? fallbackPlans.map(normalizePlan) : plans).map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative flex flex-col rounded-3xl border ${
                  plan.popular
                    ? "border-primary bg-card shadow-xl shadow-primary/10"
                    : "border-border bg-card"
                } p-8 transition-all hover:border-primary/50`}
                data-testid={`pricing-card-${plan.id}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-sm font-medium px-4 py-1.5 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div
                    className={`h-12 w-12 rounded-xl ${
                      plan.popular ? "bg-primary" : "bg-primary/10"
                    } flex items-center justify-center mb-4`}
                  >
                    <div className={plan.popular ? "text-white" : "text-primary"}>
                      {getPlanIcon(plan.id)}
                    </div>
                  </div>

                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {plan.name}
                  </h3>

                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-4xl font-bold"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      ${getPrice(plan)}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>

                  {isAnnual && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ${getTotalPrice(plan)} billed annually
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {(plan.features || []).map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${plan.popular ? "glow-button" : ""}`}
                  variant={plan.popular ? "default" : "outline"}
                  data-testid={`select-plan-${plan.id}`}
                  onClick={() => handlePlanClick(plan)}
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 bg-card/30">
        <div className="max-w-3xl mx-auto px-6">
          <h2
            className="text-3xl font-semibold text-center mb-12"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Frequently asked questions
          </h2>

          <div className="space-y-6">
            {[
              {
                q: "How does the 3-day free trial work?",
                a: "Start any plan with a full-featured 3-day trial. You will be taken to secure checkout to begin the trial.",
              },
              {
                q: "Can I change plans later?",
                a: "Yes. You can upgrade or downgrade your plan later.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept secure online payments through Whop. Annual subscriptions receive a 25% discount.",
              },
              {
                q: "Is my data secure?",
                a: "Yes. We use strong security practices to protect your documents and business information.",
              },
            ].map((faq, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                Simplifile AI
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              © 2024 Simplifile AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;

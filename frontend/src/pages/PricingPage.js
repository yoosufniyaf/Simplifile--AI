import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { FileText, Check, ArrowRight, Zap, Crown } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fallbackPlans = [
  {
    id: "basic",
    name: "Basic Advisor",
    monthly_price: 9.99,
    annual_price: 89.91,
    checkout_url: "https://whop.com/simplifile-ai/basic-advisor",
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
    checkout_url: "https://whop.com/simplifile-ai/premium-0f-fbad",
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
    checkout_url: "https://whop.com/simplifile-ai/enterprise-cb",
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
  checkout_url: plan?.checkout_url || null,
});

const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [plans, setPlans] = useState(fallbackPlans);

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

  return (
    <div className="min-h-screen bg-background">
      <nav className="glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary glow-button flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-xl" style={{ fontFamily: "Outfit, sans-serif" }}>
              Simplifile AI
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/register">
              <Button className="glow-button">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="py-20 md:py-28 text-center">
        <h1 className="text-5xl font-bold mb-6">Simple, transparent pricing</h1>
        <p className="text-muted-foreground mb-10">
          Choose the plan that fits your business.
        </p>

        <div className="flex justify-center gap-4 mb-12">
          <span>Monthly</span>
          <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
          <span>Annual</span>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div key={plan.id} className="border rounded-3xl p-8">
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>

              <div className="text-4xl font-bold mb-4">
                ${getPrice(plan)} /month
              </div>

              <ul className="mb-6">
                {plan.features.map((f, i) => (
                  <li key={i}>✔ {f}</li>
                ))}
              </ul>

              <Button
                className="w-full"
                onClick={() => {
                  if (plan.checkout_url) {
                    window.open(plan.checkout_url, "_blank");
                  } else {
                    window.location.href = "/register";
                  }
                }}
              >
                Start Free Trial
              </Button>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PricingPage;

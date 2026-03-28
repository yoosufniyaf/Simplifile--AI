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
      "Auto Integrations",
      "Financial Statements",
      "PDF & CSV Export",
      "AI Tax Insights",
    ],
    popular: true,
  },
];

const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [plans, setPlans] = useState(fallbackPlans);
  const [activating, setActivating] = useState(false);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token, user, setUser } = useAuth();
  const handled = useRef(false);

  // ================= FETCH PLANS =================
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await axios.get(`${API}/subscription/plans`);
        if (res?.data?.plans) {
          setPlans(res.data.plans);
        }
      } catch {
        setPlans(fallbackPlans);
      }
    };

    fetchPlans();
  }, []);

  // ================= HANDLE CHECKOUT RETURN =================
  useEffect(() => {
    const run = async () => {
      const success =
        searchParams.get("success") ||
        searchParams.get("status") ||
        searchParams.get("checkout_status");

      const isSuccess =
        success === "true" ||
        success === "success";

      if (!isSuccess || handled.current) return;

      handled.current = true;

      const storedToken = localStorage.getItem("token") || token;

      const plan = searchParams.get("plan") || "premium";
      const billing = searchParams.get("billing") || "monthly";
      const payment_id =
        searchParams.get("payment_id") ||
        searchParams.get("receipt_id");

      // ❌ NOT LOGGED IN → preserve params
      if (!storedToken) {
        navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      try {
        setActivating(true);

        // 🔥 ACTIVATE SUBSCRIPTION
        await axios.post(
          `${API}/subscription/activate`,
          {
            plan,
            billing,
            payment_id,
          },
          {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          }
        );

        // 🔥 REFRESH USER
        const me = await axios.get(`${API}/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        localStorage.setItem("user", JSON.stringify(me.data));
        setUser?.(me.data);

        toast.success("Subscription activated");

        // CLEAN URL
        const clean = new URLSearchParams(searchParams);
        [
          "success",
          "plan",
          "billing",
          "payment_id",
          "receipt_id",
          "checkout_status",
          "status",
        ].forEach((k) => clean.delete(k));

        setSearchParams(clean, { replace: true });

        // ✅ GO TO DASHBOARD
        window.location.replace("/dashboard");
      } catch (err) {
        console.error(err);
        toast.error("Activation failed");
        handled.current = false;
      } finally {
        setActivating(false);
      }
    };

    run();
  }, [searchParams, token]);

  // ================= PRICING =================
  const getPrice = (p) =>
    isAnnual ? p.annual_monthly_price : p.monthly_price;

  const handleClick = (plan) => {
    const storedToken = localStorage.getItem("token") || token;

    if (!storedToken) {
      navigate("/register");
      return;
    }

    const url = isAnnual
      ? plan.annual_checkout_url
      : plan.monthly_checkout_url;

    window.location.href = url;
  };

  // ================= UI =================
  return (
    <div className="min-h-screen bg-background">
      <section className="py-20 text-center">

        <h1 className="text-5xl font-bold mb-6">
          Simple, transparent pricing
        </h1>

        {activating && (
          <p className="mb-6 text-primary">
            Activating your subscription...
          </p>
        )}

        <div className="flex justify-center gap-4 mb-10">
          <span>Monthly</span>
          <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
          <span>Annual</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              className="p-8 rounded-3xl border"
            >
              <h3 className="text-2xl mb-4">{plan.name}</h3>

              <p className="text-4xl font-bold mb-4">
                ${getPrice(plan)} /month
              </p>

              <ul className="mb-6 text-left">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <Check className="w-4" /> {f}
                  </li>
                ))}
              </ul>

              <Button onClick={() => handleClick(plan)}>
                Start
              </Button>
            </motion.div>
          ))}
        </div>

      </section>
    </div>
  );
};

export default PricingPage;

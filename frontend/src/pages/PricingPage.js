import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Check, Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const plans = [
  {
    name: "Basic",
    description: "For solo founders getting started",
    monthlyPrice: "$9/mo",
    annualPrice: "$90/yr",
    features: [
      "Document analysis",
      "AI chat",
      "Basic dashboard",
    ],
  },
  {
    name: "Premium",
    description: "For growing businesses",
    monthlyPrice: "$29/mo",
    annualPrice: "$290/yr",
    features: [
      "Everything in Basic",
      "Bookkeeping",
      "AI financial insights",
    ],
  },
  {
    name: "Enterprise",
    description: "For full finance automation",
    monthlyPrice: "$79/mo",
    annualPrice: "$790/yr",
    features: [
      "Everything in Premium",
      "Reports",
      "Integrations",
      "Tax insights",
    ],
  },
];

export default function PricingPage() {
  const [billingMode, setBillingMode] = useState("monthly");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processingSuccess, setProcessingSuccess] = useState(false);

  useEffect(() => {
    const handleSuccessfulCheckout = async () => {
      const success = searchParams.get("success");
      const plan = searchParams.get("plan");
      const billing = searchParams.get("billing") || "monthly";
      const token = localStorage.getItem("token");

      if (success !== "true" || !plan || !token || processingSuccess) {
        return;
      }

      try {
        setProcessingSuccess(true);

        await axios.post(
          `${API}/subscription/update`,
          {
            plan,
            billing_cycle: billing,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const meRes = await axios.get(`${API}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        localStorage.setItem("user", JSON.stringify(meRes.data));

        toast.success("Subscription activated successfully");
        navigate("/dashboard", { replace: true });
      } catch (error) {
        console.error("Failed to activate subscription:", error);
        toast.error(
          error?.response?.data?.detail || "Could not activate subscription"
        );
      } finally {
        setProcessingSuccess(false);
      }
    };

    handleSuccessfulCheckout();
  }, [searchParams, navigate, processingSuccess]);

  const getCheckoutLink = (planName) => {
    const plan = planName.toLowerCase();

    const checkoutLinks = {
      basic: {
        monthly: "PASTE_BASIC_MONTHLY_WHOP_LINK_HERE",
        annual: "PASTE_BASIC_ANNUAL_WHOP_LINK_HERE",
      },
      premium: {
        monthly: "PASTE_PREMIUM_MONTHLY_WHOP_LINK_HERE",
        annual: "PASTE_PREMIUM_ANNUAL_WHOP_LINK_HERE",
      },
      enterprise: {
        monthly: "PASTE_ENTERPRISE_MONTHLY_WHOP_LINK_HERE",
        annual: "PASTE_ENTERPRISE_ANNUAL_WHOP_LINK_HERE",
      },
    };

    return checkoutLinks[plan]?.[billingMode] || "#";
  };

  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight">Choose your plan</h1>
          <p className="text-muted-foreground mt-3">
            Pick the plan that fits your business best
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-xl border border-border p-1 bg-muted/30">
            <Button
              variant={billingMode === "monthly" ? "default" : "ghost"}
              onClick={() => setBillingMode("monthly")}
            >
              Monthly
            </Button>
            <Button
              variant={billingMode === "annual" ? "default" : "ghost"}
              onClick={() => setBillingMode("annual")}
            >
              Annual
            </Button>
          </div>
        </div>

        {processingSuccess && (
          <div className="mb-8 flex items-center justify-center gap-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Activating your subscription...
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.name} className="h-full">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-2 text-3xl font-bold">
                  {billingMode === "monthly" ? plan.monthlyPrice : plan.annualPrice}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <a href={getCheckoutLink(plan.name)}>
                  <Button className="w-full">
                    Get {plan.name}
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

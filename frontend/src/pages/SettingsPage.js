import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
    annual_price: 71.93,
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
    annual_price: 287.93,
    monthly_checkout_url: "https://whop.com/checkout/plan_2oAqaWyrKqxEL",
    annual_checkout_url: "https://whop.com/checkout/plan_6T3qi11GRXcq4",
    features: [
      "Everything in Basic",
      "AI Bookkeeper Assistant",
      "Transaction Categorization",
      "P&L, Monthly Summary",
      "MRR, Burn Rate, CAC Insights",
      "Auto Integrations (Shopify,Whop)",
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
    id: plan?.id || fallbackPlan?.id || "plan",
    name: plan?.name || fallbackPlan?.name || "Plan",
    monthly_price: Number(plan?.monthly_price ?? fallbackPlan?.monthly_price ?? 0),
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

const SettingsPage = () => {
  const navigate = useNavigate();
  const auth = useAuth() || {};
  const { user, token } = auth;

  const [plans, setPlans] = useState(fallbackPlans.map(normalizePlan));
  const [isAnnual, setIsAnnual] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axios.get(`${API}/subscription/plans`);
        const apiPlans = Array.isArray(response?.data?.plans)
          ? response.data.plans
              .filter((plan) => plan?.id !== "enterprise")
              .map((plan) => {
                if (plan?.id === "premium") {
                  return normalizePlan({
                    ...plan,
                    monthly_price: 39.99,
                    annual_price: 287.93,
                    features: [
                      "Everything in Basic",
                      "AI Bookkeeper Assistant",
                      "Transaction Categorization",
                      "P&L, Monthly Summary",
                      "MRR, Burn Rate, CAC Insights",
                      "Auto Integrations (Shopify,Whop)",
                      "Financial Statements Auto-Generated",
                      "Manual Editing & Custom Entries",
                      "PDF/CSV Export",
                      "AI Tax Insights",
                    ],
                    popular: true,
                  });
                }

                if (plan?.id === "basic") {
                  return normalizePlan({
                    ...plan,
                    monthly_price: 9.99,
                    annual_price: 71.93,
                  });
                }

                return normalizePlan(plan);
              })
          : [];

        setPlans(apiPlans.length > 0 ? apiPlans : fallbackPlans.map(normalizePlan));
      } catch (error) {
        console.error("Failed to fetch plans:", error);
        setPlans(fallbackPlans.map(normalizePlan));
      }
    };

    fetchPlans();
  }, []);

  useEffect(() => {
    setName(user?.name || "");
  }, [user]);

  const handlePlanChange = (planId) => {
    if (planId === user?.plan) return;

    if (!token) {
      toast.error("Please log in first");
      return;
    }

    const selectedPlan = plans.find((plan) => plan.id === planId);
    const fallbackPlan = fallbackPlans.find((plan) => plan.id === planId);

    const checkoutUrl = isAnnual
      ? selectedPlan?.annual_checkout_url || fallbackPlan?.annual_checkout_url
      : selectedPlan?.monthly_checkout_url || fallbackPlan?.monthly_checkout_url;

    if (!checkoutUrl) {
      toast.error("Checkout link is missing");
      return;
    }

    window.location.href = checkoutUrl;
  };

  const getPrice = (plan) => {
    if (isAnnual) {
      return (Number(plan?.annual_price || 0) / 12).toFixed(2);
    }
    return Number(plan?.monthly_price || 0).toFixed(2);
  };

  const getPlanIcon = (planId) => {
    switch (planId) {
      case "premium":
        return <Zap className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getTrialDaysLeft = () => {
    if (!user?.trial_ends_at) return 0;
    const trialEnd = new Date(user.trial_ends_at);
    const now = new Date();
    const diff = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const handleChangePassword = () => {
    navigate("/forgot-password");
  };

  const handleEnable2FA = () => {
    toast.info("Two-factor authentication setup is coming soon.");
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your account and all your data? This cannot be undone."
    );

    if (!confirmed) return;

    if (!token) {
      toast.error("You are not logged in.");
      return;
    }

    try {
      setDeletingAccount(true);

      const response = await axios.delete(`${API}/auth/delete-account`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      toast.success(response?.data?.message || "Account deleted successfully.");
      navigate("/");
    } catch (error) {
      console.error("Delete account error:", error);

      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Failed to delete account.";

      toast.error(message);
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleManageSubscription = () => {
    const url =
      user?.whop_manage_url || "https://whop.com/account/subscriptions/";

    window.open(url, "_blank");
  };

  return (
    <div className="space-y-8 max-w-4xl" data-testid="settings-page">
      <div>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and subscription
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle
            className="flex items-center gap-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="profile-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="capitalize">
              {user?.plan || "basic"} Plan
            </Badge>

            {user?.subscription_status === "trial" && (
              <Badge className="bg-primary/20 text-primary">
                Trial • {getTrialDaysLeft()} days left
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle
            className="flex items-center gap-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription>Manage your plan and billing</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-4">
              <span className={!isAnnual ? "font-medium" : "text-muted-foreground"}>
                Monthly
              </span>

              <Switch
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
                data-testid="billing-cycle-toggle"
              />

              <span className={isAnnual ? "font-medium" : "text-muted-foreground"}>
                Annual
              </span>
            </div>

            {isAnnual && (
              <Badge className="bg-green-500/20 text-green-400">Save 40%</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan) => {
              const isCurrentPlan = plan.id === user?.plan;

              return (
                <Card
                  key={plan.id}
                  className={`relative ${isCurrentPlan ? "border-primary bg-primary/5" : ""} ${
                    plan.popular ? "border-primary/50" : ""
                  }`}
                  data-testid={`plan-card-${plan.id}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-white text-xs">Popular</Badge>
                    </div>
                  )}

                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          isCurrentPlan
                            ? "bg-primary text-white"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {getPlanIcon(plan.id)}
                      </div>

                      <div>
                        <p className="font-semibold">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ${getPrice(plan)}/mo
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-1 mb-4">
                      {(plan.features || []).slice(0, 3).map((feature, i) => (
                        <li
                          key={i}
                          className="text-xs text-muted-foreground flex items-start gap-1"
                        >
                          <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{feature}</span>
                        </li>
                      ))}

                      {(plan.features || []).length > 3 && (
                        <li className="text-xs text-muted-foreground">
                          +{plan.features.length - 3} more features
                        </li>
                      )}
                    </ul>

                    <Button
                      size="sm"
                      className="w-full"
                      variant={isCurrentPlan ? "outline" : "default"}
                      disabled={isCurrentPlan}
                      onClick={() => handlePlanChange(plan.id)}
                      data-testid={`select-plan-${plan.id}`}
                    >
                      {isCurrentPlan ? "Current Plan" : "Upgrade"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleManageSubscription}
            >
              Cancel or Manage Subscription
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            3-day free trial • Cancel anytime • Subscription managed by Whop
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle
            className="flex items-center gap-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure your notification preferences</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive updates about your documents and reports
              </p>
            </div>
            <Switch defaultChecked data-testid="email-notifications-toggle" />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly Summary</p>
              <p className="text-sm text-muted-foreground">
                Get a weekly overview of your financial activity
              </p>
            </div>
            <Switch defaultChecked data-testid="weekly-summary-toggle" />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Trial Reminders</p>
              <p className="text-sm text-muted-foreground">
                Notifications about your trial status
              </p>
            </div>
            <Switch defaultChecked data-testid="trial-reminders-toggle" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle
            className="flex items-center gap-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Change Password</p>
              <p className="text-sm text-muted-foreground">Update your account password</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              data-testid="change-password-btn"
              onClick={handleChangePassword}
            >
              Change
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              data-testid="2fa-btn"
              onClick={handleEnable2FA}
            >
              Enable
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-destructive">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and data
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              data-testid="delete-account-btn"
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
            >
              {deletingAccount ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;

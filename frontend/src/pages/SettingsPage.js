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
  Settings, 
  User,
  CreditCard,
  Bell,
  Shield,
  Check,
  Crown,
  Zap,
  FileText,
  Loader2
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SettingsPage = () => {
  const { user, token, updatePlan, refreshUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [name, setName] = useState(user?.name || "");

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    setName(user?.name || "");
  }, [user]);

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${API}/subscription/plans`);
      setPlans(response.data.plans);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    }
  };

  const handlePlanChange = async (planId) => {
    if (planId === user?.plan) return;
    
    setLoading(true);
    try {
      await updatePlan(planId, isAnnual ? "annual" : "monthly");
      toast.success(`Upgraded to ${planId} plan!`);
      refreshUser();
    } catch (error) {
      toast.error("Failed to update plan");
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (plan) => {
    if (isAnnual) {
      return (plan.annual_price / 12).toFixed(2);
    }
    return plan.monthly_price.toFixed(2);
  };

  const getPlanIcon = (planId) => {
    switch (planId) {
      case "enterprise":
        return <Crown className="h-5 w-5" />;
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

  return (
    <div className="space-y-8 max-w-4xl" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and subscription
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
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

      {/* Subscription Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription>Manage your plan and billing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Billing Toggle */}
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
              <Badge className="bg-green-500/20 text-green-400">Save 25%</Badge>
            )}
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrentPlan = plan.id === user?.plan;
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative ${isCurrentPlan ? "border-primary bg-primary/5" : ""} ${plan.popular ? "border-primary/50" : ""}`}
                  data-testid={`plan-card-${plan.id}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-white text-xs">Popular</Badge>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isCurrentPlan ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>
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
                      {plan.features.slice(0, 3).map((feature, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                          <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{feature}</span>
                        </li>
                      ))}
                      {plan.features.length > 3 && (
                        <li className="text-xs text-muted-foreground">
                          +{plan.features.length - 3} more features
                        </li>
                      )}
                    </ul>
                    <Button
                      size="sm"
                      className="w-full"
                      variant={isCurrentPlan ? "outline" : "default"}
                      disabled={isCurrentPlan || loading}
                      onClick={() => handlePlanChange(plan.id)}
                      data-testid={`select-plan-${plan.id}`}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isCurrentPlan ? (
                        "Current Plan"
                      ) : (
                        "Upgrade"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            3-day free trial • Cancel anytime • Subscription managed by Whop
          </p>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure your notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Receive updates about your documents and reports</p>
            </div>
            <Switch defaultChecked data-testid="email-notifications-toggle" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly Summary</p>
              <p className="text-sm text-muted-foreground">Get a weekly overview of your financial activity</p>
            </div>
            <Switch defaultChecked data-testid="weekly-summary-toggle" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Trial Reminders</p>
              <p className="text-sm text-muted-foreground">Notifications about your trial status</p>
            </div>
            <Switch defaultChecked data-testid="trial-reminders-toggle" />
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
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
            <Button variant="outline" size="sm" data-testid="change-password-btn">
              Change
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
            </div>
            <Button variant="outline" size="sm" data-testid="2fa-btn">
              Enable
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-destructive">Delete Account</p>
              <p className="text-sm text-muted-foreground">Permanently delete your account and data</p>
            </div>
            <Button variant="destructive" size="sm" data-testid="delete-account-btn">
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;

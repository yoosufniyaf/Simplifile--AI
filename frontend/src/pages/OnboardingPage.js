import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { CheckCircle2, Link2, RefreshCw, BarChart3, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const steps = [
  {
    number: 1,
    title: "Welcome to Simplifile AI",
    description: "Let’s get your workspace ready in a few quick steps.",
    icon: CheckCircle2,
  },
  {
    number: 2,
    title: "Connect your integrations",
    description: "Connect Whop, Shopify, or PayPal to import your business data.",
    icon: Link2,
  },
  {
    number: 3,
    title: "Sync your transactions",
    description: "Pull your latest transactions into Simplifile AI.",
    icon: RefreshCw,
  },
  {
    number: 4,
    title: "Review your imported data",
    description: "Check your transactions and make sure everything looks right.",
    icon: BarChart3,
  },
];

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(user?.onboarding_step || 1);

  useEffect(() => {
    if (user?.onboarding_completed) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const saveStep = async (step, completed = false) => {
    try {
      setSaving(true);

      const token = localStorage.getItem("token");

      await axios.put(
        `${API}/onboarding`,
        {
          onboarding_step: step,
          onboarding_completed: completed,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedUser = {
        ...user,
        onboarding_step: step,
        onboarding_completed: completed,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setCurrentStep(step);

      if (completed) {
        toast.success("Onboarding completed");
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error("Failed to save onboarding progress");
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (currentStep < 4) {
      await saveStep(currentStep + 1, false);
    } else {
      await saveStep(5, true);
    }
  };

  const handleSkip = async () => {
    await saveStep(5, true);
  };

  const activeStepData = steps.find((step) => step.number === currentStep) || steps[0];
  const ActiveIcon = activeStepData.icon;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-950 border-zinc-800 text-white rounded-2xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Getting Started</CardTitle>
            <CardDescription className="text-zinc-400">
              Complete these steps to start tracking your business properly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isDone = currentStep > step.number || user?.onboarding_completed;

              return (
                <div
                  key={step.number}
                  className={`flex items-start gap-4 rounded-xl border p-4 transition ${
                    isActive
                      ? "border-white bg-zinc-900"
                      : "border-zinc-800 bg-zinc-950"
                  }`}
                >
                  <div className="mt-1">
                    <Icon className={isDone ? "text-green-400" : "text-zinc-400"} size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">{step.title}</h3>
                    <p className="text-sm text-zinc-400">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800 text-white rounded-2xl shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <ActiveIcon size={22} />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">{activeStepData.title}</CardTitle>
                <CardDescription className="text-zinc-400">
                  Step {currentStep} of 4
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <p className="text-zinc-300 leading-7">{activeStepData.description}</p>

            {currentStep === 2 && (
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => navigate("/integrations")}
              >
                Go to Integrations
              </Button>
            )}

            {currentStep === 3 && (
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => navigate("/transactions")}
              >
                Go to Transactions
              </Button>
            )}

            {currentStep === 4 && (
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => navigate("/reports")}
              >
                Review Data
              </Button>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleContinue}
                disabled={saving}
                className="flex-1"
              >
                {currentStep === 4 ? "Finish" : "Continue"}
                <ArrowRight className="ml-2" size={16} />
              </Button>

              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={saving}
              >
                Skip
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingPage;

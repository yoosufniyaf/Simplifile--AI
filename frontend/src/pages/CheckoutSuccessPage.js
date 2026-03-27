import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CheckoutSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pollingRef = useRef(null);

  const [status, setStatus] = useState("activating"); // activating | success | error
  const [message, setMessage] = useState("Checking your payment and activating your account...");

  useEffect(() => {
    const stopPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    const finishWithError = (msg) => {
      stopPolling();
      setStatus("error");
      setMessage(msg);
    };

    const finishWithSuccess = (user) => {
      stopPolling();

      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      }

      setStatus("success");
      setMessage("Your subscription is now active.");

      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    };

    const checkUserStatus = async () => {
      try {
        const storedToken = localStorage.getItem("token");
        if (!storedToken) {
          finishWithError("You are not logged in. Please log in and try again.");
          return;
        }

        const response = await axios.get(`${API}/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        const user = response?.data;
        const subscriptionStatus = user?.subscription_status;
        const plan = (user?.plan || "").toLowerCase();

        const isActive =
          subscriptionStatus === "active" ||
          subscriptionStatus === "trial";

        if (isActive && (plan === "basic" || plan === "premium" || plan === "enterprise")) {
          finishWithSuccess(user);
        }
      } catch (error) {
        console.error("Status check failed:", error?.response?.data || error.message);
      }
    };

    const startActivationFlow = async () => {
      const success = searchParams.get("success");
      const checkoutStatus = searchParams.get("checkout_status");
      const statusParam = searchParams.get("status");

      const isSuccessful =
        success === "true" ||
        checkoutStatus === "success" ||
        statusParam === "success";

      if (!isSuccessful) {
        finishWithError("Payment was not completed successfully.");
        return;
      }

      const storedToken = localStorage.getItem("token");
      if (!storedToken) {
        finishWithError("You are not logged in. Please log in and try again.");
        return;
      }

      setStatus("activating");
      setMessage("Payment succeeded. Waiting for Whop to activate your account...");

      await checkUserStatus();

      let attempts = 0;
      const maxAttempts = 15; // ~30 seconds if polling every 2s

      pollingRef.current = setInterval(async () => {
        attempts += 1;

        await checkUserStatus();

        if (attempts >= maxAttempts) {
          finishWithError(
            "Payment may have succeeded, but your account has not activated yet. Please wait a minute and refresh, or contact support."
          );
        }
      }, 2000);
    };

    startActivationFlow();

    return () => {
      stopPolling();
    };
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Checkout Status</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col items-center text-center gap-4 py-8">
          {status === "activating" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">{message}</p>
              <p className="text-sm text-muted-foreground">
                This can take a few seconds after payment.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <p className="text-lg font-medium">{message}</p>
              <p className="text-sm text-muted-foreground">
                Redirecting you to your dashboard...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-red-600" />
              <p className="text-lg font-medium">{message}</p>
              <div className="flex gap-3 pt-2">
                <Button asChild>
                  <Link to="/pricing">Back to Pricing</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutSuccessPage;

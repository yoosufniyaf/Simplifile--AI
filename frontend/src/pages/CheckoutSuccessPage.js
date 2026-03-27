import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CheckoutSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState("activating"); // activating | success | error
  const [message, setMessage] = useState("Activating your subscription...");

  useEffect(() => {
    const activateSubscription = async () => {
      try {
        const success = searchParams.get("success");
        const checkoutStatus = searchParams.get("checkout_status");
        const statusParam = searchParams.get("status");
        const plan = searchParams.get("plan");
        const billing = searchParams.get("billing");
        const emailFromUrl = searchParams.get("email");
        const paymentId =
          searchParams.get("payment_id") || searchParams.get("receipt_id") || "";

        const storedToken = localStorage.getItem("token");
        const storedUser = JSON.parse(localStorage.getItem("user") || "null");
        const email = emailFromUrl || storedUser?.email || "";

        const isSuccessful =
          success === "true" ||
          checkoutStatus === "success" ||
          statusParam === "success";

        if (!isSuccessful) {
          setStatus("error");
          setMessage("Payment was not completed successfully.");
          return;
        }

        if (!storedToken) {
          setStatus("error");
          setMessage("You are not logged in. Please log in and try again.");
          return;
        }

        if (!email) {
          setStatus("error");
          setMessage("Could not determine your account email.");
          return;
        }

        const response = await axios.post(
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

        if (response?.data?.user) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
        }

        setStatus("success");
        setMessage("Your subscription is now active.");

        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      } catch (error) {
        console.error("Activation failed:", error?.response?.data || error.message);
        setStatus("error");
        setMessage(
          error?.response?.data?.detail ||
            "Payment succeeded, but activation failed. Please contact support."
        );
      }
    };

    activateSubscription();
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

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Activating your plan...");

  useEffect(() => {
    const confirmCheckout = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setMessage("You are not logged in. Please log in and try again.");
        return;
      }

      const status =
        searchParams.get("status") ||
        searchParams.get("checkout_status") ||
        searchParams.get("success");

      const receipt_id = searchParams.get("receipt_id");
      const payment_id = searchParams.get("payment_id");
      const plan = searchParams.get("plan");
      const billing = searchParams.get("billing");

      if (
        status !== "success" &&
        status !== "true" &&
        searchParams.get("success") !== "true"
      ) {
        setMessage("Payment was not confirmed.");
        return;
      }

      try {
        const response = await axios.post(
          `${API}/billing/whop/confirm`,
          {
            receipt_id,
            payment_id,
            plan,
            billing,
            raw_params: Object.fromEntries(searchParams.entries()),
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data?.user) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
        }

        setMessage("Plan activated successfully!");

        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      } catch (error) {
        console.error("Whop confirm error:", error?.response?.data || error.message);
        setMessage(
          error?.response?.data?.detail ||
          "Could not activate your subscription."
        );
      }
    };

    confirmCheckout();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border p-8 shadow-sm bg-white">
        <h1 className="text-2xl font-semibold mb-4">Checkout Status</h1>
        <p className="text-gray-700">{message}</p>
      </div>
    </div>
  );
}

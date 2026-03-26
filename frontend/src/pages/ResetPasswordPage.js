import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { FileText } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid or missing reset token.");
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error("Please fill in both password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      await axios.post(`${API}/auth/reset-password`, {
        token,
        new_password: newPassword,
      });

      toast.success("Password reset successful. Please log in.");
      navigate("/login");
    } catch (error) {
      console.error("Reset password failed:", error);
      toast.error(
        error?.response?.data?.detail || "Could not reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span
              className="text-xl font-semibold"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Simplifile AI
            </span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: "Outfit, sans-serif" }}>
              Create a new password
            </CardTitle>
            <CardDescription>
              Enter your new password below to reset your account password.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!token ? (
              <div className="space-y-4">
                <p className="text-sm text-red-500">
                  Invalid or missing reset token.
                </p>
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Go back to forgot password
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    data-testid="reset-password-new-password-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    data-testid="reset-password-confirm-password-input"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  data-testid="reset-password-submit-btn"
                >
                  {loading ? "Resetting..." : "Reset password"}
                </Button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back to login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

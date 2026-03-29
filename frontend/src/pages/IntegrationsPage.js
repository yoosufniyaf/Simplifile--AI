import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Link2,
  Lock,
  Loader2,
  Check,
  X,
  RefreshCw,
  Zap,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLATFORM_INFO = {
  shopify: {
    name: "Shopify",
    description: "Import orders, revenue, refunds, and fees",
    icon: "🛍️",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  stripe: {
    name: "Stripe",
    description: "Sync payments, subscriptions, and payouts",
    icon: "💳",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  paypal: {
    name: "PayPal",
    description: "Import transactions and fees",
    icon: "🅿️",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  whop: {
    name: "Whop",
    description: "Connect your Whop store for revenue tracking",
    icon: "⚡",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
};

const DEFAULT_PLATFORMS = Object.keys(PLATFORM_INFO).map((platform) => ({
  platform,
  status: "not_connected",
  connected_at: null,
}));

const IntegrationsPage = () => {
  const { token, checkPlanAccess } = useAuth();
  const [integrations, setIntegrations] = useState(DEFAULT_PLATFORMS);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const hasPremiumAccess = checkPlanAccess("premium");

  const fetchIntegrations = useCallback(async () => {
    if (!hasPremiumAccess) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/integrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const byPlatform = new Map(
        (Array.isArray(response.data) ? response.data : []).map((item) => [item.platform, item])
      );

      setIntegrations(
        Object.keys(PLATFORM_INFO).map((platform) => ({
          platform,
          status: byPlatform.get(platform)?.status || "not_connected",
          connected_at: byPlatform.get(platform)?.connected_at || null,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch integrations:", error);
      setIntegrations(DEFAULT_PLATFORMS);
    } finally {
      setLoading(false);
    }
  }, [token, hasPremiumAccess]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const closeConnectDialog = () => {
    setConnectDialogOpen(false);
    setSelectedPlatform(null);
    setConnecting(false);
  };

  const handleConnect = async () => {
    if (!selectedPlatform) return;

    setConnecting(true);

    try {
      await axios.post(
        `${API}/integrations/connect`,
        {
          platform: selectedPlatform,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`${PLATFORM_INFO[selectedPlatform].name} connected successfully`);
      closeConnectDialog();
      await fetchIntegrations();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to connect integration");
      setConnecting(false);
    }
  };

  const handleDisconnect = async (platform) => {
    try {
      await axios.delete(`${API}/integrations/${platform}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(`${PLATFORM_INFO[platform].name} disconnected`);
      await fetchIntegrations();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to disconnect integration");
    }
  };

  const handleSync = async (platform) => {
    setSyncing(platform);

    try {
      const response = await axios.post(
        `${API}/integrations/${platform}/sync`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(response.data.message || "Sync complete");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Sync failed");
    } finally {
      setSyncing(null);
    }
  };

  const openConnectDialog = (platform) => {
    setSelectedPlatform(platform);
    setConnectDialogOpen(true);
  };

  if (!hasPremiumAccess) {
    return (
      <div
        className="flex flex-col items-center justify-center h-[60vh] text-center"
        data-testid="integrations-locked"
      >
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
          Premium Feature
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Upgrade to Premium to connect Shopify, Stripe, PayPal, and Whop for automatic
          transaction imports.
        </p>
        <Button className="glow-button" onClick={() => (window.location.href = "/pricing")}>
          Upgrade to Premium
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const connectedCount = integrations.filter((i) => i.status === "connected").length;

  return (
    <div className="space-y-6" data-testid="integrations-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
          Integrations
        </h1>
        <p className="text-muted-foreground mt-1">
          Connect your platforms for automatic data import
        </p>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Link2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {connectedCount} of 4 Connected
                </p>
                <p className="text-sm text-muted-foreground">
                  Connect all platforms for complete financial visibility
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => {
          const info = PLATFORM_INFO[integration.platform];
          const isConnected = integration.status === "connected";

          return (
            <Card
              key={integration.platform}
              className="card-hover"
              data-testid={`integration-${integration.platform}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-2xl ${info.color}`}>
                      {info.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {info.name}
                      </CardTitle>
                      <CardDescription>{info.description}</CardDescription>
                    </div>
                  </div>

                  <Badge variant={isConnected ? "default" : "secondary"}>
                    {isConnected ? (
                      <span className="flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Connected
                      </span>
                    ) : (
                      "Not Connected"
                    )}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                {isConnected ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Connected on{" "}
                      {integration.connected_at
                        ? new Date(integration.connected_at).toLocaleDateString()
                        : "Unknown"}
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(integration.platform)}
                        disabled={syncing === integration.platform}
                        data-testid={`sync-${integration.platform}`}
                      >
                        {syncing === integration.platform ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Sync Now
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(integration.platform)}
                        data-testid={`disconnect-${integration.platform}`}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Connect {info.name} to import transactions automatically.
                    </p>

                    <Button
                      className="glow-button"
                      size="sm"
                      onClick={() => openConnectDialog(integration.platform)}
                      data-testid={`connect-${integration.platform}`}
                    >
                      Connect {info.name}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Outfit, sans-serif" }}>
              Connect {selectedPlatform ? PLATFORM_INFO[selectedPlatform].name : "Platform"}
            </DialogTitle>
            <DialogDescription>
              Connect this platform to import transactions automatically. Secure OAuth connection
              can be added later, but for now this will connect through your current backend demo flow.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            No API key is needed here. Just click connect to continue.
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeConnectDialog} disabled={connecting}>
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={connecting || !selectedPlatform}>
              {connecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsPage;

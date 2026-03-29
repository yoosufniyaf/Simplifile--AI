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

const ShopifyLogo = ({ className = "h-8 w-8" }) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    aria-label="Shopify logo"
    role="img"
  >
    <path
      d="M21 19.5c.2-2 1.7-3.6 3.7-3.8l18.7-2.2c2.4-.3 4.5 1.4 4.7 3.8l2.7 28.5c.2 1.9-1 3.6-2.8 4l-22.8 5.3c-2.2.5-4.3-1.1-4.5-3.3l-2.5-29.6c-.1-1.3.8-2.5 2-2.7Z"
      fill="#95BF47"
    />
    <path
      d="M31.7 14.8c1.1-1.3 2.7-2.2 4.3-2.2 1.6 0 3 .5 4 1.6 1.4 1.4 2.2 3.7 2.3 6.5"
      fill="none"
      stroke="#5E8E3E"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.5"
    />
    <path
      d="M40.5 23.1c-1.7-.9-4-1.4-6.2-1.4-4.8 0-8.1 2.7-8.4 6.7-.2 2.7 1.4 4.4 4.9 6 2.4 1.1 2.9 1.6 2.8 2.6-.1 1.2-1.3 2.1-3.3 2.1-2 0-3.8-.6-5.1-1.4l-1.2 3.9c1.2.8 3.6 1.4 5.9 1.4 5.2 0 8.7-2.5 9.1-6.7.2-2.8-1-4.5-4.1-5.9-2.6-1.2-3.7-1.8-3.6-3 .1-1 1.1-2 3.3-2 1.9 0 3.3.4 4.3.9l1.6-3.2Z"
      fill="#FFFFFF"
    />
    <path
      d="M24.5 25.2c.6-4.7 2.3-8.8 4.6-11.2 1.8-1.8 3.8-2.6 5.8-2.1 1 .2 1.9.8 2.6 1.6"
      fill="none"
      stroke="#2E5A22"
      strokeWidth="1.8"
      strokeLinecap="round"
      opacity="0.28"
    />
  </svg>
);

const PayPalLogo = ({ className = "h-8 w-8" }) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    aria-label="PayPal logo"
    role="img"
  >
    <path
      d="M24 10h14.5c8.1 0 12.9 4.7 11.6 11.9-1.6 8.7-7.6 12.6-15 12.6h-5.6l-2.3 14.1H16.9L24 10Z"
      fill="#003087"
    />
    <path
      d="M29.2 15.6h11.7c6.2 0 9.8 3.6 8.8 9.2-1.2 6.8-5.9 9.8-12.3 9.8h-5l-1.8 11.3H21.6l7.6-30.3Z"
      fill="#0070E0"
    />
    <path
      d="M26.1 22.5h8.5c3.8 0 6 2 5.3 5.3-.8 4-3.5 5.9-7.4 5.9h-3.4l-1.3 7.7h-6.7l5-18.9Z"
      fill="#001C64"
      opacity="0.94"
    />
  </svg>
);

const WhopLogo = ({ className = "h-8 w-8" }) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    aria-label="Whop logo"
    role="img"
  >
    <rect x="6" y="6" width="52" height="52" rx="14" fill="#FA4616" />
    <g fill="#FCF6F5">
      <path d="M13 31.2c4.5-4.6 8.8-7.6 13.7-10.4 2.6 1.6 4.8 3.5 6.8 5.9-4.8 2.8-8.5 6-12.7 10.5-3-1.3-5.4-3.4-7.8-6Z" />
      <path d="M24.6 38c5-5.6 8.8-9 15.1-13 2.9 1.3 5.7 3.2 8.3 5.7-5.8 3.3-9.8 6.7-15.3 12.7-3-.8-5.7-2.3-8.1-5.4Z" />
      <path d="M35.7 42.7c5.5-5.7 9.1-8.6 15.3-11.9v12.4c-3.5 1.6-7.6 2.4-12.2 2.4-1 0-2-.1-3.1-.2Z" />
    </g>
  </svg>
);

const PLATFORM_INFO = {
  shopify: {
    name: "Shopify",
    description: "Import orders, revenue, refunds, and fees",
    logo: ShopifyLogo,
    logoWrapClass: "bg-[#95BF47]/15 border border-[#95BF47]/30",
  },
  paypal: {
    name: "PayPal",
    description: "Import transactions and fees",
    logo: PayPalLogo,
    logoWrapClass: "bg-[#0070E0]/15 border border-[#0070E0]/30",
  },
  whop: {
    name: "Whop",
    description: "Connect your Whop store for revenue tracking",
    logo: WhopLogo,
    logoWrapClass: "bg-[#FA4616]/15 border border-[#FA4616]/30",
  },
};

const PLATFORM_KEYS = Object.keys(PLATFORM_INFO);

const DEFAULT_PLATFORMS = PLATFORM_KEYS.map((platform) => ({
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
        PLATFORM_KEYS.map((platform) => ({
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
          Upgrade to Premium to connect Shopify, PayPal, and Whop for automatic transaction imports.
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
  const totalPlatforms = PLATFORM_KEYS.length;

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
                  {connectedCount} of {totalPlatforms} Connected
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
          const Logo = info.logo;

          return (
            <Card
              key={integration.platform}
              className="card-hover"
              data-testid={`integration-${integration.platform}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-16 w-16 rounded-2xl flex items-center justify-center ${info.logoWrapClass}`}
                    >
                      <Logo className="h-10 w-10" />
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
              can be added later, but for now this will connect through your current backend flow.
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

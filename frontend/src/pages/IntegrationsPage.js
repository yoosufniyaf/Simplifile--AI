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

const ShopifyLogo = ({ className = "h-7 w-7" }) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    aria-label="Shopify logo"
    role="img"
  >
    <defs>
      <linearGradient id="shopifyBag" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#95BF47" />
        <stop offset="100%" stopColor="#5E8E3E" />
      </linearGradient>
    </defs>
    <path
      d="M18 20.5c.2-1.9 1.7-3.4 3.6-3.7l21.2-2.9c2.3-.3 4.3 1.3 4.6 3.6l3.1 29.2c.2 1.7-.9 3.3-2.6 3.7L22.8 58c-2 .5-4-1-4.2-3.1L16 24.1c-.1-1.2.8-2.3 2-2.5Z"
      fill="url(#shopifyBag)"
    />
    <path
      d="M41.5 22.5c-.1-2.5-.7-4.5-1.9-5.8-1-1.1-2.4-1.7-4-1.7h-.2c-.4-.6-1-1.1-1.7-1.4-2.7-1.2-6.4.8-8.8 4.8-1.7 2.8-2.9 6.3-3.2 9.1l-4 1.2.8 4.1 3.1-.9v.4c-.1 2.9.7 5.2 2.3 6.6 1.4 1.3 3.6 2 6.3 2 5.1 0 8.5-2.9 8.9-7.4.3-3.2-1.3-5.2-4.9-6.9-2.7-1.2-3.3-1.7-3.2-2.7.1-.8.9-1.7 2.7-1.7 1.5 0 2.8.4 3.8.8l1.5-4.5c-.8-.4-1.9-.8-3.3-1 .5-.9 1-1.8 1.6-2.5 1.2-1.6 2.4-2.4 3.2-2.5.4 0 .7.1 1 .3.7.7 1 2.8.9 4.7l4.1-1.3Zm-12.4-3.8c.9-1.5 2.1-2.7 3.1-3.1-.6.9-1.2 2.2-1.7 3.8l-4.2 1.3c.6-.7 1.8-1.4 2.8-2Zm-1.7 17.4c-1 0-1.9-.2-2.5-.7-.8-.7-1.2-1.9-1.2-3.5 0-.2 0-.4 0-.7l5.6-1.7c2 .9 2.9 1.7 2.8 2.9-.2 1.9-1.8 3.7-4.7 3.7Z"
      fill="#FFFFFF"
      opacity="0.95"
    />
    <path
      d="M29 12.7c1.4-2 3.1-3.2 4.8-3.7.9-.2 1.8-.2 2.5.1 1 .4 1.8 1.1 2.3 2.1"
      fill="none"
      stroke="#2F4F1E"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.35"
    />
  </svg>
);

const PayPalLogo = ({ className = "h-7 w-7" }) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    aria-label="PayPal logo"
    role="img"
  >
    <path
      d="M23 10h15.3c7.8 0 12.4 4.5 11.1 11.5-1.5 8.3-7.2 12-14.3 12H29l-2.4 15H16L23 10Z"
      fill="#003087"
    />
    <path
      d="M28.2 16h12.4c5.9 0 9.4 3.4 8.4 8.8-1.2 6.4-5.6 9.2-11.7 9.2h-5.2l-1.8 11.3H21L28.2 16Z"
      fill="#0070E0"
    />
    <path
      d="M25.5 23h8.7c3.6 0 5.7 1.9 5.1 5-0.7 3.8-3.2 5.6-7 5.6h-3.6l-1.2 7.4h-6.4L25.5 23Z"
      fill="#001C64"
      opacity="0.92"
    />
  </svg>
);

const WhopLogo = ({ className = "h-7 w-7" }) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    aria-label="Whop logo"
    role="img"
  >
    <rect x="6" y="6" width="52" height="52" rx="14" fill="#111111" />
    <path
      d="M17 22h7.2l3.4 13.2L31.6 22h6.2l4 13.2L45 22h7l-7.2 20h-5.9l-4.1-13.1L30.7 42h-5.9L17 22Z"
      fill="#FFFFFF"
    />
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
    logoWrapClass: "bg-white/5 border border-white/10",
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
                      className={`h-12 w-12 rounded-xl flex items-center justify-center ${info.logoWrapClass}`}
                    >
                      <Logo className="h-7 w-7" />
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

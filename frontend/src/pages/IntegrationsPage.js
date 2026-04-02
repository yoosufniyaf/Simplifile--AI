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
  Lock,
  Loader2,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLATFORM_INFO = {
  shopify: {
    name: "Shopify",
    description: "Import orders, revenue, refunds, and fees",
    logo: "/logos/shopify.png",
    color: "bg-green-500/10 border-green-500/20",
  },
  whop: {
    name: "Whop",
    description: "Connect your Whop store for revenue tracking",
    logo: "/logos/whop.png",
    color: "bg-orange-500/10 border-orange-500/20",
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

  const handleShopifyConnect = () => {
    const shop = window.prompt("Enter your Shopify store URL (example: mystore.myshopify.com)");
    if (!shop) return;

    const cleanedShop = shop.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

    if (!cleanedShop.includes(".myshopify.com")) {
      toast.error("Enter a valid Shopify store URL like mystore.myshopify.com");
      return;
    }

    if (!token) {
      toast.error("You must be logged in before connecting Shopify");
      return;
    }

    window.location.href = `${API}/integrations/shopify/connect?shop=${encodeURIComponent(cleanedShop)}&token=${encodeURIComponent(token)}`;
  };

  const handleConnect = async () => {
    if (!selectedPlatform) return;

    if (selectedPlatform === "shopify") {
      handleShopifyConnect();
      return;
    }

    if (selectedPlatform === "whop") {
      window.location.href = `${API}/integrations/whop/connect?token=${encodeURIComponent(token)}`;
      return;
    }

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

      setIntegrations((prev) =>
        prev.map((item) =>
          item.platform === platform
            ? { ...item, status: "connected" }
            : item
        )
      );
    } catch (error) {
      const detail =
        error?.response?.data?.detail || "Sync failed. Please try again.";

      toast.error(detail);

      if (
        detail.toLowerCase().includes("reconnect") ||
        detail.toLowerCase().includes("expired") ||
        detail.toLowerCase().includes("not properly connected")
      ) {
        setIntegrations((prev) =>
          prev.map((item) =>
            item.platform === platform
              ? { ...item, status: "reconnect_required" }
              : item
          )
        );
      }
    } finally {
      setSyncing(null);
    }
  };

  const openConnectDialog = (platform) => {
    if (platform === "shopify") {
      handleShopifyConnect();
      return;
    }

    setSelectedPlatform(platform);
    setConnectDialogOpen(true);
  };

  if (!hasPremiumAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Premium Feature</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Upgrade to Premium to connect Shopify and Whop.
        </p>
        <Button onClick={() => (window.location.href = "/pricing")}>
          Upgrade to Premium
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const connectedCount = integrations.filter((i) => i.status === "connected").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect your stores to sync business transactions automatically.
          </p>
        </div>

        <Badge className="text-sm px-3 py-1">
          {connectedCount}/{integrations.length} connected
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => {
          const info = PLATFORM_INFO[integration.platform];
          const isConnected = integration.status === "connected";
          const isReconnectRequired = integration.status === "reconnect_required";
          const isSyncing = syncing === integration.platform;

          return (
            <Card key={integration.platform}>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-14 w-14 rounded-xl flex items-center justify-center border ${info.color}`}>
                      <img
                        src={info.logo}
                        alt={info.name}
                        className="h-10 w-10 object-contain"
                      />
                    </div>

                    <div>
                      <CardTitle>{info.name}</CardTitle>
                      <CardDescription>{info.description}</CardDescription>
                    </div>
                  </div>

                  {isReconnectRequired ? (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      Reconnect Required
                    </Badge>
                  ) : (
                    <Badge variant={isConnected ? "default" : "secondary"}>
                      {isConnected ? "Connected" : "Not Connected"}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex flex-wrap gap-3">
                {!isConnected && !isReconnectRequired ? (
                  <Button onClick={() => openConnectDialog(integration.platform)}>
                    Connect {info.name}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleSync(integration.platform)}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        "Sync Now"
                      )}
                    </Button>

                    <Button
                      variant={isReconnectRequired ? "default" : "destructive"}
                      onClick={() =>
                        isReconnectRequired
                          ? openConnectDialog(integration.platform)
                          : handleDisconnect(integration.platform)
                      }
                    >
                      {isReconnectRequired ? `Reconnect ${info.name}` : "Disconnect"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Connect {selectedPlatform ? PLATFORM_INFO[selectedPlatform]?.name : "Integration"}
            </DialogTitle>
            <DialogDescription>
              This will connect your account so Simplifile AI can sync relevant business data.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={closeConnectDialog}>
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsPage;

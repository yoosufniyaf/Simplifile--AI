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

import shopifyLogo from "../assets/logos/shopify.svg";
import paypalLogo from "../assets/logos/paypal.svg";
import whopLogo from "../assets/logos/whop.svg";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLATFORM_INFO = {
  shopify: {
    name: "Shopify",
    description: "Import orders, revenue, refunds, and fees",
    logo: shopifyLogo,
    color: "bg-[#95BF47]/15 border border-[#95BF47]/30",
  },
  paypal: {
    name: "PayPal",
    description: "Import transactions and fees",
    logo: paypalLogo,
    color: "bg-[#0070E0]/15 border border-[#0070E0]/30",
  },
  whop: {
    name: "Whop",
    description: "Connect your Whop store for revenue tracking",
    logo: whopLogo,
    color: "bg-[#FA4616]/15 border border-[#FA4616]/30",
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
        { platform: selectedPlatform },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`${PLATFORM_INFO[selectedPlatform].name} connected`);
      closeConnectDialog();
      await fetchIntegrations();
    } catch (error) {
      toast.error("Failed to connect");
      setConnecting(false);
    }
  };

  const handleDisconnect = async (platform) => {
    try {
      await axios.delete(`${API}/integrations/${platform}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Disconnected");
      await fetchIntegrations();
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const handleSync = async (platform) => {
    setSyncing(platform);

    try {
      await axios.post(
        `${API}/integrations/${platform}/sync`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Sync complete");
    } catch {
      toast.error("Sync failed");
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
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Lock className="h-10 w-10 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Premium Feature</h2>
        <Button onClick={() => (window.location.href = "/pricing")}>
          Upgrade
        </Button>
      </div>
    );
  }

  if (loading) {
    return <Loader2 className="animate-spin" />;
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {integrations.map((integration) => {
        const info = PLATFORM_INFO[integration.platform];
        const isConnected = integration.status === "connected";

        return (
          <Card key={integration.platform}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${info.color}`}>
                  <img
                    src={info.logo}
                    alt={info.name}
                    className="h-10 w-10 object-contain"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>

                <div>
                  <CardTitle>{info.name}</CardTitle>
                  <CardDescription>{info.description}</CardDescription>
                </div>

                <Badge>{isConnected ? "Connected" : "Not Connected"}</Badge>
              </div>
            </CardHeader>

            <CardContent>
              {isConnected ? (
                <div className="flex gap-2">
                  <Button onClick={() => handleSync(integration.platform)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync
                  </Button>

                  <Button onClick={() => handleDisconnect(integration.platform)}>
                    <X className="mr-2 h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button onClick={() => openConnectDialog(integration.platform)}>
                  Connect
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default IntegrationsPage;

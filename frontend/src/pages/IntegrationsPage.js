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
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  Link2, 
  Lock,
  Loader2,
  Check,
  X,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLATFORM_INFO = {
  shopify: {
    name: "Shopify",
    description: "Import orders, revenue, refunds, and fees",
    icon: "🛍️",
    color: "bg-green-500/20 text-green-400 border-green-500/30"
  },
  stripe: {
    name: "Stripe",
    description: "Sync payments, subscriptions, and payouts",
    icon: "💳",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30"
  },
  paypal: {
    name: "PayPal",
    description: "Import transactions and fees",
    icon: "🅿️",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30"
  },
  whop: {
    name: "Whop",
    description: "Connect your Whop store for revenue tracking",
    icon: "⚡",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30"
  }
};

const IntegrationsPage = () => {
  const { token, checkPlanAccess } = useAuth();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");

  const hasEnterpriseAccess = checkPlanAccess("enterprise");

  const fetchIntegrations = useCallback(async () => {
    if (!hasEnterpriseAccess) {
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get(`${API}/integrations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIntegrations(response.data);
    } catch (error) {
      console.error("Failed to fetch integrations:", error);
    } finally {
      setLoading(false);
    }
  }, [token, hasEnterpriseAccess]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleConnect = async () => {
    try {
      await axios.post(
        `${API}/integrations/connect`,
        {
          platform: selectedPlatform,
          api_key: apiKey,
          api_secret: apiSecret
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`${PLATFORM_INFO[selectedPlatform].name} connected successfully`);
      setConnectDialogOpen(false);
      setApiKey("");
      setApiSecret("");
      fetchIntegrations();
    } catch (error) {
      toast.error("Failed to connect integration");
    }
  };

  const handleDisconnect = async (platform) => {
    try {
      await axios.delete(`${API}/integrations/${platform}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${PLATFORM_INFO[platform].name} disconnected`);
      fetchIntegrations();
    } catch (error) {
      toast.error("Failed to disconnect integration");
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
      toast.success(response.data.message);
    } catch (error) {
      toast.error("Sync failed");
    } finally {
      setSyncing(null);
    }
  };

  const openConnectDialog = (platform) => {
    setSelectedPlatform(platform);
    setConnectDialogOpen(true);
  };

  if (!hasEnterpriseAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center" data-testid="integrations-locked">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Enterprise Feature
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Upgrade to Enterprise to connect Shopify, Stripe, PayPal, and Whop for automatic transaction imports.
        </p>
        <Button className="glow-button" onClick={() => window.location.href = "/dashboard/settings"}>
          Upgrade to Enterprise
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

  return (
    <div className="space-y-6" data-testid="integrations-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Integrations
        </h1>
        <p className="text-muted-foreground mt-1">
          Connect your platforms for automatic data import
        </p>
      </div>

      {/* Connected Count */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Link2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {integrations.filter(i => i.status === "connected").length} of 4 Connected
                </p>
                <p className="text-sm text-muted-foreground">
                  Connect all platforms for complete financial visibility
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => {
          const info = PLATFORM_INFO[integration.platform];
          const isConnected = integration.status === "connected";

          return (
            <Card key={integration.platform} className="card-hover" data-testid={`integration-${integration.platform}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-2xl ${info.color}`}>
                      {info.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
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
                      Connected on {new Date(integration.connected_at).toLocaleDateString()}
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
                  <Button
                    className="w-full"
                    onClick={() => openConnectDialog(integration.platform)}
                    data-testid={`connect-${integration.platform}`}
                  >
                    Connect {info.name}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>
              Connect {selectedPlatform && PLATFORM_INFO[selectedPlatform]?.name}
            </DialogTitle>
            <DialogDescription>
              Enter your API credentials to connect. You can find these in your {selectedPlatform} dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API key"
                data-testid="api-key-input"
              />
            </div>
            <div className="space-y-2">
              <Label>API Secret (optional)</Label>
              <Input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Enter API secret"
                data-testid="api-secret-input"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Your credentials are encrypted and stored securely. We never share your data with third parties.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={!apiKey} data-testid="connect-submit-btn">
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsPage;

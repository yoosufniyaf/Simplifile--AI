import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { AILoadingState } from "../components/ui/ai-components";
import {
  BarChart3,
  Download,
  Lock,
  TrendingUp,
  TrendingDown,
  FileText,
  Zap,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { PieChart as RechartsChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ReportMetricCard = ({ label, value, sublabel, icon: Icon, color = "primary", size = "default" }) => {
  const colors = {
    primary: { bg: "bg-primary/10", border: "border-primary/20", text: "text-primary", iconBg: "bg-primary/20" },
    green: { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-500", iconBg: "bg-green-500/20" },
    red: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-500", iconBg: "bg-red-500/20" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-500", iconBg: "bg-amber-500/20" },
  };

  const c = colors[color];

  return (
    <Card className={`${c.bg} ${c.border}`}>
      <CardContent className={size === "large" ? "p-6" : "p-5"}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p
              className={`${size === "large" ? "text-3xl" : "text-2xl"} font-bold ${c.text}`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {value}
            </p>
            {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
          </div>
          {Icon && (
            <div
              className={`${size === "large" ? "h-12 w-12" : "h-10 w-10"} rounded-xl flex items-center justify-center ${c.iconBg}`}
            >
              <Icon className={`${size === "large" ? "h-6 w-6" : "h-5 w-5"} ${c.text}`} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ReportsPage = () => {
  const { token, checkPlanAccess } = useAuth();
  const [profitLoss, setProfitLoss] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profit-loss");

  const hasEnterpriseAccess = checkPlanAccess("enterprise");

  const fetchReports = useCallback(async () => {
    if (!hasEnterpriseAccess) {
      setLoading(false);
      return;
    }

    try {
      const [plRes, bsRes, cfRes] = await Promise.all([
        axios.get(`${API}/reports/profit-loss`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/reports/balance-sheet`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/reports/cash-flow`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setProfitLoss(plRes.data || null);
      setBalanceSheet(bsRes.data || null);
      setCashFlow(cfRes.data || null);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [token, hasEnterpriseAccess]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExport = async (reportType, format) => {
  try {
    const handleExport = async (reportType, format) => {
  try {
    const response = await axios.get(
      `${API}/reports/export/${reportType}?format=${format}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      }
    );

    const blob = new Blob([response.data], {
      type: format === "pdf" ? "application/pdf" : "text/csv",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportType}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    toast.success(`${reportType} report exported as ${format.toUpperCase()}`);
  } catch (error) {
    console.error("Export failed:", error);
    toast.error("Export failed. Please try again.");
  }
};

    const response = await axios.get(
      `${API}/reports/export/${reportType}?format=${format}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    toast.success(response.data.message || "Export generated");
  } catch (error) {
    toast.error("Export failed. Please try again.");
  }
};

  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  const getExpenseChartData = () => {
    if (!profitLoss?.data?.expenses) return [];
    return Object.entries(profitLoss.data.expenses).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  };

  if (!hasEnterpriseAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center" data-testid="reports-locked">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
          Enterprise Feature
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md text-sm">
          Upgrade to Enterprise for auto-generated financial statements including Profit & Loss,
          Balance Sheet, and Cash Flow reports.
        </p>
        <Button className="glow-button" onClick={() => (window.location.href = "/dashboard/settings")}>
          <Zap className="mr-2 h-4 w-4" />
          Upgrade to Enterprise
        </Button>
      </div>
    );
  }

  if (loading) {
    return <AILoadingState message="Loading financial reports..." />;
  }

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            Financial Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Auto-generated financial statements updated in real-time
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => handleExport(activeTab, "csv")} data-testid="export-csv-btn">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport(activeTab, "pdf")} data-testid="export-pdf-btn">
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted/30">
          <TabsTrigger value="profit-loss" data-testid="tab-profit-loss" className="data-[state=active]:bg-card">
            P&amp;L
          </TabsTrigger>
          <TabsTrigger value="balance-sheet" data-testid="tab-balance-sheet" className="data-[state=active]:bg-card">
            Balance Sheet
          </TabsTrigger>
          <TabsTrigger value="cash-flow" data-testid="tab-cash-flow" className="data-[state=active]:bg-card">
            Cash Flow
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profit-loss" className="space-y-6 mt-6">
          {profitLoss && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReportMetricCard
                  label="Revenue"
                  value={`$${(profitLoss.data?.revenue || 0).toLocaleString()}`}
                  icon={TrendingUp}
                  color="green"
                  size="large"
                />
                <ReportMetricCard
                  label="Total Expenses"
                  value={`$${(profitLoss.data?.total_expenses || 0).toLocaleString()}`}
                  icon={TrendingDown}
                  color="red"
                  size="large"
                />
                <ReportMetricCard
                  label="Net Income"
                  value={`$${(profitLoss.data?.net_income || 0).toLocaleString()}`}
                  icon={DollarSign}
                  color={(profitLoss.data?.net_income || 0) >= 0 ? "primary" : "amber"}
                  size="large"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Expense Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsChart>
                          <Pie
                            data={getExpenseChartData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={3}
                          >
                            {getExpenseChartData().map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                                className="stroke-background"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "hsl(240 10% 7%)",
                              border: "1px solid hsl(240 5% 17%)",
                              borderRadius: "12px",
                              padding: "12px",
                            }}
                            formatter={(value) => [`$${Number(value).toLocaleString()}`, "Amount"]}
                          />
                        </RechartsChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                      {getExpenseChartData().map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-xs text-muted-foreground">{entry.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Expenses by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-xl border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="font-semibold">Category</TableHead>
                            <TableHead className="text-right font-semibold">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(profitLoss.data?.expenses || {}).map(([category, amount]) => (
                            <TableRow key={category}>
                              <TableCell className="capitalize font-medium">{category}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                ${Number(amount).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="balance-sheet" className="space-y-6 mt-6">
          {balanceSheet && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReportMetricCard
                  label="Assets"
                  value={`$${(balanceSheet.data?.total_assets || 0).toLocaleString()}`}
                  icon={Wallet}
                  color="green"
                  size="large"
                />
                <ReportMetricCard
                  label="Liabilities"
                  value={`$${(balanceSheet.data?.total_liabilities || 0).toLocaleString()}`}
                  icon={TrendingDown}
                  color="red"
                  size="large"
                />
                <ReportMetricCard
                  label="Equity"
                  value={`$${(balanceSheet.data?.equity || 0).toLocaleString()}`}
                  icon={BarChart3}
                  color="primary"
                  size="large"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle style={{ fontFamily: "Outfit, sans-serif" }}>Assets</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Cash</span>
                      <span className="font-semibold">
                        ${Number(balanceSheet.data?.assets?.cash || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Accounts Receivable</span>
                      <span className="font-semibold">
                        ${Number(balanceSheet.data?.assets?.accounts_receivable || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="pt-3 border-t flex items-center justify-between">
                      <span className="font-semibold">Total Assets</span>
                      <span className="font-bold text-primary">
                        ${Number(balanceSheet.data?.total_assets || 0).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle style={{ fontFamily: "Outfit, sans-serif" }}>Liabilities</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Accounts Payable</span>
                      <span className="font-semibold">
                        ${Number(balanceSheet.data?.liabilities?.accounts_payable || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tax Payable</span>
                      <span className="font-semibold">
                        ${Number(balanceSheet.data?.liabilities?.tax_payable || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="pt-3 border-t flex items-center justify-between">
                      <span className="font-semibold">Total Liabilities</span>
                      <span className="font-bold text-red-500">
                        ${Number(balanceSheet.data?.total_liabilities || 0).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle style={{ fontFamily: "Outfit, sans-serif" }}>Equity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Retained Earnings</span>
                      <span className="font-semibold">
                        ${Number(balanceSheet.data?.equity || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="pt-3 border-t flex items-center justify-between">
                      <span className="font-semibold">Total Equity</span>
                      <span className="font-bold text-primary">
                        ${Number(balanceSheet.data?.equity || 0).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="cash-flow" className="space-y-6 mt-6">
          {cashFlow && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReportMetricCard
                  label="Operating Cash In"
                  value={`$${(cashFlow.data?.cash_in || 0).toLocaleString()}`}
                  icon={ArrowDownRight}
                  color="green"
                  size="large"
                />
                <ReportMetricCard
                  label="Operating Cash Out"
                  value={`$${(cashFlow.data?.cash_out || 0).toLocaleString()}`}
                  icon={ArrowUpRight}
                  color="red"
                  size="large"
                />
                <ReportMetricCard
                  label="Net Cash Flow"
                  value={`$${(cashFlow.data?.net_cash_flow || 0).toLocaleString()}`}
                  icon={DollarSign}
                  color={(cashFlow.data?.net_cash_flow || 0) >= 0 ? "primary" : "amber"}
                  size="large"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle style={{ fontFamily: "Outfit, sans-serif" }}>Cash Flow Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>Cash In</TableCell>
                          <TableCell className="text-right text-green-500 font-semibold">
                            ${Number(cashFlow.data?.cash_in || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Cash Out</TableCell>
                          <TableCell className="text-right text-red-500 font-semibold">
                            ${Number(cashFlow.data?.cash_out || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">Net Cash Flow</TableCell>
                          <TableCell
                            className={`text-right font-bold ${
                              (cashFlow.data?.net_cash_flow || 0) >= 0 ? "text-primary" : "text-amber-500"
                            }`}
                          >
                            ${Number(cashFlow.data?.net_cash_flow || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;

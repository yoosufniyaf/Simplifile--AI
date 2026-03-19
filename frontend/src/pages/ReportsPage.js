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
import { 
  BarChart3, 
  Download,
  Lock,
  Loader2,
  TrendingUp,
  TrendingDown,
  FileText,
  PieChart
} from "lucide-react";
import { PieChart as RechartsChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
        axios.get(`${API}/reports/cash-flow`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setProfitLoss(plRes.data);
      setBalanceSheet(bsRes.data);
      setCashFlow(cfRes.data);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  }, [token, hasEnterpriseAccess]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExport = async (reportType, format) => {
    try {
      const response = await axios.get(
        `${API}/reports/export/${reportType}?format=${format}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const getExpenseChartData = () => {
    if (!profitLoss?.data?.expenses) return [];
    return Object.entries(profitLoss.data.expenses).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
  };

  if (!hasEnterpriseAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center" data-testid="reports-locked">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Enterprise Feature
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Upgrade to Enterprise for auto-generated financial statements including Profit & Loss, Balance Sheet, and Cash Flow reports.
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
    <div className="space-y-6" data-testid="reports-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
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

      {/* Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="profit-loss" data-testid="tab-profit-loss">Profit & Loss</TabsTrigger>
          <TabsTrigger value="balance-sheet" data-testid="tab-balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cash-flow" data-testid="tab-cash-flow">Cash Flow</TabsTrigger>
        </TabsList>

        {/* Profit & Loss */}
        <TabsContent value="profit-loss" className="space-y-6">
          {profitLoss && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-green-500/10 border-green-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                        <p className="text-2xl font-bold text-green-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          ${profitLoss.data.revenue?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-red-500/10 border-red-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <TrendingDown className="h-8 w-8 text-red-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Expenses</p>
                        <p className="text-2xl font-bold text-red-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          ${profitLoss.data.total_expenses?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className={profitLoss.data.net_income >= 0 ? "bg-primary/10 border-primary/20" : "bg-amber-500/10 border-amber-500/20"}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <BarChart3 className={`h-8 w-8 ${profitLoss.data.net_income >= 0 ? "text-primary" : "text-amber-500"}`} />
                      <div>
                        <p className="text-sm text-muted-foreground">Net Income</p>
                        <p className={`text-2xl font-bold ${profitLoss.data.net_income >= 0 ? "text-primary" : "text-amber-500"}`} style={{ fontFamily: 'Outfit, sans-serif' }}>
                          ${profitLoss.data.net_income?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Expense Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsChart>
                          <Pie
                            data={getExpenseChartData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {getExpenseChartData().map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                            formatter={(value) => [`$${value.toLocaleString()}`, 'Amount']}
                          />
                        </RechartsChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Expenses by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(profitLoss.data.expenses || {}).map(([category, amount]) => (
                          <TableRow key={category}>
                            <TableCell className="capitalize">{category}</TableCell>
                            <TableCell className="text-right">${amount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="balance-sheet" className="space-y-6">
          {balanceSheet && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Assets</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Cash</TableCell>
                        <TableCell className="text-right">${balanceSheet.data.assets?.cash?.toLocaleString() || 0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Accounts Receivable</TableCell>
                        <TableCell className="text-right">${balanceSheet.data.assets?.accounts_receivable?.toLocaleString() || 0}</TableCell>
                      </TableRow>
                      <TableRow className="font-bold">
                        <TableCell>Total Assets</TableCell>
                        <TableCell className="text-right text-primary">${balanceSheet.data.assets?.total_assets?.toLocaleString() || 0}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Liabilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Accounts Payable</TableCell>
                        <TableCell className="text-right">${balanceSheet.data.liabilities?.accounts_payable?.toLocaleString() || 0}</TableCell>
                      </TableRow>
                      <TableRow className="font-bold">
                        <TableCell>Total Liabilities</TableCell>
                        <TableCell className="text-right text-red-500">${balanceSheet.data.liabilities?.total_liabilities?.toLocaleString() || 0}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Equity</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Retained Earnings</TableCell>
                        <TableCell className="text-right">${balanceSheet.data.equity?.retained_earnings?.toLocaleString() || 0}</TableCell>
                      </TableRow>
                      <TableRow className="font-bold">
                        <TableCell>Total Equity</TableCell>
                        <TableCell className="text-right text-green-500">${balanceSheet.data.equity?.total_equity?.toLocaleString() || 0}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Cash Flow */}
        <TabsContent value="cash-flow" className="space-y-6">
          {cashFlow && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-green-500/10 border-green-500/20">
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground">Total Inflow</p>
                    <p className="text-2xl font-bold text-green-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      ${cashFlow.data.total_inflow?.toLocaleString() || 0}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-red-500/10 border-red-500/20">
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground">Total Outflow</p>
                    <p className="text-2xl font-bold text-red-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      ${cashFlow.data.total_outflow?.toLocaleString() || 0}
                    </p>
                  </CardContent>
                </Card>
                <Card className={cashFlow.data.net_cash_flow >= 0 ? "bg-primary/10 border-primary/20" : "bg-amber-500/10 border-amber-500/20"}>
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground">Net Cash Flow</p>
                    <p className={`text-2xl font-bold ${cashFlow.data.net_cash_flow >= 0 ? "text-primary" : "text-amber-500"}`} style={{ fontFamily: 'Outfit, sans-serif' }}>
                      ${cashFlow.data.net_cash_flow?.toLocaleString() || 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Monthly Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Inflow</TableHead>
                        <TableHead className="text-right">Outflow</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(cashFlow.data.monthly_breakdown || {}).map(([month, data]) => (
                        <TableRow key={month}>
                          <TableCell>{month}</TableCell>
                          <TableCell className="text-right text-green-500">${data.inflow?.toLocaleString() || 0}</TableCell>
                          <TableCell className="text-right text-red-500">${data.outflow?.toLocaleString() || 0}</TableCell>
                          <TableCell className={`text-right font-medium ${(data.inflow - data.outflow) >= 0 ? "text-primary" : "text-amber-500"}`}>
                            ${(data.inflow - data.outflow)?.toLocaleString() || 0}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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

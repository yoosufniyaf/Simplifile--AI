import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  AISection,
  AIAnalysisCard,
  AILoadingState,
  AIEmptyState
} from "../components/ui/ai-components";
import { 
  Calculator, 
  Upload, 
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader2,
  Edit2,
  Trash2,
  Lock,
  BarChart3,
  Zap
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  "marketing",
  "software",
  "fees",
  "hosting",
  "infrastructure",
  "salary",
  "other"
];

// Metric Card Component
const MetricCard = ({ label, value, sublabel, icon: Icon, trend, color = "primary" }) => {
  const colors = {
    primary: "bg-primary/10 border-primary/20 text-primary",
    green: "bg-green-500/10 border-green-500/20 text-green-500",
    red: "bg-red-500/10 border-red-500/20 text-red-500",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-500"
  };

  return (
    <Card className={colors[color].split(' ').slice(0, 2).join(' ')}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className={`text-2xl font-bold ${colors[color].split(' ')[2]}`} style={{ fontFamily: 'Outfit, sans-serif' }}>
              {value}
            </p>
            {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
          </div>
          {Icon && (
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colors[color].split(' ')[0]}`}>
              <Icon className={`h-5 w-5 ${colors[color].split(' ')[2]}`} />
            </div>
          )}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{Math.abs(trend)}% from last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const BookkeepingPage = () => {
  const { token, checkPlanAccess } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "other",
    date: new Date().toISOString().split("T")[0],
    type: "expense"
  });

  const hasPremiumAccess = checkPlanAccess("premium");
  const hasEnterpriseAccess = checkPlanAccess("enterprise");

  const fetchTransactions = useCallback(async () => {
    if (!hasPremiumAccess) {
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get(`${API}/bookkeeping/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [token, hasPremiumAccess]);

  const fetchInsights = useCallback(async () => {
    if (!hasPremiumAccess) return;
    try {
      const response = await axios.get(`${API}/bookkeeping/insights`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInsights(response.data);
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    }
  }, [token, hasPremiumAccess]);

  useEffect(() => {
    fetchTransactions();
    fetchInsights();
  }, [fetchTransactions, fetchInsights]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const response = await axios.post(`${API}/bookkeeping/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      toast.success(`Imported ${response.data.count} transactions`);
      fetchTransactions();
      fetchInsights();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to import file");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleAddTransaction = async () => {
    try {
      await axios.post(
        `${API}/bookkeeping/transactions`,
        {
          ...formData,
          amount: parseFloat(formData.amount)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Transaction added");
      setAddDialogOpen(false);
      resetForm();
      fetchTransactions();
      fetchInsights();
    } catch (error) {
      toast.error("Failed to add transaction");
    }
  };

  const handleEditTransaction = async () => {
    if (!hasEnterpriseAccess) {
      toast.error("Enterprise plan required for editing");
      return;
    }
    try {
      await axios.put(
        `${API}/bookkeeping/transactions/${selectedTransaction.id}`,
        {
          ...formData,
          amount: parseFloat(formData.amount)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Transaction updated");
      setEditDialogOpen(false);
      resetForm();
      fetchTransactions();
      fetchInsights();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update transaction");
    }
  };

  const handleDeleteTransaction = async (transId) => {
    if (!hasEnterpriseAccess) {
      toast.error("Enterprise plan required for deleting");
      return;
    }
    try {
      await axios.delete(`${API}/bookkeeping/transactions/${transId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Transaction deleted");
      fetchTransactions();
      fetchInsights();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete transaction");
    }
  };

  const openEditDialog = (trans) => {
    setSelectedTransaction(trans);
    setFormData({
      description: trans.description,
      amount: Math.abs(trans.amount).toString(),
      category: trans.category,
      date: trans.date,
      type: trans.type
    });
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      description: "",
      amount: "",
      category: "other",
      date: new Date().toISOString().split("T")[0],
      type: "expense"
    });
    setSelectedTransaction(null);
  };

  const getCategoryColor = (category) => {
    const colors = {
      marketing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      software: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      fees: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      hosting: "bg-green-500/20 text-green-400 border-green-500/30",
      infrastructure: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      salary: "bg-pink-500/20 text-pink-400 border-pink-500/30",
      other: "bg-gray-500/20 text-gray-400 border-gray-500/30"
    };
    return colors[category] || colors.other;
  };

  if (!hasPremiumAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center" data-testid="bookkeeping-locked">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Premium Feature
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md text-sm">
          Upgrade to Premium to access AI-powered bookkeeping, automatic transaction categorization, and financial insights.
        </p>
        <Button className="glow-button" onClick={() => window.location.href = "/dashboard/settings"}>
          <Zap className="mr-2 h-4 w-4" />
          Upgrade to Premium
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="bookkeeping-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Bookkeeping
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and categorize your business transactions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" disabled={uploading} asChild>
            <label className="cursor-pointer">
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Import CSV
              <input
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleUpload}
                data-testid="csv-upload-input"
              />
            </label>
          </Button>
          <Button className="glow-button" onClick={() => setAddDialogOpen(true)} data-testid="add-transaction-btn">
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {insights && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="MRR"
            value={`$${insights.mrr.toLocaleString()}`}
            sublabel="Monthly Recurring"
            icon={BarChart3}
            color="primary"
          />
          <MetricCard
            label="Burn Rate"
            value={`$${insights.burn_rate.toLocaleString()}`}
            sublabel="Per Month"
            icon={TrendingDown}
            color="amber"
          />
          <MetricCard
            label="Runway"
            value={`${insights.runway_months} mo`}
            sublabel="Estimated"
            icon={Calculator}
            color="primary"
          />
          <MetricCard
            label="Profit Margin"
            value={`${insights.profit_margin}%`}
            sublabel="Net"
            icon={insights.profit_margin >= 0 ? TrendingUp : TrendingDown}
            color={insights.profit_margin >= 0 ? "green" : "red"}
          />
        </div>
      )}

      {/* Summary Cards */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Total Income"
            value={`$${insights.total_income.toLocaleString()}`}
            icon={TrendingUp}
            color="green"
          />
          <MetricCard
            label="Total Expenses"
            value={`$${insights.total_expenses.toLocaleString()}`}
            icon={TrendingDown}
            color="red"
          />
          <MetricCard
            label="Net Profit"
            value={`$${insights.net_profit.toLocaleString()}`}
            icon={DollarSign}
            color={insights.net_profit >= 0 ? "primary" : "amber"}
          />
        </div>
      )}

      {/* AI Financial Analysis */}
      {insights?.ai_analysis && (
        <AIAnalysisCard 
          content={insights.ai_analysis} 
          title="AI Financial Analysis"
        />
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <AILoadingState message="Loading transactions..." />
          ) : transactions.length === 0 ? (
            <AIEmptyState
              icon={Calculator}
              title="No transactions yet"
              description="Import a CSV file or add transactions manually to start tracking your finances."
              action={
                <div className="flex gap-3">
                  <Button variant="outline" asChild>
                    <label className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Import CSV
                      <input type="file" className="hidden" accept=".csv" onChange={handleUpload} />
                    </label>
                  </Button>
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Transaction
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="text-right font-semibold">Amount</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((trans) => (
                      <TableRow key={trans.id} className="group" data-testid={`transaction-row-${trans.id}`}>
                        <TableCell className="text-muted-foreground">
                          {new Date(trans.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">{trans.description}</TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(trans.category)} variant="secondary">
                            {trans.category}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${trans.type === "income" ? "text-green-500" : "text-red-500"}`}>
                          {trans.type === "income" ? "+" : "-"}${Math.abs(trans.amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(trans)}
                              disabled={!hasEnterpriseAccess}
                              className="h-8 w-8 p-0"
                              data-testid={`edit-trans-${trans.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTransaction(trans.id)}
                              disabled={!hasEnterpriseAccess}
                              className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-500"
                              data-testid={`delete-trans-${trans.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {!hasEnterpriseAccess && (
                <p className="text-xs text-muted-foreground mt-4 flex items-center gap-2 px-1">
                  <Lock className="h-3 w-3" />
                  Upgrade to Enterprise to edit or delete transactions
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Add Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., AWS Hosting"
                className="bg-muted/30"
                data-testid="trans-description-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  className="bg-muted/30"
                  data-testid="trans-amount-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
                >
                  <SelectTrigger className="bg-muted/30" data-testid="trans-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger className="bg-muted/30" data-testid="trans-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="bg-muted/30"
                  data-testid="trans-date-input"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTransaction} data-testid="save-transaction-btn">Add Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Edit Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-muted/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
                >
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="bg-muted/30"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditTransaction}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookkeepingPage;

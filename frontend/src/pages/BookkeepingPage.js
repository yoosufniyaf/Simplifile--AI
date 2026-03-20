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
  Calculator, 
  Upload, 
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader2,
  Edit2,
  Trash2,
  Lock
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
      marketing: "bg-purple-500/20 text-purple-400",
      software: "bg-blue-500/20 text-blue-400",
      fees: "bg-amber-500/20 text-amber-400",
      hosting: "bg-green-500/20 text-green-400",
      infrastructure: "bg-cyan-500/20 text-cyan-400",
      salary: "bg-pink-500/20 text-pink-400",
      other: "bg-gray-500/20 text-gray-400"
    };
    return colors[category] || colors.other;
  };

  if (!hasPremiumAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center" data-testid="bookkeeping-locked">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Premium Feature
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Upgrade to Premium to access AI-powered bookkeeping, automatic transaction categorization, and financial insights.
        </p>
        <Button className="glow-button" onClick={() => window.location.href = "/dashboard/settings"}>
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

      {/* Insights Cards */}
      {insights && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">MRR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                ${insights.mrr.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Monthly Recurring</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Burn Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
                ${insights.burn_rate.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Per Month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Runway</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {insights.runway_months} mo
              </div>
              <p className="text-xs text-muted-foreground">Estimated</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${insights.profit_margin >= 0 ? "text-green-500" : "text-red-500"}`} style={{ fontFamily: 'Outfit, sans-serif' }}>
                {insights.profit_margin}%
              </div>
              <p className="text-xs text-muted-foreground">Net</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Cards */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold text-green-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  ${insights.total_income.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-red-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  ${insights.total_expenses.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className={insights.net_profit >= 0 ? "bg-primary/10 border-primary/20" : "bg-amber-500/10 border-amber-500/20"}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${insights.net_profit >= 0 ? "bg-primary/20" : "bg-amber-500/20"}`}>
                <DollarSign className={`h-6 w-6 ${insights.net_profit >= 0 ? "text-primary" : "text-amber-500"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={`text-2xl font-bold ${insights.net_profit >= 0 ? "text-primary" : "text-amber-500"}`} style={{ fontFamily: 'Outfit, sans-serif' }}>
                  ${insights.net_profit.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Financial Analysis */}
      {insights?.ai_analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <span className="text-primary">🤖</span>
              AI Financial Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
                {insights.ai_analysis}
              </div>
            </div>
            {insights.generated_by === "mock" && (
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                💡 Connect your OpenAI API key for personalized AI-powered financial insights.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No transactions yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Import a CSV file or add transactions manually
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((trans) => (
                    <TableRow key={trans.id} data-testid={`transaction-row-${trans.id}`}>
                      <TableCell className="text-muted-foreground">
                        {new Date(trans.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{trans.description}</TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(trans.category)} variant="secondary">
                          {trans.category}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${trans.type === "income" ? "text-green-500" : "text-red-500"}`}>
                        {trans.type === "income" ? "+" : "-"}${Math.abs(trans.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(trans)}
                            disabled={!hasEnterpriseAccess}
                            data-testid={`edit-trans-${trans.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteTransaction(trans.id)}
                            disabled={!hasEnterpriseAccess}
                            data-testid={`delete-trans-${trans.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!hasEnterpriseAccess && transactions.length > 0 && (
            <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Upgrade to Enterprise to edit or delete transactions
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
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
                  data-testid="trans-amount-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
                >
                  <SelectTrigger data-testid="trans-type-select">
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
                  <SelectTrigger data-testid="trans-category-select">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Edit Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
                >
                  <SelectTrigger>
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
                  <SelectTrigger>
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

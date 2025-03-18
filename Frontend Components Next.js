// File: components/TransactionForm.js
import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

export default function TransactionForm({ addTransaction, categories, editTransaction, transaction, setIsEditing }) {
  const [formData, setFormData] = useState({
    amount: transaction?.amount?.toString() || '',
    description: transaction?.description || '',
    date: transaction?.date ? format(new Date(transaction.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    category: transaction?.category || (categories.length > 0 ? categories[0].name : '')
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const transactionData = {
      ...transaction,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: new Date(formData.date),
      category: formData.category
    };
    
    try {
      if (transaction?._id) {
        await editTransaction(transactionData);
        toast({
          title: "Transaction updated",
          description: "Your transaction has been updated successfully.",
        });
        if (setIsEditing) setIsEditing(false);
      } else {
        await addTransaction(transactionData);
        setFormData({
          amount: '',
          description: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          category: categories.length > 0 ? categories[0].name : ''
        });
        toast({
          title: "Transaction added",
          description: "Your transaction has been added successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save transaction. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCategoryChange = (value) => {
    setFormData(prev => ({ ...prev, category: value }));
    if (errors.category) {
      setErrors(prev => ({ ...prev, category: '' }));
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{transaction?._id ? 'Edit Transaction' : 'Add New Transaction'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              className={errors.amount ? "border-red-500" : ""}
            />
            {errors.amount && <p className="text-red-500 text-sm">{errors.amount}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Groceries, Rent, etc."
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              className={errors.date ? "border-red-500" : ""}
            />
            {errors.date && <p className="text-red-500 text-sm">{errors.date}</p>}
          </div>
          
          {categories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.name} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-red-500 text-sm">{errors.category}</p>}
            </div>
          )}
          
          <div className="pt-4 flex justify-end space-x-2">
            {transaction?._id && setIsEditing && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            )}
            <Button type="submit">
              {transaction?._id ? 'Update' : 'Add'} Transaction
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// File: components/TransactionList.js
import { useState } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Pencil, Trash } from 'lucide-react';
import TransactionForm from './TransactionForm';
import { toast } from '@/components/ui/use-toast';

export default function TransactionList({ transactions, categories, editTransaction, deleteTransaction }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  const handleEdit = (transaction) => {
    setCurrentTransaction(transaction);
    setIsEditing(true);
  };

  const handleDelete = (transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteTransaction(transactionToDelete._id);
      setIsDeleteDialogOpen(false);
      toast({
        title: "Transaction deleted",
        description: "Your transaction has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete transaction. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No transactions yet. Add your first transaction to get started!</p>
        ) : (
          <div className="overflow-x-auto">
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
                {transactions.map((transaction) => (
                  <TableRow key={transaction._id}>
                    <TableCell>{format(new Date(transaction.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{transaction.category}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${transaction.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleEdit(transaction)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleDelete(transaction)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {isEditing && (
          <div className="mt-6">
            <TransactionForm 
              transaction={currentTransaction}
              editTransaction={editTransaction}
              categories={categories}
              setIsEditing={setIsEditing}
            />
          </div>
        )}

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this transaction? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// File: components/MonthlyExpensesChart.js
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MonthlyExpensesChart({ transactions }) {
  // Group transactions by month and calculate total
  const monthlyData = transactions.reduce((acc, transaction) => {
    const date = new Date(transaction.date);
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    const key = `${month} ${year}`;
    
    if (!acc[key]) {
      acc[key] = {
        name: key,
        total: 0,
      };
    }
    
    acc[key].total += transaction.amount;
    return acc;
  }, {});
  
  // Convert to array and sort by date
  const chartData = Object.values(monthlyData).sort((a, b) => {
    const [aMonth, aYear] = a.name.split(' ');
    const [bMonth, bYear] = b.name.split(' ');
    
    if (aYear !== bYear) return aYear - bYear;
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.indexOf(aMonth) - months.indexOf(bMonth);
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Monthly Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-center text-gray-500 py-16">No data available. Add transactions to see your monthly expenses.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Total']} />
              <Bar dataKey="total" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// File: components/CategoryPieChart.js
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B', '#6877e0', '#556B2F'];

export default function CategoryPieChart({ transactions }) {
  // Group transactions by category
  const categoryData = transactions.reduce((acc, transaction) => {
    const { category, amount } = transaction;
    
    if (!acc[category]) {
      acc[category] = {
        name: category,
        value: 0,
      };
    }
    
    acc[category].value += amount;
    return acc;
  }, {});
  
  const chartData = Object.values(categoryData);
  
  // Sort by value (highest first)
  chartData.sort((a, b) => b.value - a.value);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-center text-gray-500 py-16">No data available. Add transactions to see your category breakdown.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// File: components/DashboardSummary.js
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { format } from 'date-fns';

export default function DashboardSummary({ transactions }) {
  // Calculate total expenses
  const totalExpenses = transactions.reduce((total, transaction) => {
    return total + transaction.amount;
  }, 0);
  
  // Get category breakdown
  const categoryBreakdown = transactions.reduce((acc, transaction) => {
    const { category, amount } = transaction;
    
    if (!acc[category]) {
      acc[category] = 0;
    }
    
    acc[category] += amount;
    return acc;
  }, {});
  
  // Convert to array and sort by amount (highest first)
  const sortedCategories = Object.entries(categoryBreakdown)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
  
  // Get recent transactions (top 3)
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Total Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">${totalExpenses.toFixed(2)}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Top Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedCategories.length === 0 ? (
            <p className="text-gray-500">No data available</p>
          ) : (
            <ul className="space-y-2">
              {sortedCategories.slice(0, 3).map((category) => (
                <li key={category.name} className="flex justify-between">
                  <span>{category.name}</span>
                  <span className="font-medium">${category.amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-gray-500">No recent transactions</p>
          ) : (
            <ul className="space-y-3">
              {recentTransactions.map((transaction) => (
                <li key={transaction._id} className="flex flex-col">
                  <div className="flex justify-between">
                    <span className="font-medium">{transaction.description}</span>
                    <span className="font-bold">${transaction.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{transaction.category}</span>
                    <span>{format(new Date(transaction.date), 'MMM dd, yyyy')}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// File: components/BudgetForm.js
import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

export default function BudgetForm({ addBudget, editBudget, budget, categories, setIsEditing }) {
  const [formData, setFormData] = useState({
    category: budget?.category || (categories.length > 0 ? categories[0].name : ''),
    amount: budget?.amount?.toString() || '',
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const budgetData = {
      ...budget,
      category: formData.category,
      amount: parseFloat(formData.amount),
    };
    
    try {
      if (budget?._id) {
        await editBudget(budgetData);
        toast({
          title: "Budget updated",
          description: "Your budget has been updated successfully.",
        });
        if (setIsEditing) setIsEditing(false);
      } else {
        await addBudget(budgetData);
        setFormData({
          category: categories.length > 0 ? categories[0].name : '',
          amount: '',
        });
        toast({
          title: "Budget added",
          description: "Your budget has been added successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save budget. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCategoryChange = (value) => {
    setFormData(prev => ({ ...prev, category: value }));
    if (errors.category) {
      setErrors(prev => ({ ...prev, category: '' }));
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{budget?._id ? 'Edit Budget' : 'Set Category Budget'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={handleCategoryChange}
              disabled={budget?._id}
            >
              <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.name} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-red-500 text-sm">{errors.category}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Monthly Budget ($)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              className={errors.amount ? "border-red-500" : ""}
            />
            {errors.amount && <p className="text-red-500 text-sm">{errors.amount}</p>}
          </div>
          
          <div className="pt-4 flex justify-end space-x-2">
            {budget?._id && setIsEditing && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            )}
            <Button type="submit">
              {budget?._id ? 'Update' : 'Set'} Budget
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// File: components/BudgetComparison.js
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function BudgetComparison({ transactions, budgets }) {
  // Group transactions by category for the current month
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const currentMonthTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate.getMonth() === currentMonth && 
           transactionDate.getFullYear() === currentYear;
  });
  
  const categorySpending = currentMonthTransactions.reduce((acc, transaction) => {
    const { category, amount } = transaction;
    
    if (!acc[category]) {
      acc[category] = 0;
    }
    
    acc[category] += amount;
    return acc;
  }, {});

  // Create comparison data
  const comparisonData = budgets.map(budget => {
    const spent = categorySpending[budget.category] || 0;
    const remaining = Math.max(0, budget.amount - spent);
    
    return {
      name: budget.category,
      budget: budget.amount,
      spent,
      remaining
    };
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Budget vs. Actual Spending</CardTitle>
      </CardHeader>
      <CardContent>
        {comparisonData.length === 0 ? (
          <p className="text-center text-gray-500 py-16">No budget data available. Set budgets to see comparison.</p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={comparisonData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="budget" fill="#8884d8" name="Budget" />
              <Bar dataKey="spent" fill="#82ca9d" name="Spent" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// File: components/SpendingInsights.js
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui/alert';
import { AlertCircle, TrendingDown, TrendingUp, CheckCircle } from 'lucide-react';

export default function SpendingInsights({ transactions, budgets }) {
  // Get current month transactions
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const currentMonthTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate.getMonth() === currentMonth && 
           transactionDate.getFullYear() === currentYear;
  });
  
  // Previous month
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  
  const previousMonthTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate.getMonth() === previousMonth && 
           transactionDate.getFullYear() === previousYear;
  });
  
  // Calculate spending by category for current month
  const currentMonthSpending = currentMonthTransactions.reduce((acc, transaction) => {
    const { category, amount } = transaction;
    
    if (!acc[category]) {
      acc[category] = 0;
    }
    
    acc[category] += amount;
    return acc;
  }, {});
  
  // Calculate total spending
  const totalCurrentMonthSpending = Object.values(currentMonthSpending).reduce((total, amount) => total + amount, 0);
  const totalPreviousMonthSpending = previousMonthTransactions.reduce((total, transaction) => total + transaction.amount, 0);
  
  // Get insights
  const insights = [];
  
  // Overall spending trend
  if (totalPreviousMonthSpending > 0) {
    const percentChange = ((totalCurrentMonthSpending - totalPreviousMonthSpending) / totalPreviousMonthSpending) * 100;
    
    if (percentChange > 10) {
      insights.push({
        type: 'warning',
        icon: <TrendingUp className="h-4 w-4" />,
        title: 'Spending Increase',
        description: `Your spending is up ${Math.abs(percentChange).toFixed(1)}% compared to last month.`
      });
    } else if (percentChange < -10) {
      insights.push({
        type: 'success',
        icon: <TrendingDown className="h-4 w-4" />,
        title: 'Spending Decrease',
        description: `Your spending is down ${Math.abs(percentChange).toFixed(1)}% compared to last month.`
      });
    }
  }
  
  // Budget alerts
  budgets.forEach(budget => {
    const spent = currentMonthSpending[budget.category] || 0;
    const percentUsed = (spent / budget.amount) * 100;
    
    if (percentUsed >= 90) {
      insights.push({
        type: 'destructive',
        icon: <AlertCircle className="h-4 w-

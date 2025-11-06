import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { supabase } from '../../utils/supabase/client';
import { projectId } from '../../lib/info';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useAuth } from '../../App';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import {
  DollarSign,
  TrendingUp,
  Plus,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Target,
  ChevronDown
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Link } from 'react-router-dom';

const DEFAULT_COLORS = [
  '#ECAABA',
  '#D38DAB',
  '#8B4D6C',
  '#9B89B0',
  '#675C83',
  '#483B63'
];

const monthlyTrends = [
  { month: 'Jan', personal: 1200, group: 800 },
  { month: 'Feb', personal: 1100, group: 1400 },
  { month: 'Mar', personal: 1300, group: 850 },
  { month: 'Apr', personal: 1250, group: 1950 },
  { month: 'May', personal: 1400, group: 1100 },
  { month: 'Jun', personal: 1180, group: 870 }
];

const recentTransactions = [
  {
    id: '1',
    title: 'Dinner at Italian Restaurant',
    amount: -45.80,
    type: 'group',
    category: 'Food & Dining',
    date: '2 hours ago',
    participants: ['John', 'Sarah', 'Mike'],
    status: 'settled'
  },
  {
    id: '2',
    title: 'Uber to Airport',
    amount: -28.50,
    type: 'personal',
    category: 'Transportation',
    date: '1 day ago',
    status: 'completed'
  },
  {
    id: '3',
    title: 'Coffee with Team',
    amount: -15.60,
    type: 'group',
    category: 'Food & Dining',
    date: '2 days ago',
    participants: ['Alex', 'Lisa'],
    status: 'pending'
  },
  {
    id: '4',
    title: 'Monthly Spotify',
    amount: -9.99,
    type: 'personal',
    category: 'Entertainment',
    date: '3 days ago',
    status: 'completed'
  }
];

const insights = [
  {
    type: 'spending',
    title: 'Spending Alert',
    message: 'You\'ve spent 15% more on dining this month compared to last month.',
    icon: TrendingUp,
    color: 'text-amber-600'
  },
  {
    type: 'savings',
    title: 'Great Progress!',
    message: 'You\'re on track to reach your savings goal this month.',
    icon: Target,
    color: 'text-green-600'
  },
  {
    type: 'recommendation',
    title: 'Smart Tip',
    message: 'Consider setting up automatic splits for recurring group expenses.',
    icon: Brain,
    color: 'text-blue-600'
  }
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryPeriod, setCategoryPeriod] = useState<'current' | 'previous'>('current'); // ✅ simplified
  const { user } = useAuth();

  // Fetch analytics overview
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7f88878c/analytics/spending`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAnalyticsData(data);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  // Correct monthly donut data fetcher
  useEffect(() => {
    const fetchMonthlyTotals = async () => {
      if (!user) return;
      setCategoryLoading(true);
      setCategoryError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setCategoryError('No session token');
          return;
        }

        // Send only the selected period to backend
        const reqBody = { period: categoryPeriod };

        const res = await fetch(`http://localhost:8000/api/expense_monthly_donut`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reqBody),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => String(res.status));
          setCategoryError(`Failed to fetch monthly totals: ${text}`);
          return;
        }

        const data = await res.json();

        // map to chart data
        const mapped = (data || []).map((d: any, i: number) => ({
          name: d.category,
          value: Number(d.total) || 0,
          color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        }));

        setCategoryData(mapped);
      } catch (err: any) {
        console.error('Error fetching monthly totals', err);
        setCategoryError(String(err?.message || err));
      } finally {
        setCategoryLoading(false);
      }
    };

    fetchMonthlyTotals();
  }, [user, categoryPeriod]); // depends on month type

  const totalSpending = analyticsData?.total_spending || 0;
  const savingsGoal = 1000;
  const monthlySavings = Math.max(0, savingsGoal - totalSpending);
  const savingsProgress = (monthlySavings / savingsGoal) * 100;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your financial overview.</p>
        </div>
        <Button asChild>
          <Link to="/add-expense">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Link>
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : `${totalSpending.toFixed(2)}`}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              This month's total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">You Owe</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">$0.00</div>
            <p className="text-xs text-muted-foreground">All settled up!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">You Are Owed</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-[#ac1852]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$0.00</div>
            <p className="text-xs text-muted-foreground">All settled up!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Savings</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : `${monthlySavings.toFixed(2)}`}</div>
            <Progress value={savingsProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{savingsProgress.toFixed(0)}% of ${savingsGoal} goal</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Expense Categories</CardTitle>
                    <CardDescription>Your spending breakdown</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="outline" size="sm" className="flex gap-1 text-sm">
                        {categoryPeriod === 'current' ? 'Current Month' : 'Previous Month'}
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setCategoryPeriod('current')}>
                        Current Month
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setCategoryPeriod('previous')}>
                        Previous Month
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent>
                <div className="h-[300px]">
                  {categoryLoading ? (
                    <div className="h-full flex items-center justify-center">Loading chart...</div>
                  ) : categoryError ? (
                    <div className="h-full flex items-center justify-center text-sm text-red-500">
                      Error: {categoryError}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData.length ? categoryData : DEFAULT_COLORS.map((c, i) => ({ name: `Category ${i+1}`, value: 0, color: c }))}
                          innerRadius={50}
                          outerRadius={80}
                          cx="50%"
                          cy="50%"
                          dataKey="value"
                        >
                          {(categoryData.length ? categoryData : DEFAULT_COLORS).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color ?? entry} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`$${Number(value).toFixed(2)}`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  {categoryData.length ? categoryData.map((category) => (
                    <div key={category.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                        <span>{category.name}</span>
                      </div>
                      <span className="font-medium">${category.value.toFixed(2)}</span>
                    </div>
                  )) : (
                    <div className="text-sm text-muted-foreground">No data for this month</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>Personal vs Group expenses over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="personal" stroke="#9B1313" name="Personal" />
                      <Line type="monotone" dataKey="group" stroke="#FFA896" name="Group" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Insights
              </CardTitle>
              <CardDescription>Personalized financial insights powered by AI</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.map((insight, index) => {
                  const Icon = insight.icon;
                  return (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Icon className={`h-5 w-5 mt-0.5 ${insight.color}`} />
                      <div className="flex-1">
                        <h4 className="font-medium">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground">{insight.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Your complete expense history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        {transaction.type === 'group' ? <Users className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                      </div>
                      <div>
                        <h4 className="font-medium">{transaction.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{transaction.category}</span>
                          <span>•</span>
                          <span>{transaction.date}</span>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs">
                            {transaction.type}
                          </Badge>
                          {transaction.participants && (
                            <>
                              <span>•</span>
                              <div className="flex -space-x-1">
                                {transaction.participants.slice(0, 3).map((participant, index) => (
                                  <Avatar key={index} className="h-4 w-4 border border-background">
                                    <AvatarFallback className="text-xs">{participant.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                ))}
                                {transaction.participants.length > 3 && (
                                  <div className="h-4 w-4 bg-muted border border-background rounded-full flex items-center justify-center text-xs">
                                    +{transaction.participants.length - 3}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-red-600">{transaction.amount.toFixed(2)}</div>
                      <Badge
                        variant={
                          transaction.status === 'settled'
                            ? 'default'
                            : transaction.status === 'pending'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Button variant="outline">Load More Transactions</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

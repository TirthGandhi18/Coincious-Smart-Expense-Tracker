import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { supabase } from '../../utils/supabase/client';
import { projectId } from '../../lib/info';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useAuth } from '../../App';
import { Tabs, TabsContent, TabsList, TabsTrigger  } from '../ui/tabs';  
import {
  DollarSign,
  TrendingUp,
  Plus,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Target
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Link } from 'react-router-dom';


const categoryData = [
  { name: 'Food & Dining', value: 680, color: '#ECAABA' },
  { name: 'Transportation', value: 340, color: '#D38DAB' },
  { name: 'Shopping', value: 520, color: '#8B4D6C' },
  { name: 'Entertainment', value: 280, color: '#9B89B0' },
  { name: 'Utilities', value: 450, color: '#675C83' },
  { name: 'Others', value: 320, color: '#483B63' }
];

const monthlyTrends = [
  { month: 'Ramani', personal: 1200, group: 800 },
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
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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

  const totalSpending = analyticsData?.total_spending || 0;
  const categoryBreakdown = analyticsData?.category_breakdown || {};
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
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/add-expense">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : `${totalSpending.toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-muted-foreground flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                This month's total
              </span>
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
            <div className="text-2xl font-bold">
              {loading ? '...' : `${monthlySavings.toFixed(2)}`}
            </div>
            <Progress value={savingsProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {savingsProgress.toFixed(0)}% of ${savingsGoal} goal
            </p>
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
                <CardTitle>Expense Categories</CardTitle>
                <CardDescription>Your spending breakdown this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        innerRadius={50}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {categoryData.map((category) => (
                    <div key={category.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span>{category.name}</span>
                      </div>
                      <span className="font-medium">${category.value}</span>
                    </div>
                  ))}
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
                    <Line type="monotone" dataKey="personal" stroke="#9B1313" />
                    <Line type="monotone" dataKey="group" stroke="#FFA896" />
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

        <TabsContent value="history" className="space-y-6">
          {/* Transaction History */}
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
                        {transaction.type === 'group' ? (
                          <Users className="h-4 w-4" />
                        ) : (
                          <DollarSign className="h-4 w-4" />
                        )}
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
                                    <AvatarFallback className="text-xs">
                                      {participant.charAt(0)}
                                    </AvatarFallback>
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
                      <div className="font-medium text-red-600">
                        {transaction.amount.toFixed(2)}
                      </div>
                      <Badge 
                        variant={transaction.status === 'settled' ? 'default' : 
                                transaction.status === 'pending' ? 'secondary' : 'outline'}
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

          {/* Historical Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Spending Trends</CardTitle>
              <CardDescription>Your expense patterns over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}`, 'Amount']} />
                    <Line 
                      type="monotone" 
                      dataKey="personal" 
                      stroke="#9B1313" 
                      strokeWidth={2}
                      name="Personal" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="group" 
                      stroke="#AD9CBE" 
                      strokeWidth={2}
                      name="Group" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  );
}
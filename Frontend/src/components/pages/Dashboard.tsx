import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { supabase } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { useAuth } from '../../App';
import { Layout } from "../Layout";
import {
  DollarSign,
  TrendingUp,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Target
} from 'lucide-react';
import { Link } from 'react-router-dom';



export default function DashboardPageWrapper() { return (<Layout> <Dashboard /></Layout>); }
export function Dashboard() {
  const currentTab = useState('overview');
  const analyticsInfo = useState<any>(null);
  const isDataLoading = useState(true);

  const activeTab = currentTab[0];
  const setActiveTab = currentTab[1];
  const analyticsData = analyticsInfo[0];
  const setAnalyticsData = analyticsInfo[1];
  const loading = isDataLoading[0];
  const setLoading = isDataLoading[1];

  const { user } = useAuth();

  // Simple data fetching
  useEffect(() => {
    const getAnalyticsData = async () => {
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
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
      }

      setLoading(false);
    };

    getAnalyticsData();
  }, [user]);

  // Simple calculations
  const totalSpending = analyticsData?.total_spending || 0;
  // category breakdown available via analyticsData.category_breakdown if needed
  const savingsGoal = 1000;
  const monthlySavings = Math.max(0, savingsGoal - totalSpending);
  const savingsProgress = (monthlySavings / savingsGoal) * 100;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page header */}
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

      {/* Summary cards */}
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
            <ArrowDownRight className="h-4 w-4 text-green-500" />
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
    </div>
  );
}
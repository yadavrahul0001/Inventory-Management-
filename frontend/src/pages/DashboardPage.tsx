import React, { useState, useEffect } from 'react';
import {
  Package,
  DollarSign,
  Truck,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import toast from 'react-hot-toast';
import { dashboardService } from '../services/dashboardService';
import { DashboardSummary, DashboardChartsData } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';

const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [charts, setCharts] = useState<DashboardChartsData | null>(null);
  const [timeRange, setTimeRange] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadDashboardData = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      else setIsLoading(true);

      const [summaryData, chartsData] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getCharts(timeRange),
      ]);

      setSummary(summaryData);
      setCharts(chartsData);
      if (showToast) toast.success('Dashboard metrics updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const kpis = summary?.kpis;
  const health = summary?.inventoryHealth;

  const salesTrendData = (charts?.salesOverTime || []).map((pt) => ({
    date: new Date(pt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: pt.revenue,
    quantity: pt.quantitySold,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Real-time business performance, inventory value, and sales velocity
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Horizon Selector */}
          <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  timeRange === days
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>

          <button
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
            className="btn-secondary flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Products */}
        <div className="card flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Catalog</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{kpis?.totalProducts || 0}</p>
            <p className="mt-1 text-xs text-gray-500">Active tracked items</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-900/20">
            <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Today's Sales */}
        <div className="card flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Today's Sales</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              ${(kpis?.todaySales.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {kpis?.todaySales.orderCount || 0} orders ({kpis?.todaySales.quantitySold || 0} units)
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-900/20">
            <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        {/* 30D Revenue */}
        <div className="card flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Monthly Revenue</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              ${(kpis?.monthlySales.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-gray-500">{kpis?.monthlySales.quantitySold || 0} units moved</p>
          </div>
          <div className="rounded-xl bg-purple-50 p-3 dark:bg-purple-900/20">
            <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        {/* Pending Purchases */}
        <div className="card flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Pending POs</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{kpis?.pendingPurchases.orderCount || 0}</p>
            <p className="mt-1 text-xs text-gray-500">{kpis?.pendingPurchases.totalUnits || 0} units incoming</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-900/20">
            <Truck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </div>

      {/* Inventory Health Bar */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Inventory Health Status</h2>
          <span className="text-xs text-gray-500">Live classification</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <div className="rounded-lg bg-emerald-50 p-3 text-center dark:bg-emerald-950/20">
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{health?.healthy || 0}</div>
            <div className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Healthy</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-center dark:bg-amber-950/20">
            <div className="text-xl font-bold text-amber-700 dark:text-amber-400">{health?.lowStock || 0}</div>
            <div className="text-xs font-medium text-amber-800 dark:text-amber-300">Low Stock</div>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-950/20">
            <div className="text-xl font-bold text-blue-700 dark:text-blue-400">{health?.reorderRecommended || 0}</div>
            <div className="text-xs font-medium text-blue-800 dark:text-blue-300">Reorder Rec.</div>
          </div>
          <div className="rounded-lg bg-purple-50 p-3 text-center dark:bg-purple-950/20">
            <div className="text-xl font-bold text-purple-700 dark:text-purple-400">{health?.stockOutRisk || 0}</div>
            <div className="text-xs font-medium text-purple-800 dark:text-purple-300">Stock-out Risk</div>
          </div>
          <div className="rounded-lg bg-rose-50 p-3 text-center dark:bg-rose-950/20">
            <div className="text-xl font-bold text-rose-700 dark:text-rose-400">{health?.critical || 0}</div>
            <div className="text-xs font-medium text-rose-800 dark:text-rose-300">Critical</div>
          </div>
        </div>
      </div>

      {/* Sales Trend Chart */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Revenue Timeline ({timeRange} Days)</h2>
            <p className="text-xs text-gray-500">Continuous daily sales aggregation</p>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-800" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} />
              <YAxis stroke="#6b7280" fontSize={12} tickLine={false} tickFormatter={(val) => `$${val}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  borderColor: '#374151',
                  borderRadius: '0.5rem',
                  color: '#ffffff',
                  fontSize: '12px',
                }}
                formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products & Category Distribution Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Selling Products */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Top Selling Products</h3>
            <span className="text-xs text-gray-500">By quantity moved</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3 text-right">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Revenue</th>
                  <th className="py-2.5 px-3 text-right">Current Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {(charts?.topSellingProducts || []).map((prod) => (
                  <tr key={prod.productId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                      <div>{prod.productName}</div>
                      <div className="font-mono text-gray-400">{prod.sku}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-purple-600 dark:text-purple-400">
                      {prod.quantitySold}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-gray-900 dark:text-white">
                      ${prod.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-600 dark:text-gray-300">
                      {prod.currentStock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Category Distribution</h3>
            <span className="text-xs text-gray-500">Stock & value breakdown</span>
          </div>
          <div className="space-y-3">
            {(charts?.categoryDistribution || []).map((cat) => (
              <div key={cat.category} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-900 dark:text-white">{cat.category}</span>
                  <span className="text-gray-500">{cat.productCount} products ({cat.totalStock} units)</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Retail Value: <strong className="text-gray-900 dark:text-white">${cat.totalRetailValue.toLocaleString()}</strong></span>
                  <span>Cost: ${cat.totalCostValue.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

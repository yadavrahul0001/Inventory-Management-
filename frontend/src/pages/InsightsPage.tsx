import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Package,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { insightsService } from '../services/insightsService';
import { AIInsight, InsightSeverity } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';

const InsightsPage: React.FC = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | InsightSeverity>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadData = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await insightsService.getInsights();
      setInsights(data);
      if (showToast) toast.success('Insights refreshed successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to load insights');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const counts = {
    all: insights.length,
    critical: insights.filter((i) => i.severity === 'critical').length,
    warning: insights.filter((i) => i.severity === 'warning').length,
    info: insights.filter((i) => i.severity === 'info').length,
    success: insights.filter((i) => i.severity === 'success').length,
  };

  const filteredInsights = activeTab === 'all'
    ? insights
    : insights.filter((i) => i.severity === activeTab);

  const getSeverityBadge = (severity: InsightSeverity) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
            <AlertCircle className="h-3 w-3" />
            Critical Action
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            Warning
          </span>
        );
      case 'info':
        return (
          <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            <Info className="h-3 w-3" />
            Optimization
          </span>
        );
      case 'success':
        return (
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Healthy
          </span>
        );
    }
  };

  const getTypeIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'STOCKOUT_IMMINENT':
        return <ShieldAlert className="h-5 w-5 text-rose-500" />;
      case 'DEMAND_SURGE':
        return <TrendingUp className="h-5 w-5 text-purple-500" />;
      case 'REORDER_RECOMMENDED':
        return <Package className="h-5 w-5 text-amber-500" />;
      case 'OVERSTOCK_RISK':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'HEALTHY_RUNWAY':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Inventory Insights</h1>
            <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              <Sparkles className="h-3 w-3" />
              Real-time Intelligence
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Automated recommendations combining live stock, supplier lead times, and ML demand projections
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="btn-secondary flex items-center gap-2 self-start text-xs font-semibold sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Analyzing...' : 'Refresh Insights'}
        </button>
      </div>

      {/* Summary KPI Counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          onClick={() => setActiveTab('critical')}
          className={`rounded-xl border p-4 text-left transition-all ${
            activeTab === 'critical'
              ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-500 dark:bg-rose-950/20'
              : 'border-gray-200 bg-white hover:border-rose-200 dark:border-gray-800 dark:bg-gray-900'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-xs font-medium uppercase tracking-wider">Critical Alerts</span>
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{counts.critical}</div>
          <p className="mt-1 text-xs text-gray-500">Stockout within lead time</p>
        </button>

        <button
          onClick={() => setActiveTab('warning')}
          className={`rounded-xl border p-4 text-left transition-all ${
            activeTab === 'warning'
              ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500 dark:bg-amber-950/20'
              : 'border-gray-200 bg-white hover:border-amber-200 dark:border-gray-800 dark:bg-gray-900'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-xs font-medium uppercase tracking-wider">Warnings</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{counts.warning}</div>
          <p className="mt-1 text-xs text-gray-500">Surges & reorder levels</p>
        </button>

        <button
          onClick={() => setActiveTab('info')}
          className={`rounded-xl border p-4 text-left transition-all ${
            activeTab === 'info'
              ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500 dark:bg-blue-950/20'
              : 'border-gray-200 bg-white hover:border-blue-200 dark:border-gray-800 dark:bg-gray-900'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-xs font-medium uppercase tracking-wider">Optimizations</span>
            <Info className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{counts.info}</div>
          <p className="mt-1 text-xs text-gray-500">Excess / overstock items</p>
        </button>

        <button
          onClick={() => setActiveTab('success')}
          className={`rounded-xl border p-4 text-left transition-all ${
            activeTab === 'success'
              ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 dark:bg-emerald-950/20'
              : 'border-gray-200 bg-white hover:border-emerald-200 dark:border-gray-800 dark:bg-gray-900'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-xs font-medium uppercase tracking-wider">Healthy Lines</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{counts.success}</div>
          <p className="mt-1 text-xs text-gray-500">Safe runway coverage</p>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('all')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          All Insights ({counts.all})
        </button>
        <button
          onClick={() => setActiveTab('critical')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'critical'
              ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Critical ({counts.critical})
        </button>
        <button
          onClick={() => setActiveTab('warning')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'warning'
              ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Warnings ({counts.warning})
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'info'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Optimizations ({counts.info})
        </button>
        <button
          onClick={() => setActiveTab('success')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'success'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Healthy ({counts.success})
        </button>
      </div>

      {/* Insights Cards List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredInsights.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No active insights in this category</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Inventory levels match baseline requirements.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInsights.map((insight) => (
            <div
              key={insight.id}
              className={`rounded-xl border bg-white p-5 shadow-sm transition-all dark:bg-gray-900 ${
                insight.severity === 'critical'
                  ? 'border-rose-200 dark:border-rose-900/50'
                  : insight.severity === 'warning'
                  ? 'border-amber-200 dark:border-amber-900/50'
                  : insight.severity === 'info'
                  ? 'border-blue-200 dark:border-blue-900/50'
                  : 'border-emerald-200 dark:border-emerald-900/50'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
                    {getTypeIcon(insight.type)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{insight.productName}</h3>
                      <span className="font-mono text-xs text-gray-500">({insight.sku})</span>
                      {getSeverityBadge(insight.severity)}
                    </div>
                    <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {insight.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Supporting Metrics Bar */}
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-400">
                <span className="rounded bg-gray-100 px-2 py-1 font-medium dark:bg-gray-800">
                  Current Stock: <strong className="text-gray-900 dark:text-white">{insight.metrics.currentStock}</strong>
                </span>
                <span className="rounded bg-gray-100 px-2 py-1 font-medium dark:bg-gray-800">
                  Daily Demand: <strong className="text-gray-900 dark:text-white">{insight.metrics.predictedDailyDemand}/day</strong>
                </span>
                <span className="rounded bg-gray-100 px-2 py-1 font-medium dark:bg-gray-800">
                  Lead Time: <strong className="text-gray-900 dark:text-white">{insight.metrics.leadTimeDays}d</strong>
                </span>
                <span className="rounded bg-gray-100 px-2 py-1 font-medium dark:bg-gray-800">
                  Runway: <strong className="text-gray-900 dark:text-white">{insight.metrics.daysUntilStockOut} days</strong>
                </span>
                <span className="rounded bg-gray-100 px-2 py-1 font-medium dark:bg-gray-800">
                  Reorder Point: <strong className="text-gray-900 dark:text-white">{insight.metrics.reorderPoint}</strong>
                </span>
                {insight.metrics.recommendedOrderQuantity > 0 && (
                  <span className="rounded bg-purple-100 px-2 py-1 font-semibold text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                    Recommended Order: {insight.metrics.recommendedOrderQuantity} units
                  </span>
                )}
              </div>

              {/* Action Recommendation Box */}
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-800/60">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
                <div className="text-gray-800 dark:text-gray-200">
                  <span className="font-semibold text-gray-900 dark:text-white">Recommended Action: </span>
                  {insight.recommendedAction}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InsightsPage;

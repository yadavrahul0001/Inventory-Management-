import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Sliders,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { anomalyService } from '../services/anomalyService';
import { SalesAnomaly, AnomalyType } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';

const AnomaliesPage: React.FC = () => {
  const [anomalies, setAnomalies] = useState<SalesAnomaly[]>([]);
  const [threshold, setThreshold] = useState<number>(2.0);
  const [daysWindow, setDaysWindow] = useState<number>(60);
  const [filterType, setFilterType] = useState<'ALL' | AnomalyType>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadAnomalies = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await anomalyService.getAnomalies({
        threshold,
        days: daysWindow,
      });
      setAnomalies(data);
      if (showToast) toast.success(`Found ${data.length} anomalies at ${threshold}σ`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to detect anomalies');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnomalies();
  }, [threshold, daysWindow]);

  const counts = {
    total: anomalies.length,
    spikes: anomalies.filter((a) => a.anomalyType === 'SPIKE').length,
    drops: anomalies.filter((a) => a.anomalyType === 'DROP').length,
    prices: anomalies.filter((a) => a.anomalyType === 'UNUSUAL_PRICE').length,
  };

  const filtered = filterType === 'ALL'
    ? anomalies
    : anomalies.filter((a) => a.anomalyType === filterType);

  const getTypeBadge = (type: AnomalyType) => {
    switch (type) {
      case 'SPIKE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
            <TrendingUp className="h-3 w-3" />
            Demand Spike
          </span>
        );
      case 'DROP':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            <TrendingDown className="h-3 w-3" />
            Volume Drop
          </span>
        );
      case 'UNUSUAL_PRICE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            <DollarSign className="h-3 w-3" />
            Price Variance
          </span>
        );
    }
  };

  const getSeverityBadge = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return (
          <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
            HIGH (&gt;3.0σ)
          </span>
        );
      case 'medium':
        return (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            MEDIUM
          </span>
        );
      case 'low':
        return (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Anomaly Detection</h1>
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
              <Activity className="h-3 w-3" />
              Statistical Z-Score Engine
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Detects unusual demand surges, abrupt sales drops, and unit price discrepancies
          </p>
        </div>

        <button
          onClick={() => loadAnomalies(true)}
          disabled={isRefreshing}
          className="btn-secondary flex items-center gap-2 self-start text-xs font-semibold sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Scanning...' : 'Scan Now'}
        </button>
      </div>

      {/* Control Filters Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-4">
          {/* Z-Score Threshold selector */}
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-gray-400" />
            <label htmlFor="threshold-select" className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Z-Score Cutoff:
            </label>
            <select
              id="threshold-select"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-900 focus:border-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value={1.5}>1.5σ (Sensitive)</option>
              <option value={2.0}>2.0σ (Standard - 95%)</option>
              <option value={2.5}>2.5σ (Significant)</option>
              <option value={3.0}>3.0σ (Extreme - 99.7%)</option>
            </select>
          </div>

          {/* Time Window */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <label htmlFor="window-select" className="text-xs font-medium text-gray-700 dark:text-gray-300">
              History Window:
            </label>
            <select
              id="window-select"
              value={daysWindow}
              onChange={(e) => setDaysWindow(parseInt(e.target.value, 10))}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-900 focus:border-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value={30}>Past 30 Days</option>
              <option value={60}>Past 60 Days</option>
              <option value={90}>Past 90 Days</option>
            </select>
          </div>
        </div>

        {/* Type Filter Buttons */}
        <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {(['ALL', 'SPIKE', 'DROP', 'UNUSUAL_PRICE'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filterType === type
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {type === 'ALL' ? 'All' : type === 'SPIKE' ? 'Spikes' : type === 'DROP' ? 'Drops' : 'Price'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Total Flagged</span>
            <AlertOctagon className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{counts.total}</div>
          <p className="mt-1 text-xs text-gray-500">At &ge; {threshold}σ deviation</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-purple-600 dark:text-purple-400">Demand Spikes</span>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{counts.spikes}</div>
          <p className="mt-1 text-xs text-gray-500">Unexpected high volume</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">Volume Drops</span>
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{counts.drops}</div>
          <p className="mt-1 text-xs text-gray-500">Unexpected low volume</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">Price Variances</span>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{counts.prices}</div>
          <p className="mt-1 text-xs text-gray-500">&gt;50% variance from list</p>
        </div>
      </div>

      {/* Anomalies Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Detected Anomalous Events ({filtered.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-gray-400" />
            <h4 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No anomalies found</h4>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Sales transactions fall within normal statistical limits for the selected window.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Anomaly Type</th>
                  <th className="px-6 py-3 text-right">Recorded Qty</th>
                  <th className="px-6 py-3 text-right">Expected Mean</th>
                  <th className="px-6 py-3 text-right">Z-Score</th>
                  <th className="px-6 py-3 text-center">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-mono text-xs text-gray-900 dark:text-white">
                      {item.date}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{item.productName}</div>
                      <div className="font-mono text-xs text-gray-500">{item.sku}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getTypeBadge(item.anomalyType)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">
                      {item.quantity} units
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">
                      {item.expectedMean} units
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold">
                      <span className={item.zScore > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-amber-600 dark:text-amber-400'}>
                        {item.zScore > 0 ? `+${item.zScore}σ` : `${item.zScore}σ`}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getSeverityBadge(item.severity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnomaliesPage;

import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { inventoryService, StockAdjustmentInput } from '../services/inventoryService';
import { productService } from '../services/productService';
import { ProductInventoryMetrics, Product, InventoryEventType } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';

const InventoryPage: React.FC = () => {
  const [metrics, setMetrics] = useState<ProductInventoryMetrics[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [adjustData, setAdjustData] = useState<StockAdjustmentInput>({
    productId: '',
    quantity: 1,
    type: 'ADJUSTMENT',
    reason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invData, prodData] = await Promise.all([
        inventoryService.getInventoryMetrics({
          search: searchQuery || undefined,
          status: statusFilter || undefined,
          riskLevel: riskFilter || undefined,
          limit: 100,
        }),
        productService.getProducts({ limit: 100 }),
      ]);

      setMetrics(Array.isArray(invData) ? invData : []);
      const safeProds = Array.isArray(prodData.products) ? prodData.products : [];
      setProducts(safeProds);
      if (safeProds[0] && !adjustData.productId) {
        setAdjustData((prev) => ({ ...prev, productId: safeProds[0]._id }));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load inventory data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, riskFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await inventoryService.adjustStock(adjustData);
      toast.success(`${res.message} (New stock: ${res.currentStock})`);
      setIsAdjustModalOpen(false);
      setAdjustData({
        productId: products[0]?._id || '',
        quantity: 1,
        type: 'ADJUSTMENT',
        reason: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Adjustment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Real-Time Inventory</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Dynamic safety stocks, reorder points, and automated stock-out risk assessment
          </p>
        </div>
        <button
          onClick={() => setIsAdjustModalOpen(true)}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Adjust Stock
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9"
            placeholder="Search products by SKU or name…"
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All Statuses</option>
          <option value="Healthy">Healthy</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Reorder Recommended">Reorder Recommended</option>
          <option value="Stock-out Risk">Stock-out Risk</option>
          <option value="Critical">Critical</option>
        </select>

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All Risk Levels</option>
          <option value="LOW">Low Risk</option>
          <option value="MEDIUM">Medium Risk</option>
          <option value="HIGH">High Risk</option>
          <option value="CRITICAL">Critical Risk</option>
        </select>
      </div>

      {/* Inventory Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : metrics.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <Package className="h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No inventory records found</h3>
            <p className="mt-1 text-xs text-gray-500">Add products or adjust filters to view inventory calculations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Product / SKU</th>
                  <th className="px-6 py-3 text-right">Current Stock</th>
                  <th className="px-6 py-3 text-right">Daily Demand</th>
                  <th className="px-6 py-3 text-right">Safety Stock</th>
                  <th className="px-6 py-3 text-right">Reorder Point</th>
                  <th className="px-6 py-3 text-right">Runway</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {metrics.map((m) => (
                  <tr key={m.productId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{m.productName}</div>
                      <div className="font-mono text-xs text-purple-600 dark:text-purple-400">{m.sku}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-gray-900 dark:text-white">{m.currentStock}</span>
                      {m.pendingIncomingQuantity > 0 && (
                        <div className="text-xs text-amber-600 dark:text-amber-400">
                          +{m.pendingIncomingQuantity} arriving
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                      {m.averageDailyDemand}/day
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-gray-700 dark:text-gray-300">
                      {m.safetyStock}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-purple-600 dark:text-purple-400">
                      {m.reorderPoint}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-semibold ${
                          m.daysUntilStockOut <= m.leadTimeDays
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {m.daysUntilStockOut} days
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={m.stockRisk.riskLevel} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Adjust Inventory Stock</h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Select Product</label>
                <select
                  required
                  value={adjustData.productId}
                  onChange={(e) => setAdjustData({ ...adjustData, productId: e.target.value })}
                  className="input mt-1"
                >
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (Current: {p.currentStock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Adjustment Event Type</label>
                <select
                  value={adjustData.type}
                  onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value as InventoryEventType })}
                  className="input mt-1"
                >
                  <option value="ADJUSTMENT">Manual Stock Correction</option>
                  <option value="RETURN">Customer Return (+)</option>
                  <option value="PURCHASE">Stock Arrival (+)</option>
                  <option value="SALE">Direct Reduction (-)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Quantity ({adjustData.type === 'SALE' ? 'Units Deducted' : 'Units Added/Altered'})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData({ ...adjustData, quantity: parseInt(e.target.value, 10) || 1 })}
                  className="input mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Reason / Notes</label>
                <input
                  value={adjustData.reason || ''}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  className="input mt-1"
                  placeholder="e.g. Annual physical count variance"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                  {isSubmitting ? 'Adjusting...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;

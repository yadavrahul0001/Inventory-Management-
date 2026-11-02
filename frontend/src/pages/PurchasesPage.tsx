import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { purchaseService, CreatePurchaseInput } from '../services/purchaseService';
import { productService } from '../services/productService';
import { supplierService } from '../services/supplierService';
import { Purchase, Product, Supplier, PaginationInfo, PurchaseStatus } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | ''>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [poForm, setPoForm] = useState<CreatePurchaseInput>({
    product: '',
    supplier: '',
    quantity: 10,
    unitCost: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [purchasesRes, productsRes, suppliersRes] = await Promise.all([
        purchaseService.getPurchases({
          page: currentPage,
          limit: 10,
          status: statusFilter || undefined,
        }),
        productService.getProducts({ limit: 100 }),
        supplierService.getSuppliers({ limit: 100 }),
      ]);

      setPurchases(Array.isArray(purchasesRes.purchases) ? purchasesRes.purchases : []);
      if (purchasesRes.pagination) setPagination(purchasesRes.pagination);
      const safeProds = Array.isArray(productsRes.products) ? productsRes.products : [];
      const safeSupps = Array.isArray(suppliersRes.suppliers) ? suppliersRes.suppliers : [];
      setProducts(safeProds);
      setSuppliers(safeSupps);

      if (safeProds[0] && !poForm.product) {
        const p = safeProds[0];
        const sId = typeof p.supplier === 'object' ? p.supplier._id : p.supplier || safeSupps[0]?._id;
        setPoForm({
          product: p._id,
          supplier: sId || '',
          quantity: 20,
          unitCost: p.costPrice,
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load purchase orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentPage, statusFilter]);

  const handleProductChange = (prodId: string) => {
    const prod = products.find((p) => p._id === prodId);
    const sId = typeof prod?.supplier === 'object' ? prod.supplier._id : prod?.supplier;
    setPoForm((prev) => ({
      ...prev,
      product: prodId,
      supplier: sId || prev.supplier,
      unitCost: prod?.costPrice || prev.unitCost,
    }));
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await purchaseService.createPurchase(poForm);
      toast.success('Purchase order created');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create PO');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceivePO = async (id: string) => {
    if (!window.confirm('Receive goods and increment live warehouse stock?')) return;
    try {
      await purchaseService.receivePurchase(id);
      toast.success('Goods received! Inventory stock updated.');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to receive goods');
    }
  };

  const handleCancelPO = async (id: string) => {
    if (!window.confirm('Cancel this purchase order?')) return;
    try {
      await purchaseService.cancelPurchase(id);
      toast.success('Purchase order cancelled');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel PO');
    }
  };

  const getStatusBadge = (status: PurchaseStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            <Clock className="h-3 w-3" />
            Pending Delivery
          </span>
        );
      case 'received':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Stock Received
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-400">
            <XCircle className="h-3 w-3" />
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Orders</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Issue procurement orders to suppliers and receive inventory into stock
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <Plus className="h-4 w-4" />
          Create Purchase Order
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800 w-fit">
        {(['', 'pending', 'received', 'cancelled'] as const).map((st) => (
          <button
            key={st}
            onClick={() => {
              setStatusFilter(st as PurchaseStatus | '');
              setCurrentPage(1);
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === st
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {st === '' ? 'All Orders' : st === 'pending' ? 'Pending' : st === 'received' ? 'Received' : 'Cancelled'}
          </button>
        ))}
      </div>

      {/* Purchases Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : purchases.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <Truck className="h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No purchase orders found</h3>
            <p className="mt-1 text-xs text-gray-500">Create a purchase order to replenish inventory.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">PO Date</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Supplier</th>
                  <th className="px-6 py-3 text-right">Units</th>
                  <th className="px-6 py-3 text-right">Unit Cost</th>
                  <th className="px-6 py-3 text-right">Total Cost</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {purchases.map((po) => {
                  const prodName = typeof po.product === 'object' ? po.product.name : 'Product';
                  const prodSku = typeof po.product === 'object' ? po.product.sku : '';
                  const suppName = typeof po.supplier === 'object' ? po.supplier.name : 'Supplier';

                  return (
                    <tr key={po._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {new Date(po.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{prodName}</div>
                        {prodSku && <div className="font-mono text-xs text-purple-600 dark:text-purple-400">{prodSku}</div>}
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{suppName}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">{po.quantity}</td>
                      <td className="px-6 py-4 text-right font-mono text-xs">${po.unitCost.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono font-semibold text-gray-900 dark:text-white">
                        ${po.totalCost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">{getStatusBadge(po.status)}</td>
                      <td className="px-6 py-4 text-center">
                        {po.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleReceivePO(po._id)}
                              className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                            >
                              Receive
                            </button>
                            <button
                              onClick={() => handleCancelPO(po._id)}
                              className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-800">
            <span className="text-xs text-gray-500">
              Page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="btn-secondary px-3 py-1 text-xs disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= pagination.pages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="btn-secondary px-3 py-1 text-xs disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Purchase Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Purchase Order</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Product</label>
                <select
                  required
                  value={poForm.product}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="input mt-1"
                >
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (Stock: {p.currentStock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Supplier</label>
                <select
                  required
                  value={poForm.supplier}
                  onChange={(e) => setPoForm({ ...poForm, supplier: e.target.value })}
                  className="input mt-1"
                >
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.leadTimeDays}d lead time)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Quantity to Order</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={poForm.quantity}
                  onChange={(e) => setPoForm({ ...poForm, quantity: parseInt(e.target.value, 10) || 1 })}
                  className="input mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Agreed Unit Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={poForm.unitCost}
                  onChange={(e) => setPoForm({ ...poForm, unitCost: parseFloat(e.target.value) || 0 })}
                  className="input mt-1 font-mono"
                />
              </div>

              {/* Total Calculation */}
              <div className="rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-800">
                <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
                  <span>Total Purchase Cost:</span>
                  <span className="text-base text-purple-600 dark:text-purple-400">
                    ${(poForm.quantity * poForm.unitCost).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                  {isSubmitting ? 'Creating...' : 'Issue Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesPage;

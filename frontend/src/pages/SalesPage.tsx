import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  DollarSign,
  Package,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { salesService, CreateSaleInput } from '../services/salesService';
import { productService } from '../services/productService';
import { Sale, Product, PaginationInfo } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';

const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchCustomer, setSearchCustomer] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saleForm, setSaleForm] = useState<CreateSaleInput>({
    product: '',
    quantity: 1,
    unitPrice: 0,
    customer: '',
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [salesRes, prodRes] = await Promise.all([
        salesService.getSales({
          page: currentPage,
          limit: 10,
          customer: searchCustomer || undefined,
        }),
        productService.getProducts({ limit: 100 }),
      ]);

      setSales(Array.isArray(salesRes.sales) ? salesRes.sales : []);
      if (salesRes.pagination) setPagination(salesRes.pagination);
      const safeProds = Array.isArray(prodRes.products) ? prodRes.products : [];
      setProducts(safeProds);

      if (safeProds[0] && !saleForm.product) {
        const first = safeProds[0];
        setSelectedProduct(first);
        setSaleForm((prev) => ({
          ...prev,
          product: first._id,
          unitPrice: first.sellingPrice,
        }));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load sales data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentPage]);

  const handleProductChange = (productId: string) => {
    const prod = products.find((p) => p._id === productId) || null;
    setSelectedProduct(prod);
    setSaleForm((prev) => ({
      ...prev,
      product: productId,
      unitPrice: prod?.sellingPrice || 0,
    }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error('Please choose a product');
      return;
    }

    if (saleForm.quantity > selectedProduct.currentStock) {
      toast.error(`Cannot sell ${saleForm.quantity} units. Only ${selectedProduct.currentStock} units in stock.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await salesService.createSale(saleForm);
      toast.success('Sale transaction recorded');
      setIsModalOpen(false);
      setSaleForm({
        product: products[0]?._id || '',
        quantity: 1,
        unitPrice: products[0]?.sellingPrice || 0,
        customer: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalRevenue = (Array.isArray(sales) ? sales : []).reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalUnits = (Array.isArray(sales) ? sales : []).reduce((sum, s) => sum + (s.quantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Transactions</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Log customer orders with real-time stock deduction and inventory event auditing
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <Plus className="h-4 w-4" />
          Record Sale
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Sales Transactions</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {pagination ? pagination.total : sales.length}
            </p>
            <p className="text-xs text-gray-400">Recorded orders</p>
          </div>
          <div className="rounded-xl bg-purple-50 p-3 dark:bg-purple-900/20">
            <ShoppingCart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        <div className="card flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Page Revenue</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400">Sum of visible rows</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-900/20">
            <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        <div className="card flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Units Sold</p>
            <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalUnits}
            </p>
            <p className="text-xs text-gray-400">Dispatched units</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-900/20">
            <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={searchCustomer}
          onChange={(e) => setSearchCustomer(e.target.value)}
          className="input pl-9"
          placeholder="Filter by customer name…"
        />
      </form>

      {/* Sales Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : sales.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <ShoppingCart className="h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No sales found</h3>
            <p className="mt-1 text-xs text-gray-500">Record a customer sale to see transaction history.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3 text-right">Quantity</th>
                  <th className="px-6 py-3 text-right">Unit Price</th>
                  <th className="px-6 py-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {sales.map((sale) => {
                  const prodName = typeof sale.product === 'object' ? sale.product.name : 'Product';
                  const prodSku = typeof sale.product === 'object' ? sale.product.sku : '';
                  return (
                    <tr key={sale._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {new Date(sale.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{prodName}</div>
                        {prodSku && <div className="font-mono text-xs text-purple-600 dark:text-purple-400">{prodSku}</div>}
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{sale.customer}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">{sale.quantity}</td>
                      <td className="px-6 py-4 text-right font-mono text-xs">${sale.unitPrice.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ${sale.totalAmount.toFixed(2)}
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

      {/* Record Sale Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Record Customer Sale</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Choose Product</label>
                <select
                  required
                  value={saleForm.product}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="input mt-1"
                >
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (Stock: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <p className="mt-1 text-xs text-gray-500">
                    Available in warehouse: <strong className="text-gray-900 dark:text-white">{selectedProduct.currentStock} units</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Quantity Sold</label>
                <input
                  type="number"
                  min="1"
                  max={selectedProduct ? selectedProduct.currentStock : undefined}
                  required
                  value={saleForm.quantity}
                  onChange={(e) => setSaleForm({ ...saleForm, quantity: parseInt(e.target.value, 10) || 1 })}
                  className="input mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Unit Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={saleForm.unitPrice}
                  onChange={(e) => setSaleForm({ ...saleForm, unitPrice: parseFloat(e.target.value) || 0 })}
                  className="input mt-1 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Customer Name</label>
                <input
                  required
                  value={saleForm.customer}
                  onChange={(e) => setSaleForm({ ...saleForm, customer: e.target.value })}
                  className="input mt-1"
                  placeholder="e.g. Acme Corporation"
                />
              </div>

              {/* Total Calculation Preview */}
              <div className="rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-800">
                <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
                  <span>Calculated Total:</span>
                  <span className="text-base text-emerald-600 dark:text-emerald-400">
                    ${(saleForm.quantity * saleForm.unitPrice).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (selectedProduct ? selectedProduct.currentStock <= 0 : false)}
                  className="btn-primary text-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;

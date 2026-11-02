import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { productService, CreateProductInput } from '../services/productService';
import { supplierService } from '../services/supplierService';
import { Product, Supplier, PaginationInfo } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const initialForm: CreateProductInput = {
    name: '',
    sku: '',
    category: 'Electronics',
    supplier: '',
    costPrice: 0,
    sellingPrice: 0,
    currentStock: 0,
    minimumStock: 10,
    reorderLevel: 20,
    leadTimeDays: 7,
    unit: 'pieces',
    status: 'active',
  };
  const [formData, setFormData] = useState<CreateProductInput>(initialForm);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, suppRes] = await Promise.all([
        productService.getProducts({
          page: currentPage,
          limit: 10,
          search: searchQuery || undefined,
          category: selectedCategory || undefined,
        }),
        supplierService.getSuppliers({ limit: 100 }),
      ]);

      setProducts(prodRes.products);
      if (prodRes.pagination) setPagination(prodRes.pagination);
      setSuppliers(suppRes.suppliers);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentPage, selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadData();
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      ...initialForm,
      supplier: suppliers[0]?._id || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    const supplierId = typeof p.supplier === 'object' ? p.supplier._id : p.supplier;
    setFormData({
      name: p.name,
      sku: p.sku,
      category: p.category,
      supplier: supplierId,
      description: p.description || '',
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      currentStock: p.currentStock,
      minimumStock: p.minimumStock,
      reorderLevel: p.reorderLevel,
      leadTimeDays: p.leadTimeDays,
      unit: p.unit,
      status: p.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await productService.updateProduct(editingProduct._id, formData);
        toast.success('Product updated successfully');
      } else {
        await productService.createProduct(formData);
        toast.success('Product created successfully');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await productService.deleteProduct(id);
      toast.success('Product removed');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete product');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Catalog</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage SKUs, stock thresholds, pricing, and supplier assignments
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Search and Category Filters */}
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
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All Categories</option>
          <option value="Electronics">Electronics</option>
          <option value="Accessories">Accessories</option>
          <option value="Office Supplies">Office Supplies</option>
          <option value="Peripherals">Peripherals</option>
        </select>
      </div>

      {/* Catalog Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <Package className="h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No products found</h3>
            <p className="mt-1 text-xs text-gray-500">Add a product or adjust your search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Product Name / SKU</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3 text-right">Cost Price</th>
                  <th className="px-6 py-3 text-right">Selling Price</th>
                  <th className="px-6 py-3 text-right">Stock</th>
                  <th className="px-6 py-3 text-right">Lead Time</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {products.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{p.name}</div>
                      <div className="font-mono text-xs text-purple-600 dark:text-purple-400">{p.sku}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">${p.costPrice.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-gray-900 dark:text-white">
                      ${p.sellingPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-semibold ${
                          p.currentStock <= p.minimumStock
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {p.currentStock} {p.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-gray-500">{p.leadTimeDays}d</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p._id, p.name)}
                          className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-800">
            <span className="text-xs text-gray-500">
              Page {pagination.page} of {pagination.pages} ({pagination.total} total items)
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="btn-secondary px-3 py-1 text-xs disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= pagination.pages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="btn-secondary px-3 py-1 text-xs disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Product Name</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input mt-1"
                    placeholder="e.g. Wireless Ergonomic Mouse"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">SKU Code</label>
                  <input
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    className="input mt-1 font-mono uppercase"
                    placeholder="MOUSE001"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input mt-1"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Peripherals">Peripherals</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="input mt-1 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="input mt-1 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Initial Stock</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value, 10) || 0 })}
                    className="input mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Min. Stock Alert</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.minimumStock}
                    onChange={(e) => setFormData({ ...formData, minimumStock: parseInt(e.target.value, 10) || 1 })}
                    className="input mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Supplier</label>
                  <select
                    required
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="input mt-1"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.leadTimeDays}d)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Lead Time (Days)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.leadTimeDays}
                    onChange={(e) => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value, 10) || 7 })}
                    className="input mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs"
                >
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Mail,
  Phone,
  MapPin,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supplierService, CreateSupplierInput } from '../services/supplierService';
import { Supplier, PaginationInfo } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';

const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const initialForm: CreateSupplierInput = {
    name: '',
    email: '',
    phone: '',
    address: '',
    leadTimeDays: 7,
    status: 'active',
  };
  const [formData, setFormData] = useState<CreateSupplierInput>(initialForm);

  const loadSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await supplierService.getSuppliers({
        page: currentPage,
        limit: 10,
        search: searchQuery || undefined,
      });
      setSuppliers(res.suppliers);
      if (res.pagination) setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [currentPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadSuppliers();
  };

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name,
      email: s.email,
      phone: s.phone,
      address: s.address || '',
      leadTimeDays: s.leadTimeDays,
      status: s.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingSupplier) {
        await supplierService.updateSupplier(editingSupplier._id, formData);
        toast.success('Supplier updated successfully');
      } else {
        await supplierService.createSupplier(formData);
        toast.success('Supplier added successfully');
      }
      setIsModalOpen(false);
      loadSuppliers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete supplier ${name}?`)) return;
    try {
      await supplierService.deleteSupplier(id);
      toast.success('Supplier deleted');
      loadSuppliers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete supplier');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Supplier Directory</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage vendors, procurement contacts, and delivery turnaround lead times
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="h-4 w-4" />
          Add Supplier
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-9"
          placeholder="Search suppliers by name or email…"
        />
      </form>

      {/* Suppliers Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <Users className="h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No suppliers found</h3>
            <p className="mt-1 text-xs text-gray-500">Create a supplier to start issuing purchase orders.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Supplier</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Address</th>
                  <th className="px-6 py-3 text-center">Lead Time</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {suppliers.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{s.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        {s.email}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {s.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {s.address ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          {s.address}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                        <Clock className="h-3 w-3" />
                        {s.leadTimeDays} days
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s._id, s.name)}
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

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-800">
            <span className="text-xs text-gray-500">
              Page {pagination.page} of {pagination.pages}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Company Name</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input mt-1"
                  placeholder="Apex Hardware Supply"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input mt-1"
                  placeholder="orders@apexsupply.com"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Phone</label>
                <input
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input mt-1"
                  placeholder="+1-555-0199"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Address (Optional)</label>
                <input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input mt-1"
                  placeholder="100 Logistics Blvd, Dallas TX"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Lead Time (Days)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.leadTimeDays}
                  onChange={(e) => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value, 10) || 7 })}
                  className="input mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                  {isSubmitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;

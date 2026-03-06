import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Car, Pencil, Trash2, MoreHorizontal, Eye, Calendar } from 'lucide-react';
import Header from '../../components/Layout/Header';
import StatusBadge from '../../components/common/StatusBadge';
import StatsCard from '../../components/common/StatsCard';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getVehicles, deleteVehicle } from '../../api/vehicles';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import VehicleForm from './VehicleForm';

const STATUS_TABS = [
  { key: 'all',          label: 'All' },
  { key: 'expected',     label: 'Expected' },
  { key: 'received',     label: 'Received' },
  { key: 'body_building',label: 'Body Building' },
  { key: 'in_workshop',  label: 'In Workshop' },
  { key: 'ready',        label: 'Ready' },
  { key: 'delivered',    label: 'Delivered' },
];

export default function VehicleList() {
  const [vehicles, setVehicles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const statusFilter = searchParams.get('status') || 'all';
  const dateFilter = searchParams.get('date') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const canManage = ['sales_admin', 'admin'].includes(user?.role);
  const canDelete = user?.role === 'admin';

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;
      if (dateFilter) params.date = dateFilter;
      const res = await getVehicles(params);
      setVehicles(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load vehicles'); }
    finally { setLoading(false); }
  }, [page, statusFilter, search, dateFilter]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const setStatus = (status) => {
    const p = new URLSearchParams(searchParams);
    if (status === 'all') p.delete('status'); else p.set('status', status);
    p.delete('page');
    setSearchParams(p);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setSearchParams(new URLSearchParams());
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this vehicle?')) return;
    try {
      await deleteVehicle(id);
      toast.success('Vehicle deleted');
      fetchVehicles();
    } catch { toast.error('Failed to delete'); }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditVehicle(null);
    fetchVehicles();
  };

  return (
    <div>
      <Header title="Vehicle Management" subtitle="Track vehicles through the delivery workflow" />
      <div className="p-4 md:p-6 space-y-4">

        {/* Search + Add */}
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-3">Enter the vehicle VIN, brand or job number to search</p>
          <div className="flex gap-2">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="input pl-9"
                  placeholder="Enter VIN, Brand, Model or Job Card (e.g., MH01MYZ001)"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary px-5">
                <Search size={16} /> Search
              </button>
            </form>
            {canManage && (
              <button onClick={() => { setEditVehicle(null); setShowForm(true); }} className="btn-blue whitespace-nowrap">
                <Plus size={16} /> <span className="hidden sm:inline">Add New Vehicle</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="card p-3">
          <div className="flex flex-wrap gap-1.5 items-center">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatus(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${statusFilter === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {tab.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              <input
                type="date"
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={dateFilter}
                onChange={e => {
                  const p = new URLSearchParams(searchParams);
                  if (e.target.value) p.set('date', e.target.value); else p.delete('date');
                  setSearchParams(p);
                }}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <LoadingSpinner fullscreen />
          ) : vehicles.length === 0 ? (
            <div className="text-center py-16">
              <Car size={48} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">No vehicles found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or add a new vehicle</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="table-th">Vehicle Details</th>
                      <th className="table-th">Odometer</th>
                      <th className="table-th">Job Card</th>
                      <th className="table-th">ETA</th>
                      <th className="table-th">Status</th>
                      <th className="table-th">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {vehicles.map(v => (
                      <VehicleRow
                        key={v.id}
                        vehicle={v}
                        canManage={canManage}
                        canDelete={canDelete}
                        activeMenu={activeMenu}
                        setActiveMenu={setActiveMenu}
                        onView={() => navigate(`/vehicles/${v.id}`)}
                        onEdit={() => { setEditVehicle(v); setShowForm(true); }}
                        onDelete={() => handleDelete(v.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {vehicles.map(v => (
                  <MobileVehicleCard
                    key={v.id}
                    vehicle={v}
                    onClick={() => navigate(`/vehicles/${v.id}`)}
                  />
                ))}
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-gray-100">
                <Pagination
                  {...pagination}
                  onPageChange={(p) => {
                    const params = new URLSearchParams(searchParams);
                    params.set('page', p);
                    setSearchParams(params);
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <VehicleForm
          vehicle={editVehicle}
          onSuccess={handleFormSuccess}
          onClose={() => { setShowForm(false); setEditVehicle(null); }}
        />
      )}
    </div>
  );
}

function VehicleRow({ vehicle: v, canManage, canDelete, activeMenu, setActiveMenu, onView, onEdit, onDelete }) {
  const ds = v.display_status || {};

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Vehicle Details */}
      <td className="table-td">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Car size={18} className="text-orange-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{v.vin}</p>
            <p className="text-xs text-gray-500">{v.brand} {v.model}</p>
          </div>
        </div>
      </td>
      <td className="table-td text-gray-600">{v.odometer?.toLocaleString()} KM</td>
      <td className="table-td">
        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{v.job_number}</span>
      </td>
      <td className="table-td">
        <div>
          <p className="text-sm font-medium text-gray-700">
            {v.eta ? format(new Date(v.eta), 'dd MMM yy') : '—'}
          </p>
          {v.actual_arrival_date && (
            <p className="text-xs text-gray-400">Arr: {format(new Date(v.actual_arrival_date), 'dd MMM')}</p>
          )}
        </div>
      </td>
      <td className="table-td">
        <StatusBadge label={ds.label || v.status} color={ds.color || 'gray'} />
      </td>
      <td className="table-td">
        <div className="flex items-center gap-1">
          <button onClick={onView} title="View" className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
            <Eye size={15} />
          </button>
          {canManage && (
            <button onClick={onEdit} title="Edit" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
              <Pencil size={15} />
            </button>
          )}
          {canDelete && (
            <button onClick={onDelete} title="Delete" className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function MobileVehicleCard({ vehicle: v, onClick }) {
  const ds = v.display_status || {};
  return (
    <div className="p-4 hover:bg-gray-50 cursor-pointer transition-colors" onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Car size={18} className="text-orange-500" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{v.vin}</p>
            <p className="text-xs text-gray-500">{v.brand} {v.model}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 ml-3">
          <StatusBadge label={ds.label || v.status} color={ds.color || 'gray'} size="sm" />
          <span className="text-xs text-gray-400">{v.job_number}</span>
        </div>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-gray-500">
        <span>ETA: {v.eta ? format(new Date(v.eta), 'dd MMM yy') : '—'}</span>
        <span>{v.odometer?.toLocaleString()} KM</span>
      </div>
    </div>
  );
}

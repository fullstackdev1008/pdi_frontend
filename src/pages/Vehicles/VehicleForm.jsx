import { useState, useEffect } from 'react';
import Modal from '../../components/common/Modal';
import { createVehicle, updateVehicle, addBodyBuilding, updateBodyBuilding } from '../../api/vehicles';
import { getUsers } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function VehicleForm({ vehicle, onSuccess, onClose }) {
  const { user } = useAuth();
  const isEdit = !!vehicle;
  const [loading, setLoading] = useState(false);
  const [salesManagers, setSalesManagers] = useState([]);
  const [form, setForm] = useState({
    vin: vehicle?.vin || '',
    brand: vehicle?.brand || '',
    model: vehicle?.model || '',
    color: vehicle?.color || '',
    year: vehicle?.year || new Date().getFullYear(),
    odometer: vehicle?.odometer || 0,
    eta: vehicle?.eta || '',
    sales_admin_id: vehicle?.sales_admin_id || '',
    requires_body_building: vehicle?.requires_body_building == 1,
    bb_vendor_name: vehicle?.body_building?.vendor_name || '',
    bb_eta: vehicle?.body_building?.eta || '',
    requires_accessories: vehicle?.requires_accessories == 1,
    notes: vehicle?.notes || '',
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (user?.role === 'admin') {
      getUsers({ role: 'sales_admin' })
        .then(r => setSalesManagers(r.data))
        .catch(() => {});
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEdit && user?.role === 'admin' && !form.sales_admin_id) {
      toast.error('Please assign a Sales Manager');
      return;
    }
    if (form.requires_body_building && (!form.bb_vendor_name.trim() || !form.bb_eta)) {
      toast.error('Body Building vendor name and ETA are required');
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await updateVehicle(vehicle.id, form);
        if (form.requires_body_building && form.bb_vendor_name && form.bb_eta) {
          if (vehicle.body_building) {
            // Update existing BB record
            await updateBodyBuilding(vehicle.id, {
              vendor_name: form.bb_vendor_name.trim(),
              eta: form.bb_eta,
            });
          } else {
            // Create new BB record (sales just checked the box)
            await addBodyBuilding(vehicle.id, {
              vendor_name: form.bb_vendor_name.trim(),
              eta: form.bb_eta,
            });
          }
        }
        toast.success('Vehicle updated');
      } else {
        const res = await createVehicle(form);
        if (form.requires_body_building && form.bb_vendor_name && form.bb_eta) {
          await addBodyBuilding(res.data.id, {
            vendor_name: form.bb_vendor_name.trim(),
            eta: form.bb_eta,
          });
        }
        toast.success('Vehicle added successfully');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? 'Edit Vehicle' : 'Add New Vehicle'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">VIN *</label>
            <input
              className="input"
              value={form.vin}
              onChange={e => set('vin', e.target.value.toUpperCase())}
              placeholder="e.g. MH01MYZ001"
              required
              disabled={isEdit}
            />
          </div>
          <div>
            <label className="label">Brand *</label>
            <input
              className="input"
              value={form.brand}
              onChange={e => set('brand', e.target.value)}
              placeholder="e.g. TATA, Mahindra"
              required
            />
          </div>
          <div>
            <label className="label">Model *</label>
            <input
              className="input"
              value={form.model}
              onChange={e => set('model', e.target.value)}
              placeholder="e.g. Nexon, Scorpio N"
              required
            />
          </div>
          <div>
            <label className="label">Color</label>
            <input
              className="input"
              value={form.color}
              onChange={e => set('color', e.target.value)}
              placeholder="e.g. White, Blue"
            />
          </div>
          <div>
            <label className="label">Year</label>
            <input
              type="number"
              className="input"
              value={form.year}
              onChange={e => set('year', parseInt(e.target.value))}
              min="2000"
              max="2030"
            />
          </div>
          <div>
            <label className="label">Odometer (KM)</label>
            <input
              type="number"
              className="input"
              value={form.odometer}
              onChange={e => set('odometer', parseInt(e.target.value) || 0)}
              min="0"
            />
          </div>
          <div>
            <label className="label">Expected Arrival Date (ETA) *</label>
            <input
              type="date"
              className="input"
              value={form.eta}
              onChange={e => set('eta', e.target.value)}
              required
              disabled={isEdit}
            />
            {isEdit && (
              <p className="text-xs text-gray-400 mt-1">Use "Revise ETA" on the vehicle detail page to update</p>
            )}
          </div>

          {/* Sales Manager assignment — admin only */}
          {user?.role === 'admin' && (
            <div>
              <label className="label">{isEdit ? 'Reassign to Sales Manager' : 'Assign to Sales Manager *'}</label>
              <select
                className="input"
                value={form.sales_admin_id}
                onChange={e => set('sales_admin_id', e.target.value)}
                required={!isEdit}
              >
                <option value="">Select Sales Manager…</option>
                {salesManagers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Checkboxes */}
        <div className="space-y-3 pt-1">
          {/* Body Building */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-brand-500"
                checked={form.requires_body_building}
                onChange={e => set('requires_body_building', e.target.checked)}
              />
              <span className="text-sm text-gray-700">Requires Body Building</span>
            </label>
            {form.requires_body_building && (
              <div className="mt-3 ml-6 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div>
                  <label className="label">BB Vendor Name *</label>
                  <input
                    className="input"
                    placeholder="e.g. Premier Body Works"
                    value={form.bb_vendor_name}
                    onChange={e => set('bb_vendor_name', e.target.value)}
                    required={form.requires_body_building}
                  />
                </div>
                <div>
                  <label className="label">BB Expected Completion (ETA) *</label>
                  <input
                    type="date"
                    className="input"
                    value={form.bb_eta}
                    onChange={e => set('bb_eta', e.target.value)}
                    required={form.requires_body_building}
                  />
                </div>
                {isEdit && vehicle?.body_building && (
                  <p className="col-span-2 text-xs text-gray-400">Editing existing body building vendor details.</p>
                )}
              </div>
            )}
          </div>

          {/* Accessories */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-brand-500"
              checked={form.requires_accessories}
              onChange={e => set('requires_accessories', e.target.checked)}
            />
            <span className="text-sm text-gray-700">Requires Accessories Fitment</span>
          </label>
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Any special instructions or notes..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving…' : isEdit ? 'Update Vehicle' : 'Add Vehicle'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

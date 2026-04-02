import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Car, CheckCircle, Clock, Package,
  PaintBucket, Wrench, Plus, History, Trash2, Check, X
} from 'lucide-react';
import Header from '../../components/Layout/Header';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import {
  getVehicle, receiveVehicle, deliverVehicle,
  acceptVehicle, rejectVehicle,
  addVehicleEta, addBodyBuilding, addBodyBuildingEta, completeBodyBuilding,
  createJob, completeJob, addJobEta,
  addChecklistItem, toggleChecklistItem, deleteChecklistItem
} from '../../api/vehicles';
import { getUsers } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const JOB_TYPES = [
  { value: 'pdi',         label: 'PDI',                 icon: Car },
  { value: 'accessories', label: 'Accessories Fitment', icon: Package },
  { value: 'paint',       label: 'Paint Job',           icon: PaintBucket },
  { value: 'other',       label: 'Other Job',           icon: Wrench },
];

const jobStatusColor = (job) => {
  if (job.status === 'completed') return 'green';
  const today = new Date().toISOString().split('T')[0];
  if (today > job.eta) return 'red';
  if (job.status === 'in_progress') return 'amber';
  return 'gray';
};

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workshop, setWorkshop] = useState([]);

  // Parent modals (for vehicle-level and body-building actions)
  const [modal, setModal] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const canSales = ['sales_admin', 'admin'].includes(user?.role);
  const canSupervisor = ['workshop_supervisor', 'admin'].includes(user?.role);
  const canMember = ['workshop_member', 'workshop_supervisor', 'admin'].includes(user?.role);

  const load = async () => {
    try {
      const res = await getVehicle(id);
      setVehicle(res.data);
    } catch {
      toast.error('Vehicle not found');
      navigate('/vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (canSupervisor) {
      getUsers({ role: 'workshop_member' })
        .then(r => setWorkshop(r.data))
        .catch(() => {});
    }
  }, [id]);

  const openModal = (name, job = null, extra = {}) => {
    setSelectedJob(job);
    setFormData(extra);
    setModal(name);
  };
  const closeModal = () => { setModal(null); setSelectedJob(null); setFormData({}); };

  const withSave = async (fn) => {
    setSaving(true);
    try {
      await fn();
      await load();
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><LoadingSpinner size="lg" /></div>;
  if (!vehicle) return null;

  const v = vehicle;
  const ds = v.display_status || {};
  const today = new Date().toISOString().split('T')[0];

  const etaColor = (eta, completed) => {
    if (completed) return 'green';
    if (today > eta) return 'red';
    return 'amber';
  };

  return (
    <div>
      <Header title={`${v.vin}`} subtitle={`${v.brand} ${v.model} · ${v.job_number}`} />
      <div className="p-4 md:p-6 space-y-5">

        {/* Back + Top Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button onClick={() => navigate('/vehicles')} className="btn-secondary">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex gap-2 flex-wrap">
            {canSales && v.status === 'expected' && (
              <button onClick={() => openModal('receive')} className="btn-primary">
                <CheckCircle size={16} /> Mark Received
              </button>
            )}
            {canSales && ['received', 'in_workshop'].includes(v.status) && !v.body_building && !v.workflow_state && (
              <button onClick={() => openModal('bodyBuilding')} className="btn-secondary">
                <Package size={16} /> Add Body Building
              </button>
            )}
            {/* Accept / Reject — shown when all jobs done, awaiting sales approval */}
            {canSales && ds.label === 'Pending Acceptance' && (
              <>
                <button onClick={() => withSave(async () => {
                  await acceptVehicle(v.id);
                  toast.success('Vehicle accepted — marked Ready!');
                })} className="btn-primary">
                  <CheckCircle size={16} /> Accept
                </button>
                <button onClick={() => openModal('reject')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-all shadow-sm">
                  <X size={16} /> Reject
                </button>
              </>
            )}
            {canSales && v.status === 'ready' && (
              <button onClick={() => withSave(() => deliverVehicle(v.id).then(() => toast.success('Marked as delivered!')))} className="btn-primary">
                <CheckCircle size={16} /> Mark Delivered
              </button>
            )}
            {canSales && !['delivered'].includes(v.status) && (
              <button onClick={() => openModal('eta')} className="btn-secondary">
                <Clock size={16} /> Revise ETA
              </button>
            )}
            {canSupervisor && ['received', 'in_workshop'].includes(v.status) && (
              <button onClick={() => openModal('addJob')} className="btn-blue">
                <Plus size={16} /> Allocate Job
              </button>
            )}
          </div>
        </div>

        {/* Vehicle Info Card */}
        <div className="card p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Car size={28} className="text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-gray-900">{v.vin}</h2>
                <StatusBadge label={ds.label} color={ds.color || 'gray'} />
              </div>
              <p className="text-gray-500">{v.brand} {v.model} · {v.color} · {v.year}</p>
              <p className="text-sm text-gray-500 mt-1">Managed by <span className="font-medium text-gray-700">{v.sales_admin_name}</span></p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
            {[
              { label: 'Job Card',     value: v.job_number },
              { label: 'Odometer',     value: `${v.odometer?.toLocaleString()} KM` },
              { label: 'Initial ETA',  value: v.eta_history?.[v.eta_history.length - 1]?.eta
                  ? format(new Date(v.eta_history[v.eta_history.length - 1].eta), 'dd MMM yyyy') : '—' },
              { label: 'Current ETA',  value: v.eta ? format(new Date(v.eta), 'dd MMM yyyy') : '—' },
              { label: 'Arrived',      value: v.actual_arrival_date ? format(new Date(v.actual_arrival_date), 'dd MMM yyyy') : '—' },
              { label: 'Body Building', value: v.requires_body_building ? 'Required' : 'Not required' },
              { label: 'Accessories',  value: v.requires_accessories ? 'Required' : 'Not required' },
            ].map(item => (
              <div key={item.label}>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{item.label}</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">{item.value}</p>
              </div>
            ))}
          </div>
          {v.notes && (
            <p className="mt-4 text-sm text-gray-500 bg-gray-50 rounded-lg p-3 border-l-4 border-gray-200">{v.notes}</p>
          )}
          {v.workflow_state === 'rework' && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-red-700">Rejected — Rework Required</p>
              {v.rejection_reason && (
                <p className="text-sm text-red-600 mt-1">Reason: {v.rejection_reason}</p>
              )}
            </div>
          )}
        </div>

        {/* Workflow Timeline */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-5">Workflow Timeline</h3>
          <div className="space-y-0">

            {/* Stage 1: Vehicle Arrival */}
            <TimelineStage
              icon={Car}
              title="Vehicle Arrival"
              subtitle={`ETA: ${v.eta ? format(new Date(v.eta), 'dd MMM yyyy') : '—'}`}
              status={v.actual_arrival_date ? 'green' : etaColor(v.eta, false)}
              statusLabel={v.actual_arrival_date
                ? `Arrived on ${format(new Date(v.actual_arrival_date), 'dd MMM yyyy')}`
                : 'Pending arrival'}
              actions={canSales && !v.actual_arrival_date ? [
                { label: 'Revise ETA', onClick: () => openModal('eta') }
              ] : []}
              etaHistory={v.eta_history}
              isLast={!v.requires_body_building && !v.body_building && (!v.jobs || v.jobs.length === 0)}
            />

            {/* Stage 2: Body Building (if required) */}
            {(v.requires_body_building || v.body_building) && (
              <TimelineStage
                icon={Package}
                title="Body Building"
                subtitle={v.body_building ? `Vendor: ${v.body_building.vendor_name}` : 'Not started'}
                status={!v.body_building ? 'gray'
                  : v.body_building.actual_completion_date ? 'green'
                  : etaColor(v.body_building.eta, false)}
                statusLabel={
                  !v.body_building ? 'Not assigned' :
                  v.body_building.actual_completion_date
                    ? `Completed ${format(new Date(v.body_building.actual_completion_date), 'dd MMM yyyy')}`
                    : `ETA: ${format(new Date(v.body_building.eta), 'dd MMM yyyy')}`
                }
                actions={canSales && v.body_building && !v.body_building.actual_completion_date ? [
                  { label: 'Revise ETA', onClick: () => openModal('bbEta') },
                  { label: 'Mark Complete', onClick: () => openModal('bbComplete') },
                ] : []}
                etaHistory={v.body_building?.eta_history}
                isLast={!v.jobs || v.jobs.length === 0}
              />
            )}

            {/* Stage 3: Workshop Jobs — inline checklist cards */}
            {v.jobs?.map((job, idx) => (
              <JobCard
                key={job.id}
                job={job}
                vehicleId={v.id}
                canMember={canMember}
                canSupervisor={canSupervisor}
                onRefresh={load}
                onReviseEta={() => openModal('jobEta', job)}
                isLast={idx === v.jobs.length - 1}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── VEHICLE-LEVEL MODALS ── */}

      <Modal isOpen={modal === 'receive'} onClose={closeModal} title="Mark Vehicle as Received">
        <div className="space-y-4">
          <div>
            <label className="label">Actual Arrival Date</label>
            <input type="date" className="input" defaultValue={today}
              onChange={e => setFormData({ date: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="btn-secondary">Cancel</button>
            <button disabled={saving} onClick={() => withSave(async () => {
              await receiveVehicle(v.id, { actual_arrival_date: formData.date || today });
              toast.success('Vehicle marked as received');
            })} className="btn-primary">
              {saving ? 'Saving…' : 'Confirm Receipt'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modal === 'eta'} onClose={closeModal} title="Revise Vehicle ETA">
        <EtaForm saving={saving}
          onSubmit={({ eta, remarks }) => withSave(async () => {
            await addVehicleEta(v.id, { eta, remarks });
            toast.success('ETA updated');
          })}
          onClose={closeModal}
        />
      </Modal>

      <Modal isOpen={modal === 'bodyBuilding'} onClose={closeModal} title="Add Body Building">
        <div className="space-y-4">
          <div>
            <label className="label">Vendor Name *</label>
            <input className="input" placeholder="e.g. Premier Body Works"
              onChange={e => setFormData(p => ({ ...p, vendor_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Expected Completion Date (ETA) *</label>
            <input type="date" className="input"
              onChange={e => setFormData(p => ({ ...p, eta: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="btn-secondary">Cancel</button>
            <button disabled={saving} onClick={() => withSave(async () => {
              if (!formData.vendor_name || !formData.eta) throw new Error('All fields required');
              await addBodyBuilding(v.id, formData);
              toast.success('Body building added');
            })} className="btn-primary">
              {saving ? 'Saving…' : 'Add Body Building'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modal === 'bbEta'} onClose={closeModal} title="Revise Body Building ETA">
        <EtaForm saving={saving}
          onSubmit={({ eta, remarks }) => withSave(async () => {
            await addBodyBuildingEta(v.id, { eta, remarks });
            toast.success('Body building ETA updated');
          })}
          onClose={closeModal}
        />
      </Modal>

      <Modal isOpen={modal === 'bbComplete'} onClose={closeModal} title="Complete Body Building">
        <div className="space-y-4">
          <div>
            <label className="label">Actual Completion Date</label>
            <input type="date" className="input" defaultValue={today}
              onChange={e => setFormData({ date: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="btn-secondary">Cancel</button>
            <button disabled={saving} onClick={() => withSave(async () => {
              await completeBodyBuilding(v.id, { actual_completion_date: formData.date || today });
              toast.success('Body building marked complete');
            })} className="btn-primary">
              {saving ? 'Saving…' : 'Mark Complete'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modal === 'addJob'} onClose={closeModal} title="Allocate Workshop Jobs" size="lg">
        <AllocateJobModal
          vehicleId={v.id}
          workshop={workshop}
          existingJobs={v.jobs || []}
          onSave={async () => { await load(); closeModal(); }}
          onClose={closeModal}
        />
      </Modal>

      <Modal isOpen={modal === 'reject'} onClose={closeModal} title="Reject Vehicle — Send for Rework">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            This vehicle will be sent back to the Workshop Supervisor as a <span className="font-semibold text-red-600">Rework</span> job.
          </p>
          <div>
            <label className="label">Rejection Reason *</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Describe what needs to be reworked…"
              onChange={e => setFormData({ reason: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="btn-secondary">Cancel</button>
            <button
              disabled={saving || !formData.reason?.trim()}
              onClick={() => withSave(async () => {
                await rejectVehicle(v.id, { reason: formData.reason });
                toast.success('Vehicle rejected — sent for rework');
              })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-all shadow-sm disabled:opacity-50"
            >
              {saving ? 'Rejecting…' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Job ETA Revision Modal (triggered from JobCard) */}
      <Modal isOpen={modal === 'jobEta'} onClose={closeModal}
        title={`Revise ETA – ${JOB_TYPES.find(t => t.value === selectedJob?.type)?.label || ''}`}
      >
        <EtaForm saving={saving}
          onSubmit={({ eta, remarks }) => withSave(async () => {
            await addJobEta(v.id, selectedJob.id, { eta, remarks });
            toast.success('Job ETA updated');
          })}
          onClose={closeModal}
        />
      </Modal>
    </div>
  );
}

// ─── JobCard: inline checklist per workshop job ───────────────────────────────
function JobCard({ job, vehicleId, canMember, canSupervisor, onRefresh, onReviseEta, isLast }) {
  const [checklist, setChecklist] = useState(job.checklist || []);
  const [newItem, setNewItem] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Sync if parent reloads
  useEffect(() => { setChecklist(job.checklist || []); }, [job.checklist]);

  const jt = JOB_TYPES.find(t => t.value === job.type);
  const Icon = jt?.icon || Wrench;
  const jc = jobStatusColor(job);
  const today = new Date().toISOString().split('T')[0];

  const doneCount = checklist.filter(i => i.is_completed).length;
  const totalCount = checklist.length;
  const allDone = totalCount > 0 && doneCount === totalCount;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const colorMap = { green: '#10b981', amber: '#f59e0b', red: '#ef4444', gray: '#9ca3af', blue: '#3b82f6' };
  const dotColor = colorMap[jc] || colorMap.gray;

  // Toggle a checklist item (optimistic)
  const toggleItem = async (itemId, currentVal) => {
    const newVal = currentVal ? 0 : 1;
    setChecklist(prev => prev.map(i => i.id === itemId ? { ...i, is_completed: newVal } : i));
    try {
      await toggleChecklistItem(vehicleId, job.id, itemId, { is_completed: !!newVal });
    } catch {
      setChecklist(prev => prev.map(i => i.id === itemId ? { ...i, is_completed: currentVal } : i));
      toast.error('Failed to update item');
    }
  };

  // Add custom item
  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    setAddingItem(true);
    try {
      const res = await addChecklistItem(vehicleId, job.id, { label: newItem.trim() });
      setChecklist(prev => [...prev, res.data]);
      setNewItem('');
    } catch {
      toast.error('Failed to add item');
    } finally { setAddingItem(false); }
  };

  // Delete item (supervisor only)
  const handleDeleteItem = async (itemId) => {
    setChecklist(prev => prev.filter(i => i.id !== itemId));
    try {
      await deleteChecklistItem(vehicleId, job.id, itemId);
    } catch {
      toast.error('Failed to delete item');
      onRefresh();
    }
  };

  // Mark job complete
  const handleComplete = async () => {
    if (!allDone && totalCount > 0) return;
    setCompleting(true);
    try {
      await completeJob(vehicleId, job.id, { actual_completion_date: today });
      toast.success(`${jt?.label || 'Job'} marked complete!`);
      await onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete job');
    } finally { setCompleting(false); }
  };

  return (
    <div className="flex gap-4 pb-6 last:pb-0">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center z-10"
          style={{ backgroundColor: dotColor, borderColor: dotColor }}>
          <Icon size={16} className="text-white" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1" />}
      </div>

      {/* Card content */}
      <div className="flex-1 min-w-0">
        {/* Job header */}
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <h4 className="text-sm font-bold text-gray-900">{jt?.label || job.type}</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              {job.description && <span>{job.description} · </span>}
              Assigned to: <span className="font-medium">{job.assigned_to_name || 'Unassigned'}</span>
            </p>
            <p className="text-xs text-gray-500">
              ETA: <span className={`font-medium ${today > job.eta && job.status !== 'completed' ? 'text-red-600' : 'text-gray-700'}`}>
                {format(new Date(job.eta), 'dd MMM yyyy')}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge
              label={job.status === 'completed' ? 'Completed' : (today > job.eta ? 'Delayed' : (job.status === 'in_progress' ? 'In Progress' : 'Pending'))}
              color={jc}
              size="sm"
            />
            {job.eta_history?.length > 0 && (
              <button onClick={() => setShowHistory(!showHistory)}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 flex items-center gap-1 transition-colors">
                <History size={12} /> ETA History ({job.eta_history.length})
              </button>
            )}
            {canMember && job.status !== 'completed' && (
              <button onClick={onReviseEta}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors">
                Revise ETA
              </button>
            )}
          </div>
        </div>

        {/* ETA History (collapsed) */}
        {showHistory && job.eta_history?.length > 0 && (
          <div className="mb-3 bg-gray-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ETA History</p>
            {job.eta_history.map((h, i) => (
              <div key={h.id} className="flex items-start gap-3 text-xs">
                <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white flex-shrink-0 text-[10px] font-bold
                  ${i === 0 ? 'bg-brand-500' : 'bg-gray-400'}`}>
                  {job.eta_history.length - i}
                </span>
                <div>
                  <span className="font-medium text-gray-700">{format(new Date(h.eta), 'dd MMM yyyy')}</span>
                  {h.remarks && <span className="text-gray-500"> — {h.remarks}</span>}
                  <span className="text-gray-400 block">{h.created_by_name} · {format(new Date(h.created_at), 'dd MMM yy, HH:mm')}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Checklist section */}
        {job.status !== 'completed' ? (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
            {/* Progress bar */}
            {totalCount > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-600">
                    {doneCount} / {totalCount} items complete
                  </span>
                  <span className={`text-xs font-bold ${allDone ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {pct}%
                  </span>
                </div>
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: allDone ? '#10b981' : pct > 50 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Items list */}
            {totalCount === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">
                No checklist items. Add custom items below.
              </p>
            ) : (
              <div className="space-y-1.5">
                {checklist.map(item => (
                  <ChecklistItem
                    key={item.id}
                    item={item}
                    canToggle={canMember && job.status !== 'completed'}
                    canDelete={canSupervisor && job.status !== 'completed'}
                    onToggle={() => toggleItem(item.id, item.is_completed)}
                    onDelete={() => handleDeleteItem(item.id)}
                  />
                ))}
              </div>
            )}

            {/* Add custom item */}
            {canMember && (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  className="input text-xs py-1.5 flex-1"
                  placeholder="Add custom checklist item..."
                  value={newItem}
                  onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                />
                <button
                  onClick={handleAddItem}
                  disabled={addingItem || !newItem.trim()}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50"
                >
                  <Plus size={13} /> Add
                </button>
              </div>
            )}

            {/* Complete job button */}
            {canMember && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  {allDone
                    ? <span className="text-emerald-600 font-medium">✓ All items complete – ready to close</span>
                    : totalCount === 0
                      ? 'Add checklist items or mark complete directly'
                      : <span className="text-amber-600">{totalCount - doneCount} item{totalCount - doneCount !== 1 ? 's' : ''} remaining</span>
                  }
                </p>
                <button
                  onClick={handleComplete}
                  disabled={completing || (totalCount > 0 && !allDone)}
                  title={!allDone && totalCount > 0 ? 'Complete all checklist items first' : ''}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${allDone || totalCount === 0
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  <CheckCircle size={13} />
                  {completing ? 'Completing…' : 'Mark Job Complete'}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Completed job — show read-only checklist summary */
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle size={13} /> All {totalCount} items completed
              </span>
              {job.actual_completion_date && (
                <span className="text-xs text-emerald-600">
                  Done {format(new Date(job.actual_completion_date), 'dd MMM yyyy')}
                </span>
              )}
            </div>
            <div className="space-y-1">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2 text-xs text-emerald-700">
                  <Check size={12} className="text-emerald-500 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ChecklistItem: single row with checkbox ──────────────────────────────────
function ChecklistItem({ item, canToggle, canDelete, onToggle, onDelete }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group
      ${item.is_completed ? 'bg-emerald-50' : 'bg-white border border-gray-100'}`}>
      {/* Checkbox */}
      <button
        onClick={canToggle ? onToggle : undefined}
        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
          ${item.is_completed
            ? 'bg-emerald-500 border-emerald-500'
            : canToggle
              ? 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
              : 'border-gray-200 bg-gray-50 cursor-default'
          }`}
        title={item.is_completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {item.is_completed && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>

      {/* Label */}
      <span className={`flex-1 text-xs min-w-0 truncate ${item.is_completed ? 'line-through text-emerald-600' : 'text-gray-700'}`}>
        {item.label}
      </span>

      {/* Completed by */}
      {item.is_completed && item.completed_by_name && (
        <span className="text-xs text-emerald-500 flex-shrink-0 hidden sm:block">
          ✓ {item.completed_by_name.split(' ')[0]}
        </span>
      )}

      {/* Delete (supervisor only, on hover) */}
      {canDelete && !item.is_completed && (
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
          title="Remove item"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

// ─── EtaForm ──────────────────────────────────────────────────────────────────
function EtaForm({ saving, onSubmit, onClose }) {
  const [eta, setEta] = useState('');
  const [remarks, setRemarks] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <label className="label">New ETA *</label>
        <input type="date" className="input" value={eta} onChange={e => setEta(e.target.value)} required />
      </div>
      <div>
        <label className="label">Reason / Remarks *</label>
        <textarea className="input resize-none" rows={3} value={remarks}
          onChange={e => setRemarks(e.target.value)}
          placeholder="Why is the ETA being revised?" required />
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button disabled={saving || !eta || !remarks} onClick={() => onSubmit({ eta, remarks })} className="btn-primary">
          {saving ? 'Saving…' : 'Update ETA'}
        </button>
      </div>
    </div>
  );
}

// ─── TimelineStage: for vehicle arrival and body building ─────────────────────
function TimelineStage({ icon: Icon, title, subtitle, status, statusLabel, actions, etaHistory, isLast }) {
  const [showHistory, setShowHistory] = useState(false);
  const colors = {
    green: 'bg-emerald-500 border-emerald-500',
    red:   'bg-red-500 border-red-500',
    amber: 'bg-amber-500 border-amber-500',
    blue:  'bg-blue-500 border-blue-500',
    gray:  'bg-gray-300 border-gray-300',
    teal:  'bg-teal-500 border-teal-500',
  };

  return (
    <div className="flex gap-4 pb-6 last:pb-0">
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 ${colors[status] || colors.gray}`}>
          <Icon size={16} className="text-white" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1" />}
      </div>
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-gray-900">{title}</h4>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge label={statusLabel} color={status} size="sm" />
            {actions?.map(a => (
              <button key={a.label} onClick={a.onClick}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors">
                {a.label}
              </button>
            ))}
            {etaHistory?.length > 0 && (
              <button onClick={() => setShowHistory(!showHistory)}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 flex items-center gap-1 transition-colors">
                <History size={12} /> History ({etaHistory.length})
              </button>
            )}
          </div>
        </div>
        {showHistory && etaHistory?.length > 0 && (
          <div className="mt-3 bg-gray-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ETA History</p>
            {etaHistory.map((h, i) => (
              <div key={h.id} className="flex items-start gap-3 text-xs">
                <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white flex-shrink-0 text-[10px] font-bold
                  ${i === 0 ? 'bg-brand-500' : 'bg-gray-400'}`}>
                  {etaHistory.length - i}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-700">{format(new Date(h.eta), 'dd MMM yyyy')}</span>
                  {h.remarks && <span className="text-gray-500"> — {h.remarks}</span>}
                  <span className="text-gray-400 block">{h.created_by_name} · {format(new Date(h.created_at), 'dd MMM yy, HH:mm')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AllocateJobModal: multi-job checkbox allocation ─────────────────────────
function AllocateJobModal({ vehicleId, workshop, existingJobs, onSave, onClose }) {
  const ALL_TYPES = [
    { value: 'pdi',         label: 'PDI'                 },
    { value: 'accessories', label: 'Accessories Fitment' },
    { value: 'paint',       label: 'Paint Job'           },
    { value: 'other',       label: 'Other Job'           },
  ];

  // For each type: find the latest existing job (if any)
  const existingByType = Object.fromEntries(
    ALL_TYPES.map(t => [t.value, existingJobs.find(j => j.type === t.value) || null])
  );

  // PDI is mandatory only if it has never been assigned at all
  const pdiEverAssigned = !!existingByType['pdi'];
  const pdiMandatory = !pdiEverAssigned;

  // A type is "locked read-only" if it has an active (non-complete) job
  const isLocked = (type) => {
    const j = existingByType[type];
    return j && j.status !== 'completed';
  };

  const initialForms = Object.fromEntries(
    ALL_TYPES.map(t => [t.value, {
      checked: t.value === 'pdi' && pdiMandatory,
      eta: '', description: '', assigned_to: '',
    }])
  );

  const [forms, setForms] = useState(initialForms);
  const [saving, setSaving] = useState(false);

  const toggle = (type) => {
    if (type === 'pdi' && pdiMandatory) return;
    setForms(p => ({ ...p, [type]: { ...p[type], checked: !p[type].checked } }));
  };

  const update = (type, field, value) => {
    setForms(p => ({ ...p, [type]: { ...p[type], [field]: value } }));
  };

  const handleSubmit = async () => {
    const toCreate = ALL_TYPES.filter(t => !isLocked(t.value) && forms[t.value].checked);
    for (const t of toCreate) {
      if (!forms[t.value].eta) {
        toast.error(`ETA is required for ${t.label}`);
        return;
      }
    }
    setSaving(true);
    try {
      for (const t of toCreate) {
        const f = forms[t.value];
        await createJob(vehicleId, {
          type: t.value,
          eta: f.eta,
          description: f.description || null,
          assigned_to: f.assigned_to || null,
        });
      }
      toast.success(`${toCreate.length} job(s) allocated`);
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to allocate jobs');
      setSaving(false);
    }
  };

  const checkedCount = ALL_TYPES.filter(t => !isLocked(t.value) && forms[t.value].checked).length;

  return (
    <div className="space-y-4">
      {pdiMandatory && (
        <p className="text-xs text-gray-500 bg-blue-50 rounded-lg p-3 border border-blue-100">
          PDI is mandatory and pre-selected. Check additional job types to allocate multiple at once.
        </p>
      )}

      <div className="space-y-2">
        {ALL_TYPES.map(t => {
          const locked = isLocked(t.value);
          const f = forms[t.value];
          const isMandatory = t.value === 'pdi' && pdiMandatory;

          // Active (non-complete) job exists → read-only row
          if (locked) {
            return (
              <div key={t.value} className="border border-gray-200 rounded-xl overflow-hidden opacity-60">
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                  <input type="checkbox" checked disabled className="w-4 h-4" />
                  <span className="text-sm font-semibold text-gray-500">{t.label}</span>
                  <span className="ml-auto text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">In Progress</span>
                </div>
              </div>
            );
          }

          // Available (never assigned, or previously completed) → interactive
          return (
            <div key={t.value} className={`border rounded-xl overflow-hidden transition-colors ${f.checked ? 'border-blue-200' : 'border-gray-200'}`}>
              <label className={`flex items-center gap-3 px-4 py-3 select-none ${isMandatory ? 'cursor-default' : 'cursor-pointer'} ${f.checked ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <input
                  type="checkbox"
                  checked={f.checked}
                  disabled={isMandatory}
                  onChange={() => toggle(t.value)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className={`text-sm font-semibold ${f.checked ? 'text-blue-800' : 'text-gray-600'}`}>
                  {t.label}
                </span>
                {isMandatory && <span className="ml-1 text-xs text-blue-500 font-normal">(mandatory)</span>}
                {existingByType[t.value]?.status === 'completed' && (
                  <span className="ml-auto text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Done — can redo</span>
                )}
              </label>

              {f.checked && (
                <div className="px-4 py-3 space-y-3 bg-white border-t border-blue-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label">Assign To</label>
                      <select className="input" value={f.assigned_to}
                        onChange={e => update(t.value, 'assigned_to', e.target.value)}>
                        <option value="">Select member...</option>
                        {workshop.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">ETA *</label>
                      <input type="date" className="input" value={f.eta}
                        onChange={e => update(t.value, 'eta', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <input className="input"
                      placeholder={`Details about the ${t.label}...`}
                      value={f.description}
                      onChange={e => update(t.value, 'description', e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button disabled={saving} onClick={handleSubmit} className="btn-blue">
          {saving ? 'Allocating…' : `Allocate ${checkedCount} Job${checkedCount !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}

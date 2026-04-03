import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Clock, CheckCircle, AlertTriangle, TrendingUp, Package, Truck } from 'lucide-react';
import Header from '../components/Layout/Header';
import StatsCard from '../components/common/StatsCard';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getDashboardSummary } from '../api/dashboard';
import { format } from 'date-fns';

const statusConfig = {
  expected:      { label: 'Expected',           color: 'gray'   },
  received:      { label: 'Received',           color: 'teal'   },
  body_building: { label: 'Body Building',      color: 'amber'  },
  in_workshop:   { label: 'In Workshop',        color: 'amber'  },
  pending_acceptance: { label: 'Pending Acceptance', color: 'orange' },
  rework:        { label: 'Rework',             color: 'red'    },
  ready:         { label: 'Ready',              color: 'blue'   },
  delivered:     { label: 'Delivered',          color: 'green'  },
};

// Resolve the correct display status for a vehicle (mirrors backend computeStatus)
function resolveStatus(v) {
  if (v.status === 'delivered') return statusConfig.delivered;
  if (v.workflow_state === 'rework') return statusConfig.rework;
  if (v.status === 'ready') return statusConfig.ready;
  return statusConfig[v.status] || { label: v.status, color: 'gray' };
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardSummary()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats;

  return (
    <div>
      <Header title="Dashboard" subtitle="Overview of vehicle delivery workflow" />
      <div className="p-4 md:p-6 space-y-6">
        {loading ? (
          <LoadingSpinner fullscreen />
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <StatsCard
                label="Total Vehicles"
                value={stats?.total || 0}
                icon={Car}
                color="blue"
                onClick={() => navigate('/vehicles')}
              />
              <StatsCard
                label="In Progress"
                value={stats?.inProgress || 0}
                icon={Clock}
                color="amber"
                onClick={() => navigate('/vehicles?status=in_workshop')}
              />
              <StatsCard
                label="Delayed"
                value={stats?.delayed || 0}
                icon={AlertTriangle}
                color="red"
              />
              <StatsCard
                label="Ready for Delivery"
                value={stats?.ready || 0}
                icon={CheckCircle}
                color="green"
                onClick={() => navigate('/vehicles?status=ready')}
              />
            </div>

            {/* Second row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <StatsCard
                label="Expected Arrivals"
                value={stats?.expected || 0}
                icon={Package}
                color="gray"
                onClick={() => navigate('/vehicles?status=expected')}
              />
              <StatsCard
                label="Pending Acceptance"
                value={stats?.pendingAcceptance || 0}
                icon={Clock}
                color="amber"
              />
              <StatsCard
                label="Rework"
                value={stats?.rework || 0}
                icon={AlertTriangle}
                color="red"
                onClick={() => navigate('/vehicles?status=rework')}
              />
              <StatsCard
                label="Delivered"
                value={stats?.delivered || 0}
                icon={Truck}
                color="green"
                onClick={() => navigate('/vehicles?status=delivered')}
              />
            </div>

            {/* Status breakdown + recent activity */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
              {/* Status Breakdown */}
              <div className="lg:col-span-2 card p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Status Breakdown</h3>
                <div className="space-y-3">
                  {data?.statusBreakdown?.map(item => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{item.label}</span>
                        <span className="text-xs font-bold text-gray-800">{item.value}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: stats?.total ? `${(item.value / stats.total) * 100}%` : '0%',
                            backgroundColor: item.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="lg:col-span-3 card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">Recent Activity</h3>
                  <button onClick={() => navigate('/vehicles')} className="text-xs text-brand-500 hover:underline font-medium">
                    View all
                  </button>
                </div>
                <div className="space-y-3">
                  {data?.recentActivity?.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No vehicles yet</p>
                  )}
                  {data?.recentActivity?.map(v => {
                    const sc = resolveStatus(v);
                    return (
                      <div
                        key={v.id}
                        className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                        onClick={() => navigate(`/vehicles/${v.id}`)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Car size={16} className="text-gray-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{v.vin}</p>
                            <p className="text-xs text-gray-500 truncate">{v.brand} {v.model}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          <StatusBadge label={sc.label} color={sc.color} size="sm" />
                          <span className="text-xs text-gray-400 hidden sm:block">
                            {format(new Date(v.updated_at), 'dd MMM')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Workflow Guide */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Workflow Pipeline</h3>
              <div className="flex flex-wrap gap-2 items-center">
                {[
                  { label: 'Expected',    color: 'gray',   desc: 'Awaiting arrival' },
                  { label: 'Received',    color: 'teal',   desc: 'Vehicle arrived' },
                  { label: 'Body Building', color: 'amber', desc: 'At body builder' },
                  { label: 'In Workshop', color: 'amber',  desc: 'PDI & jobs in progress' },
                  { label: 'Ready',       color: 'blue',   desc: 'All jobs complete' },
                  { label: 'Delivered',   color: 'green',  desc: 'Customer delivered' },
                ].map((step, i, arr) => (
                  <div key={step.label} className="flex items-center gap-2">
                    <div className="text-center">
                      <StatusBadge label={step.label} color={step.color} />
                      <p className="text-xs text-gray-400 mt-1 hidden md:block">{step.desc}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <span className="text-gray-300 text-lg">→</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Color legend */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-xs text-gray-500">Work In Progress (within ETA)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-xs text-gray-500">Delayed (past ETA)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-gray-500">Completed</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

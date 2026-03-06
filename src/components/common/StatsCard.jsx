import { TrendingUp } from 'lucide-react';

export default function StatsCard({ label, value, icon: Icon, trend, color = 'blue', onClick }) {
  const colors = {
    blue:   { icon: 'bg-blue-100 text-blue-600',   trend: 'text-blue-600' },
    green:  { icon: 'bg-emerald-100 text-emerald-600', trend: 'text-emerald-600' },
    amber:  { icon: 'bg-amber-100 text-amber-600',  trend: 'text-amber-600' },
    red:    { icon: 'bg-red-100 text-red-600',      trend: 'text-red-600' },
    gray:   { icon: 'bg-gray-100 text-gray-600',    trend: 'text-gray-600' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div
      className={`card p-4 md:p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
            {typeof value === 'number' ? String(value).padStart(2, '0') : value}
          </p>
          {trend !== undefined && (
            <p className={`text-xs font-medium mt-1 flex items-center gap-1 ${c.trend}`}>
              <TrendingUp size={11} />
              {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 ${c.icon}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}

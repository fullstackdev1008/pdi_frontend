const configs = {
  green:   { bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500'  },
  red:     { bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-500'      },
  amber:   { bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-500'    },
  blue:    { bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500'     },
  gray:    { bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400'     },
  teal:    { bg: 'bg-teal-50',     text: 'text-teal-700',    dot: 'bg-teal-500'     },
  orange:  { bg: 'bg-orange-50',   text: 'text-orange-700',  dot: 'bg-orange-500'   },
  purple:  { bg: 'bg-purple-50',   text: 'text-purple-700',  dot: 'bg-purple-500'   },
};

export default function StatusBadge({ label, color = 'gray', size = 'md' }) {
  const c = configs[color] || configs.gray;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${c.bg} ${c.text} ${padding}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {label}
    </span>
  );
}

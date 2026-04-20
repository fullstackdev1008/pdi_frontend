export default function LoadingSpinner({ fullscreen = false, size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };

  const spinner = (
    <div className={`${sizes[size]} border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin`} />
  );

  if (fullscreen) {
    return (
      <div className="flex items-center justify-center h-full min-h-64">
        {spinner}
      </div>
    );
  }

  return spinner;
}

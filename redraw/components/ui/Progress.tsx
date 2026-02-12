interface ProgressProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  className?: string;
}

export function Progress({ value, max = 100, label, className = '' }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between text-sm text-gray-700 mb-2">
          <span>{label}</span>
          <span className="font-semibold">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

'use client';

interface StatusSummaryBadgeProps {
  green: number;
  yellow: number;
  red: number;
}

export function StatusSummaryBadge({ green, yellow, red }: StatusSummaryBadgeProps) {
  const total = green + yellow + red;
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-1 text-xs mt-2">
      {green > 0 && (
        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {green}
        </span>
      )}
      {yellow > 0 && (
        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          {yellow}
        </span>
      )}
      {red > 0 && (
        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          {red}
        </span>
      )}
    </div>
  );
}

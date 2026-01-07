'use client';

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

export function DonutChart({ data, size = 120 }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return null;

  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let currentOffset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="transform -rotate-90">
        {data.map((item, index) => {
          const percentage = item.value / total;
          const strokeDasharray = `${circumference * percentage} ${circumference * (1 - percentage)}`;
          const strokeDashoffset = -currentOffset;
          currentOffset += circumference * percentage;

          return (
            <circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          );
        })}
        {/* Center circle for donut effect */}
        <circle
          cx={center}
          cy={center}
          r={radius - strokeWidth / 2}
          fill="var(--card-bg)"
        />
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-1">
        {data.map((item, index) => {
          const percentage = Math.round((item.value / total) * 100);
          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
              <span className="font-semibold">{percentage}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

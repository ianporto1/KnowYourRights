'use client';

import { TravelAdvisoryLevel, getTravelAdvisoryConfig } from '@/lib/travel-advisory';

interface TravelAdvisoryBadgeProps {
  level: TravelAdvisoryLevel;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
}

export function TravelAdvisoryBadge({ 
  level, 
  size = 'md',
  showDescription = false 
}: TravelAdvisoryBadgeProps) {
  const config = getTravelAdvisoryConfig(level);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  return (
    <div className={`inline-flex flex-col ${showDescription ? 'gap-1' : ''}`}>
      <span 
        className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} ${config.bgColor}`}
        style={{ color: config.color }}
      >
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
      {showDescription && (
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
          {config.description}
        </p>
      )}
    </div>
  );
}

interface TravelAdvisoryBannerProps {
  level: TravelAdvisoryLevel;
  countryName: string;
}

export function TravelAdvisoryBanner({ level, countryName }: TravelAdvisoryBannerProps) {
  const config = getTravelAdvisoryConfig(level);
  
  return (
    <div 
      className={`rounded-xl p-4 mb-6 border-l-4 ${config.bgColor}`}
      style={{ borderLeftColor: config.color }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {config.label}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {config.description}
          </p>
          {level === 'do_not_travel' && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
              ⚠️ Consulte o Ministério das Relações Exteriores antes de viajar para {countryName}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

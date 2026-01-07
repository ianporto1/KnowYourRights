'use client';

interface SkeletonCardProps {
  variant: 'country' | 'topic';
}

export function SkeletonCard({ variant }: SkeletonCardProps) {
  if (variant === 'country') {
    return (
      <div className="card country-card animate-pulse">
        {/* Flag placeholder */}
        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mb-3" />
        {/* Name placeholder */}
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2" />
        {/* Freedom index placeholder */}
        <div className="w-full">
          <div className="flex justify-between mb-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8" />
          </div>
          <div className="freedom-bar">
            <div className="h-full bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // Topic variant
  return (
    <div className="card topic-card animate-pulse bg-gray-100 dark:bg-gray-800">
      {/* Status badge placeholder */}
      <div className="topic-card-corner topic-card-corner-top">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      {/* Content placeholder */}
      <div className="pt-14 pb-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6, variant = 'country' }: { count?: number; variant?: 'country' | 'topic' }) {
  return (
    <div className="cards-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}

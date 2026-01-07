'use client';

import Link from 'next/link';

interface CountryNavigationProps {
  currentCode: string;
  countries: { code: string; name: string; flag: string }[];
}

export function CountryNavigation({ currentCode, countries }: CountryNavigationProps) {
  const currentIndex = countries.findIndex(c => c.code.toLowerCase() === currentCode.toLowerCase());
  
  if (currentIndex === -1 || countries.length <= 1) return null;

  const prevCountry = countries[(currentIndex - 1 + countries.length) % countries.length];
  const nextCountry = countries[(currentIndex + 1) % countries.length];

  return (
    <div className="country-nav flex justify-between items-center mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
      <Link
        href={`/${prevCountry.code.toLowerCase()}`}
        className="country-nav-btn flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm sm:text-base"
      >
        <span>←</span>
        <span className="text-lg sm:text-xl">{prevCountry.flag}</span>
        <span className="hidden sm:inline max-w-[100px] truncate">{prevCountry.name}</span>
      </Link>

      <span className="text-xs sm:text-sm text-gray-400">
        {currentIndex + 1} / {countries.length}
      </span>

      <Link
        href={`/${nextCountry.code.toLowerCase()}`}
        className="country-nav-btn flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm sm:text-base"
      >
        <span className="hidden sm:inline max-w-[100px] truncate">{nextCountry.name}</span>
        <span className="text-lg sm:text-xl">{nextCountry.flag}</span>
        <span>→</span>
      </Link>
    </div>
  );
}

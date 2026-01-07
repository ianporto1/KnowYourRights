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
    <div className="flex justify-between items-center mb-6">
      <Link
        href={`/${prevCountry.code.toLowerCase()}`}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <span>←</span>
        <span className="text-xl">{prevCountry.flag}</span>
        <span className="hidden sm:inline">{prevCountry.name}</span>
      </Link>

      <Link
        href={`/${nextCountry.code.toLowerCase()}`}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="hidden sm:inline">{nextCountry.name}</span>
        <span className="text-xl">{nextCountry.flag}</span>
        <span>→</span>
      </Link>
    </div>
  );
}

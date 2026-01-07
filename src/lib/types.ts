// Status types
export type Status = 'green' | 'yellow' | 'red';

export const STATUS_VALUES: Status[] = ['green', 'yellow', 'red'];

export function isValidStatus(value: string): value is Status {
  return STATUS_VALUES.includes(value as Status);
}

// Country
export interface Country {
  code: string;
  name: string;
  flag: string;
  freedomIndex: number;
  lastUpdated: string;
}

// Category
export interface Category {
  id: number;
  slug: string;
  nameKey: string;
  icon: string;
}

// Cartilha Entry
export interface CartilhaEntry {
  id: string;
  countryCode: string;
  categoryId: number;
  topic: string;
  status: Status;
  legalBasis: string;
  plainExplanation: string;
  culturalNote: string | null;
  lastUpdated: string;
}

// Validation
export function validateCartilhaEntry(data: unknown): CartilhaEntry {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid entry: must be an object');
  }

  const entry = data as Record<string, unknown>;

  if (!entry.countryCode || typeof entry.countryCode !== 'string') {
    throw new Error('Invalid entry: countryCode is required');
  }
  if (!entry.topic || typeof entry.topic !== 'string') {
    throw new Error('Invalid entry: topic is required');
  }
  if (!entry.status || !isValidStatus(entry.status as string)) {
    throw new Error('Invalid entry: status must be green, yellow, or red');
  }
  if (!entry.plainExplanation || typeof entry.plainExplanation !== 'string') {
    throw new Error('Invalid entry: plainExplanation is required');
  }

  return {
    id: (entry.id as string) || '',
    countryCode: entry.countryCode as string,
    categoryId: (entry.categoryId as number) || 0,
    topic: entry.topic as string,
    status: entry.status as Status,
    legalBasis: (entry.legalBasis as string) || '',
    plainExplanation: entry.plainExplanation as string,
    culturalNote: (entry.culturalNote as string) || null,
    lastUpdated: (entry.lastUpdated as string) || new Date().toISOString(),
  };
}

// Comparison
export interface ComparisonRequest {
  topic: string;
  countries: string[]; // max 3
}

export interface ComparisonResult {
  topic: string;
  entries: {
    country: Country;
    entry: CartilhaEntry | null;
  }[];
}

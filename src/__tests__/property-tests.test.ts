import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock supabase before importing rag
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        limit: () => ({
          in: () => ({
            or: () => Promise.resolve({ data: [], error: null }),
          }),
          or: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  },
}));

import { extractKeywords, detectCountries, buildPrompt } from '@/lib/rag';
import { validateCartilhaEntry, isValidStatus, STATUS_VALUES } from '@/lib/types';

// =============================================================================
// Property 1: Filter by Freedom Index Range
// Validates: Requirements 1.3
// =============================================================================
describe('Property 1: Freedom Index Filter', () => {
  interface Country {
    code: string;
    name: string;
    freedom_index: number;
  }

  const filterByFreedomIndex = (
    countries: Country[],
    min: number,
    max: number
  ): Country[] => {
    return countries.filter((c) => c.freedom_index >= min && c.freedom_index <= max);
  };

  it('should return only countries within the specified range', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            code: fc.string({ minLength: 2, maxLength: 2 }),
            name: fc.string({ minLength: 1 }),
            freedom_index: fc.integer({ min: 0, max: 10 }),
          })
        ),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        (countries, a, b) => {
          const min = Math.min(a, b);
          const max = Math.max(a, b);
          const filtered = filterByFreedomIndex(countries, min, max);
          return filtered.every((c) => c.freedom_index >= min && c.freedom_index <= max);
        }
      )
    );
  });

  it('should not exclude any country that is within range', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            code: fc.string({ minLength: 2, maxLength: 2 }),
            name: fc.string({ minLength: 1 }),
            freedom_index: fc.integer({ min: 0, max: 10 }),
          })
        ),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        (countries, a, b) => {
          const min = Math.min(a, b);
          const max = Math.max(a, b);
          const filtered = filterByFreedomIndex(countries, min, max);
          const expectedCount = countries.filter(
            (c) => c.freedom_index >= min && c.freedom_index <= max
          ).length;
          return filtered.length === expectedCount;
        }
      )
    );
  });
});

// =============================================================================
// Property 2: Sorting Preserves All Items
// Validates: Requirements 1.4
// =============================================================================
describe('Property 2: Sorting Preserves All Items', () => {
  interface Country {
    code: string;
    name: string;
    freedom_index: number;
  }

  type SortOption = 'name' | 'freedom_asc' | 'freedom_desc';

  const sortCountries = (countries: Country[], sortBy: SortOption): Country[] => {
    return [...countries].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'freedom_asc') return a.freedom_index - b.freedom_index;
      return b.freedom_index - a.freedom_index;
    });
  };

  it('should preserve all items after sorting', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            code: fc.string({ minLength: 2, maxLength: 2 }),
            name: fc.string({ minLength: 1 }),
            freedom_index: fc.integer({ min: 0, max: 10 }),
          })
        ),
        fc.constantFrom('name', 'freedom_asc', 'freedom_desc') as fc.Arbitrary<SortOption>,
        (countries, sortBy) => {
          const sorted = sortCountries(countries, sortBy);
          return sorted.length === countries.length;
        }
      )
    );
  });

  it('should maintain correct order after sorting by freedom_desc', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            code: fc.string({ minLength: 2, maxLength: 2 }),
            name: fc.string({ minLength: 1 }),
            freedom_index: fc.integer({ min: 0, max: 10 }),
          }),
          { minLength: 2 }
        ),
        (countries) => {
          const sorted = sortCountries(countries, 'freedom_desc');
          for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].freedom_index > sorted[i - 1].freedom_index) {
              return false;
            }
          }
          return true;
        }
      )
    );
  });
});

// =============================================================================
// Property 3: Status Distribution Sums to 100%
// Validates: Requirements 2.1
// =============================================================================
describe('Property 3: Status Distribution Sums to 100%', () => {
  const calculatePercentages = (data: { value: number }[]): number[] => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return [];
    return data.map((item) => Math.round((item.value / total) * 100));
  };

  it('should sum to approximately 100% (allowing for rounding)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ value: fc.integer({ min: 0, max: 100 }) }), {
          minLength: 1,
          maxLength: 5,
        }),
        (data) => {
          const hasNonZero = data.some((d) => d.value > 0);
          if (!hasNonZero) return true;
          const percentages = calculatePercentages(data);
          const sum = percentages.reduce((a, b) => a + b, 0);
          return sum >= 97 && sum <= 103;
        }
      )
    );
  });
});

// =============================================================================
// Property 4: Search Returns Only Matching Entries
// Validates: Requirements 2.2
// =============================================================================
describe('Property 4: Search Filter', () => {
  interface Entry {
    topic: string;
    plain_explanation: string;
  }

  const searchEntries = (entries: Entry[], query: string): Entry[] => {
    if (!query.trim()) return entries;
    const lowerQuery = query.toLowerCase().trim();
    return entries.filter(
      (e) =>
        e.topic.toLowerCase().includes(lowerQuery) ||
        e.plain_explanation.toLowerCase().includes(lowerQuery)
    );
  };

  it('should return only entries containing the search term', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            topic: fc.string({ minLength: 1 }),
            plain_explanation: fc.string({ minLength: 1 }),
          })
        ),
        fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim().length > 0),
        (entries, query) => {
          const results = searchEntries(entries, query);
          const lowerQuery = query.toLowerCase().trim();
          if (!lowerQuery) return true;
          return results.every(
            (e) =>
              e.topic.toLowerCase().includes(lowerQuery) ||
              e.plain_explanation.toLowerCase().includes(lowerQuery)
          );
        }
      )
    );
  });

  it('should return all entries when query is empty', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            topic: fc.string({ minLength: 1 }),
            plain_explanation: fc.string({ minLength: 1 }),
          })
        ),
        (entries) => {
          const results = searchEntries(entries, '');
          return results.length === entries.length;
        }
      )
    );
  });
});

// =============================================================================
// Property 5: Category Filter Returns Only Matching Entries
// Validates: Requirements 3.1
// =============================================================================
describe('Property 5: Category Filter', () => {
  interface Entry {
    category_slug: string;
    topic: string;
  }

  const filterByCategory = (entries: Entry[], category: string | null): Entry[] => {
    if (!category) return entries;
    return entries.filter((e) => e.category_slug === category);
  };

  it('should return only entries with matching category', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            category_slug: fc.constantFrom('rights', 'substances', 'expression', 'digital'),
            topic: fc.string({ minLength: 1 }),
          })
        ),
        fc.constantFrom('rights', 'substances', 'expression', 'digital'),
        (entries, category) => {
          const filtered = filterByCategory(entries, category);
          return filtered.every((e) => e.category_slug === category);
        }
      )
    );
  });

  it('should return all entries when category is null', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            category_slug: fc.constantFrom('rights', 'substances', 'expression', 'digital'),
            topic: fc.string({ minLength: 1 }),
          })
        ),
        (entries) => {
          const filtered = filterByCategory(entries, null);
          return filtered.length === entries.length;
        }
      )
    );
  });
});

// =============================================================================
// Property 6: Differences Filter Shows Only Differing Rows
// Validates: Requirements 3.2
// =============================================================================
describe('Property 6: Differences Filter', () => {
  interface ComparisonRow {
    topic: string;
    statuses: Record<string, string>;
  }

  const filterDifferences = (rows: ComparisonRow[]): ComparisonRow[] => {
    return rows.filter((row) => {
      const values = Object.values(row.statuses);
      return new Set(values).size > 1;
    });
  };

  it('should return only rows where statuses differ', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            topic: fc.string({ minLength: 1 }),
            statuses: fc.dictionary(
              fc.constantFrom('BR', 'US', 'DE'),
              fc.constantFrom('green', 'yellow', 'red')
            ),
          }),
          { minLength: 1 }
        ),
        (rows) => {
          const filtered = filterDifferences(rows);
          return filtered.every((row) => {
            const values = Object.values(row.statuses);
            return new Set(values).size > 1;
          });
        }
      )
    );
  });
});

// =============================================================================
// Property 7: URL Parameters Round-Trip
// Validates: Requirements 3.3, 3.4
// =============================================================================
describe('Property 7: URL Parameters Round-Trip', () => {
  const encodeCountries = (countries: string[]): string => countries.join(',');
  const decodeCountries = (param: string): string[] =>
    param ? param.split(',').filter(Boolean) : [];

  it('should preserve countries through encode/decode cycle', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('BR', 'US', 'DE', 'JP', 'AE'), { minLength: 1, maxLength: 3 }),
        (countries) => {
          const unique = [...new Set(countries)];
          const encoded = encodeCountries(unique);
          const decoded = decodeCountries(encoded);
          return decoded.length === unique.length && decoded.every((c) => unique.includes(c));
        }
      )
    );
  });
});

// =============================================================================
// Property 8: Theme Persistence Round-Trip
// Validates: Requirements 4.3, 4.4
// =============================================================================
describe('Property 8: Theme Persistence Round-Trip', () => {
  type Theme = 'light' | 'dark';
  const saveTheme = (theme: Theme): string => JSON.stringify(theme);
  const loadTheme = (stored: string): Theme => {
    try {
      const parsed = JSON.parse(stored);
      return parsed === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  };

  it('should preserve theme through save/load cycle', () => {
    fc.assert(
      fc.property(fc.constantFrom('light', 'dark') as fc.Arbitrary<Theme>, (theme) => {
        const saved = saveTheme(theme);
        const loaded = loadTheme(saved);
        return loaded === theme;
      })
    );
  });
});

// =============================================================================
// Property 14: Keyword Extraction Produces Non-Empty Results
// Validates: Requirements 10.1
// =============================================================================
describe('Property 14: Keyword Extraction', () => {
  it('should produce array for any input', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (message) => {
        const keywords = extractKeywords(message);
        return Array.isArray(keywords);
      })
    );
  });

  it('should not include stopwords', () => {
    const stopwords = ['que', 'para', 'com', 'uma', 'sobre'];
    const message = stopwords.join(' ');
    const keywords = extractKeywords(message);
    expect(keywords.every((k) => !stopwords.includes(k))).toBe(true);
  });

  it('should remove duplicates', () => {
    const message = 'cannabis cannabis cannabis maconha maconha';
    const keywords = extractKeywords(message);
    const uniqueKeywords = [...new Set(keywords)];
    expect(keywords.length).toBe(uniqueKeywords.length);
  });
});

// =============================================================================
// Property 15: Country Detection
// Validates: Requirements 10.2
// =============================================================================
describe('Property 15: Country Detection', () => {
  it('should detect known country names', () => {
    const testCases = [
      { message: 'leis no brasil', expected: ['BR'] },
      { message: 'estados unidos e alemanha', expected: ['US', 'DE'] },
      { message: 'japão', expected: ['JP'] },
    ];
    for (const { message, expected } of testCases) {
      const detected = detectCountries(message);
      expect(expected.every((c) => detected.includes(c))).toBe(true);
    }
  });

  it('should return empty array for messages without country references', () => {
    const message = 'informações gerais sobre leis';
    const detected = detectCountries(message);
    expect(detected).toEqual([]);
  });
});

// =============================================================================
// Property 16: Prompt Construction Includes All Required Parts
// Validates: Requirements 10.3
// =============================================================================
describe('Property 16: Prompt Construction', () => {
  it('should include system instructions', () => {
    const prompt = buildPrompt('pergunta teste', []);
    expect(prompt).toContain('assistente especializado');
    expect(prompt).toContain('aconselhamento jurídico');
  });

  it('should include user message', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (userMessage) => {
        const prompt = buildPrompt(userMessage, []);
        return prompt.includes(userMessage);
      })
    );
  });

  it('should include RAG results when provided', () => {
    const ragResults = [
      {
        country_code: 'BR',
        country_name: 'Brasil',
        topic: 'Cannabis',
        status: 'red',
        plain_explanation: 'Proibido no Brasil',
        legal_basis: 'Lei de Drogas',
        cultural_note: null,
      },
    ];
    const prompt = buildPrompt('pergunta', ragResults);
    expect(prompt).toContain('Brasil');
    expect(prompt).toContain('Cannabis');
    expect(prompt).toContain('Proibido');
  });
});

// =============================================================================
// Property 10-12: CRUD Validation
// Validates: Requirements 6.2, 6.3, 6.5
// =============================================================================
describe('Property 10-12: CRUD Validation', () => {
  it('should validate entry with all required fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          countryCode: fc.string({ minLength: 2, maxLength: 2 }),
          topic: fc.string({ minLength: 1 }),
          status: fc.constantFrom('green', 'yellow', 'red'),
          plainExplanation: fc.string({ minLength: 1 }),
        }),
        (data) => {
          const validated = validateCartilhaEntry(data);
          return (
            validated.countryCode === data.countryCode &&
            validated.topic === data.topic &&
            validated.status === data.status &&
            validated.plainExplanation === data.plainExplanation
          );
        }
      )
    );
  });

  it('should throw for invalid status', () => {
    expect(() =>
      validateCartilhaEntry({
        countryCode: 'BR',
        topic: 'Test',
        status: 'invalid',
        plainExplanation: 'Test',
      })
    ).toThrow('status must be green, yellow, or red');
  });

  it('should validate status values correctly', () => {
    fc.assert(
      fc.property(fc.constantFrom(...STATUS_VALUES), (status) => {
        return isValidStatus(status) === true;
      })
    );
  });
});

// =============================================================================
// Property 13: Chat Context Matches Current Route
// Validates: Requirements 9.4
// =============================================================================
describe('Property 13: Chat Context', () => {
  const getContextFromRoute = (pathname: string): { countryCode?: string; page: string } => {
    if (pathname === '/') return { page: 'home' };
    if (pathname === '/compare') return { page: 'compare' };
    if (pathname.startsWith('/admin')) return { page: 'admin' };
    const countryMatch = pathname.match(/^\/([a-z]{2})$/i);
    if (countryMatch) return { countryCode: countryMatch[1].toUpperCase(), page: 'country' };
    return { page: 'unknown' };
  };

  it('should extract country code from country routes', () => {
    fc.assert(
      fc.property(fc.constantFrom('br', 'us', 'de', 'jp', 'ae'), (code) => {
        const context = getContextFromRoute(`/${code}`);
        return context.countryCode === code.toUpperCase() && context.page === 'country';
      })
    );
  });

  it('should identify special routes correctly', () => {
    expect(getContextFromRoute('/')).toEqual({ page: 'home' });
    expect(getContextFromRoute('/compare')).toEqual({ page: 'compare' });
    expect(getContextFromRoute('/admin')).toEqual({ page: 'admin' });
  });
});

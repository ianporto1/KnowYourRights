# Design Document: App Improvements

## Overview

Este documento descreve a arquitetura e design técnico para as melhorias do Global Rights Guide, incluindo melhorias de UX no app público, painel administrativo e chat com RAG usando AgentRouter.

A implementação será feita em Next.js 16 com TypeScript, usando Supabase como backend e AgentRouter para integração com LLMs.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Public App    │   Admin Panel   │      Chat Widget            │
│   /             │   /admin/*      │   (Global Component)        │
│   /[code]       │                 │                             │
│   /compare      │                 │                             │
└────────┬────────┴────────┬────────┴────────────┬────────────────┘
         │                 │                      │
         ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API ROUTES (Next.js)                         │
│  /api/countries/*    /api/admin/*    /api/chat                  │
└────────┬─────────────────┬─────────────────────┬────────────────┘
         │                 │                      │
         ▼                 ▼                      ▼
┌─────────────────┐ ┌─────────────┐  ┌─────────────────────────────┐
│    Supabase     │ │  Supabase   │  │      AgentRouter            │
│   (Database)    │ │   (Auth)    │  │   (LLM Gateway)             │
└─────────────────┘ └─────────────┘  └─────────────────────────────┘
```

## Components and Interfaces

### Public App Components

```typescript
// src/components/ui/StatusSummaryBadge.tsx
interface StatusSummaryBadgeProps {
  green: number;
  yellow: number;
  red: number;
}

// src/components/ui/DonutChart.tsx
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

// src/components/ui/ThemeToggle.tsx
interface ThemeToggleProps {
  className?: string;
}

// src/components/ui/SkeletonCard.tsx
interface SkeletonCardProps {
  variant: 'country' | 'topic';
}

// src/components/ui/CountryNavigation.tsx
interface CountryNavigationProps {
  currentCode: string;
  countries: { code: string; name: string }[];
}
```

### Chat Widget Components

```typescript
// src/components/chat/ChatWidget.tsx
interface ChatWidgetProps {
  context?: {
    countryCode?: string;
    categorySlug?: string;
  };
}

// src/components/chat/ChatMessage.tsx
interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// src/components/chat/ChatSuggestions.tsx
interface ChatSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}
```

### Admin Panel Components

```typescript
// src/app/admin/components/DataTable.tsx
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

// src/app/admin/components/EntityForm.tsx
interface EntityFormProps<T> {
  entity?: T;
  fields: FieldDef[];
  onSubmit: (data: T) => Promise<void>;
  onCancel: () => void;
}
```

### API Interfaces

```typescript
// src/lib/types.ts (additions)

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatRequest {
  message: string;
  context?: {
    countryCode?: string;
    categorySlug?: string;
  };
  history?: ChatMessage[];
}

interface ChatResponse {
  message: string;
  sources?: {
    countryCode: string;
    topic: string;
    status: Status;
  }[];
}

interface RAGContext {
  entries: CartilhaEntry[];
  query: string;
  keywords: string[];
}
```

## Data Models

### Existing Tables (no changes needed)
- `countries` - code, name, flag, freedom_index, last_updated
- `categories` - id, slug, name_key, icon
- `cartilha_entries` - id, country_code, category_id, topic, status, legal_basis, plain_explanation, cultural_note, last_updated

### New Table: Admin Users (via Supabase Auth)
Supabase Auth handles user management. We'll use RLS policies to restrict admin access.

```sql
-- RLS Policy for admin access
CREATE POLICY "Admin full access" ON cartilha_entries
  FOR ALL
  USING (auth.role() = 'authenticated');
```

### Chat History (Session-based, no persistence)
Chat history is stored in React state during the session. No database table needed.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Filter by Freedom Index Range
*For any* freedom index range [min, max] and any list of countries, filtering should return only countries where min ≤ freedom_index ≤ max.
**Validates: Requirements 1.3**

### Property 2: Sorting Preserves All Items
*For any* list of countries and any sort order (name, freedom_index asc/desc), the sorted list should contain exactly the same countries as the original list, just in different order.
**Validates: Requirements 1.4**

### Property 3: Status Distribution Sums to 100%
*For any* set of cartilha entries for a country, the percentage distribution of green + yellow + red should equal 100% (within floating point tolerance).
**Validates: Requirements 2.1**

### Property 4: Search Returns Only Matching Entries
*For any* search keyword and any list of entries, all returned entries should contain the keyword in either the topic or plain_explanation field (case-insensitive).
**Validates: Requirements 2.2**

### Property 5: Category Filter Returns Only Matching Entries
*For any* category filter and any comparison data, all visible entries should belong to the selected category.
**Validates: Requirements 3.1**

### Property 6: Differences Filter Shows Only Differing Rows
*For any* comparison with the "show differences" toggle enabled, every visible row should have at least two countries with different statuses.
**Validates: Requirements 3.2**

### Property 7: URL Parameters Round-Trip
*For any* selection of countries, encoding to URL params and then decoding should produce the same selection.
**Validates: Requirements 3.3, 3.4**

### Property 8: Theme Persistence Round-Trip
*For any* theme preference (light/dark), saving to localStorage and then loading should return the same preference.
**Validates: Requirements 4.3, 4.4**

### Property 9: Unauthenticated Access Redirects
*For any* admin route and any unauthenticated request, the response should be a redirect to the login page.
**Validates: Requirements 5.2**

### Property 10: CRUD Create Returns Created Entity
*For any* valid entity data (country, category, or entry), creating it should return an entity with all the provided fields plus generated fields (id, timestamps).
**Validates: Requirements 6.2, 7.2, 8.3**

### Property 11: CRUD Update Preserves Unmodified Fields
*For any* entity update with partial data, fields not included in the update should remain unchanged.
**Validates: Requirements 6.3, 7.3, 8.4**

### Property 12: Cascade Delete Removes All Related Entries
*For any* country deletion, all cartilha_entries with that country_code should also be deleted.
**Validates: Requirements 6.5**

### Property 13: Chat Context Matches Current Route
*For any* page with a country code in the route, the chat widget context should include that country code.
**Validates: Requirements 9.4**

### Property 14: Keyword Extraction Produces Non-Empty Results
*For any* non-empty user message, keyword extraction should produce at least one keyword.
**Validates: Requirements 10.1**

### Property 15: RAG Query Returns Relevant Entries
*For any* set of keywords, the RAG query should return entries where at least one keyword appears in topic, plain_explanation, or legal_basis.
**Validates: Requirements 10.2**

### Property 16: Prompt Construction Includes All Required Parts
*For any* RAG context with entries and a user question, the constructed prompt should include: system instructions, the retrieved context data, and the user's question.
**Validates: Requirements 10.3**

## Error Handling

### API Errors
- All API routes return consistent error format: `{ error: string, code?: string }`
- HTTP status codes: 400 (bad request), 401 (unauthorized), 404 (not found), 500 (server error)

### Chat Errors
- AgentRouter timeout: Display "O serviço está demorando. Tente novamente."
- AgentRouter unavailable: Display "Chat indisponível. Explore o app manualmente."
- No RAG results: Display "Não encontrei informações específicas. Tente reformular a pergunta."

### Admin Errors
- Validation errors: Display inline field errors
- Database errors: Display toast notification with error message
- Auth errors: Redirect to login with error message in URL

## Testing Strategy

### Unit Tests
- Component rendering tests for all new UI components
- Utility function tests (keyword extraction, percentage calculation, URL encoding)
- Form validation tests

### Property-Based Tests
Using `fast-check` library for TypeScript:
- Filter and sort functions (Properties 1, 2)
- Percentage calculations (Property 3)
- Search and filter functions (Properties 4, 5, 6)
- URL encoding/decoding (Property 7)
- Theme persistence (Property 8)
- CRUD operations (Properties 10, 11, 12)
- RAG pipeline functions (Properties 14, 15, 16)

### Integration Tests
- Auth flow (login, logout, protected routes)
- CRUD operations against Supabase
- Chat flow with mocked AgentRouter

### E2E Tests (optional)
- Full user journeys using Playwright
- Admin panel workflows
- Chat conversations


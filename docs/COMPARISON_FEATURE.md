# Country Comparison Feature

## Overview

The comparison feature allows users to compare laws and regulations across 2-5 countries simultaneously. It provides a visual side-by-side comparison with statistics and filtering options.

## How It Works

### Data Flow

1. User selects 2-5 countries from the country selector
2. Frontend sends POST request to `/api/compare` with selected country codes
3. API fetches all entries for selected countries from `cartilha_entries` table
4. API filters to only include **complete topics** (topics that exist in ALL selected countries)
5. Results are grouped by category and returned with statistics

### Gap-Free Comparisons

The API ensures no empty cells appear in comparisons by:

```typescript
// Count how many countries have each topic
const topicCounts = new Map<string, number>();
entries?.forEach(e => {
  topicCounts.set(e.topic, (topicCounts.get(e.topic) || 0) + 1);
});

// Only include topics present in ALL selected countries
const completeTopics = [...topicCounts.entries()]
  .filter(([_, count]) => count >= numCountries)
  .map(([topic]) => topic);
```

### Universal Topics

20 topics are guaranteed to exist in all 200 countries:

| Category | Topic |
|----------|-------|
| Public Affection | Beijo em público, Nudez em praias |
| Freedom of Expression | Criticar o governo, Protestos públicos |
| Internet | VPN |
| Police & State | Filmar policiais |
| Drugs & Alcohol | Álcool, Maconha, Maconha recreativa, Drogas |
| LGBTQ+ Rights | Homossexualidade, Casamento homoafetivo |
| Religion | Liberdade religiosa |
| Dress Code | Vestimenta |
| Photography | Fotografar instalações militares |
| Traffic | Carteira internacional |
| Weapons | Posse de arma |
| Gambling | Cassinos |
| Work Rights | Férias remuneradas |
| Privacy | Proteção de dados pessoais |

## API Reference

### POST /api/compare

**Request Body:**
```json
{
  "countries": ["BR", "US", "DE"]
}
```

**Response:**
```json
{
  "comparisons": [
    {
      "topic": "Maconha",
      "category_id": 5,
      "hasDifferences": true,
      "entries": [
        {
          "country": { "code": "BR", "name": "Brasil", "flag": "🇧🇷" },
          "entry": {
            "topic": "Maconha",
            "status": "red",
            "plain_explanation": "...",
            "category_id": 5
          }
        }
      ]
    }
  ],
  "groupedByCategory": [
    {
      "category": { "id": 5, "name_key": "Drogas & Álcool", "icon": "🍺" },
      "comparisons": [...]
    }
  ],
  "statistics": {
    "totalTopics": 42,
    "topicsWithDifferences": 28,
    "differencePercentage": 67,
    "countryStats": [
      {
        "country": { "code": "BR", "name": "Brasil" },
        "stats": { "green": 15, "yellow": 12, "red": 15, "total": 42 }
      }
    ]
  }
}
```

## Frontend Features

### Country Selector
- Search by country name or code
- Countries grouped by region (Americas, Europe, Asia, Middle East, Africa, Oceania)
- Selected countries shown as removable chips
- Maximum 5 countries

### View Modes
1. **Grouped View**: Topics organized by category with collapsible sections
2. **Table View**: Traditional table with countries as columns

### Filters
- **Category Filter**: Show only topics from a specific category
- **Differences Only**: Show only topics where countries have different statuses
- **Share Button**: Copy URL with selected countries for sharing

### Statistics Panel
- Total topics compared
- Topics with differences
- Difference percentage
- Per-country status distribution (stacked bar chart)

## Status Legend

| Status | Icon | Color | Meaning |
|--------|------|-------|---------|
| Green | ✓ | #22c55e | Allowed/Legal |
| Yellow | ! | #f59e0b | Restrictions Apply |
| Red | ✕ | #ef4444 | Prohibited/Illegal |

## URL Structure

Comparisons can be shared via URL:
```
/compare?countries=br,us,de
```

The page reads the `countries` query parameter on load and auto-selects those countries.

## Database Schema

```sql
-- Main entries table
CREATE TABLE cartilha_entries (
  id SERIAL PRIMARY KEY,
  country_code VARCHAR(2) REFERENCES countries(code),
  category_id INTEGER REFERENCES categories(id),
  topic VARCHAR(255) NOT NULL,
  status VARCHAR(10) CHECK (status IN ('green', 'yellow', 'red')),
  plain_explanation TEXT,
  legal_basis TEXT,
  cultural_note TEXT
);

-- Index for fast comparison queries
CREATE INDEX idx_entries_country_topic ON cartilha_entries(country_code, topic);
```

## Performance Considerations

- API fetches all entries for selected countries in a single query
- Topic filtering happens in-memory for speed
- Results are cached by the browser via standard HTTP caching
- Typical response time: < 200ms for 5 countries

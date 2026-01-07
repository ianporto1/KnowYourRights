// Travel Advisory Calculator
// Calculates travel safety level based on country data

export type TravelAdvisoryLevel = 'safe' | 'caution' | 'avoid' | 'do_not_travel';

export interface TravelAdvisoryConfig {
  level: TravelAdvisoryLevel;
  label: string;
  labelEn: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
}

export const travelAdvisoryConfig: Record<TravelAdvisoryLevel, TravelAdvisoryConfig> = {
  safe: {
    level: 'safe',
    label: 'Ok para viajar',
    labelEn: 'Safe to travel',
    icon: '✅',
    color: '#22c55e',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    description: 'País com boas condições para turistas. Siga as leis locais normalmente.'
  },
  caution: {
    level: 'caution',
    label: 'Viaje com cautela',
    labelEn: 'Travel with caution',
    icon: '⚠️',
    color: '#f59e0b',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    description: 'Algumas restrições importantes. Pesquise bem antes de viajar.'
  },
  avoid: {
    level: 'avoid',
    label: 'Evite viagens não essenciais',
    labelEn: 'Avoid non-essential travel',
    icon: '🟠',
    color: '#f97316',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    description: 'Riscos significativos para turistas. Viaje apenas se necessário.'
  },
  do_not_travel: {
    level: 'do_not_travel',
    label: 'Não viaje',
    labelEn: 'Do not travel',
    icon: '🔴',
    color: '#ef4444',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    description: 'Perigo extremo. Evite completamente este destino.'
  }
};

// Critical topics that heavily impact travel safety
const criticalTopics = [
  'Homossexualidade',
  'Liberdade religiosa',
  'Criticar o governo',
  'Protestos públicos',
  'VPN',
  'Filmar policiais',
  'Vestimenta'
];

interface CountryStats {
  green: number;
  yellow: number;
  red: number;
  total: number;
}

interface EntryData {
  topic: string;
  status: 'green' | 'yellow' | 'red';
}

export function calculateTravelAdvisory(
  freedomIndex: number,
  stats: CountryStats,
  entries?: EntryData[]
): TravelAdvisoryLevel {
  const { green, yellow, red, total } = stats;
  
  if (total === 0) return 'caution';
  
  const redPercentage = red / total;
  const greenPercentage = green / total;
  
  // Check critical topics if entries provided
  let criticalRedCount = 0;
  if (entries) {
    criticalRedCount = entries.filter(
      e => criticalTopics.includes(e.topic) && e.status === 'red'
    ).length;
  }
  
  // Scoring system (0-100, higher = safer)
  let score = 0;
  
  // Freedom index contributes 40 points (0-10 scaled to 0-40)
  score += freedomIndex * 4;
  
  // Green percentage contributes 30 points
  score += greenPercentage * 30;
  
  // Red percentage subtracts up to 30 points
  score -= redPercentage * 30;
  
  // Critical red topics subtract 5 points each (max 35)
  score -= Math.min(criticalRedCount * 5, 35);
  
  // Normalize to 0-100
  score = Math.max(0, Math.min(100, score));
  
  // Determine level based on score
  if (score >= 70) return 'safe';
  if (score >= 50) return 'caution';
  if (score >= 30) return 'avoid';
  return 'do_not_travel';
}

export function getTravelAdvisoryConfig(level: TravelAdvisoryLevel): TravelAdvisoryConfig {
  return travelAdvisoryConfig[level];
}

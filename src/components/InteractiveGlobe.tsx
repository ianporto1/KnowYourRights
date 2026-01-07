'use client';

import { useState, memo, useRef, useCallback } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Sphere,
  Graticule,
  Marker,
} from 'react-simple-maps';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface Country {
  code: string;
  name: string;
  flag: string;
  freedom_index: number;
}

interface CountryStats {
  [code: string]: { green: number; yellow: number; red: number };
}

interface InteractiveGlobeProps {
  countries: Country[];
  stats: CountryStats;
  onCountryClick: (countryCode: string) => void;
}

// Cores predominantes das bandeiras
const FLAG_COLORS: Record<string, string> = {
  // Américas
  'BR': '#009c3b', 'US': '#3c3b6e', 'CA': '#ff0000', 'MX': '#006847',
  'AR': '#74acdf', 'CL': '#0039a6', 'CO': '#fcd116', 'PE': '#d91023',
  'VE': '#ffcc00', 'EC': '#ffdd00', 'BO': '#007934', 'PY': '#d52b1e',
  'UY': '#001489', 'GY': '#009e49', 'SR': '#377e3f', 'CU': '#002a8f',
  'JM': '#009b3a', 'HT': '#00209f', 'DO': '#002d62', 'PR': '#0050f0',
  'PA': '#005293', 'CR': '#002b7f', 'NI': '#000067', 'HN': '#0073cf',
  'SV': '#0f47af', 'GT': '#4997d0', 'BZ': '#003f87',
  
  // Europa
  'DE': '#000000', 'GB': '#012169', 'FR': '#0055a4', 'IT': '#009246',
  'ES': '#c60b1e', 'PT': '#006600', 'NL': '#ae1c28', 'BE': '#fdda24',
  'CH': '#ff0000', 'AT': '#ed2939', 'PL': '#dc143c', 'CZ': '#11457e',
  'SE': '#006aa7', 'NO': '#ef2b2d', 'DK': '#c8102e', 'FI': '#003580',
  'IE': '#169b62', 'IS': '#003897', 'GR': '#0d5eaf', 'TR': '#e30a17',
  'UA': '#005bbb', 'RO': '#002b7f', 'HU': '#436f4d', 'BG': '#00966e',
  'RS': '#c6363c', 'HR': '#ff0000', 'SK': '#0b4ea2', 'SI': '#005da4',
  'BA': '#002395', 'AL': '#e41e20', 'MK': '#d20000', 'ME': '#c40308',
  'XK': '#244aa5', 'EE': '#0072ce', 'LV': '#9e3039', 'LT': '#006a44',
  'BY': '#c8313e', 'MD': '#003da5', 'LU': '#00a1de', 'MT': '#cf142b',
  'CY': '#d57800', 'RU': '#0039a6',
  
  // Ásia
  'JP': '#bc002d', 'CN': '#de2910', 'IN': '#ff9933', 'KR': '#003478',
  'TH': '#a51931', 'VN': '#da251d', 'MY': '#010066', 'ID': '#ff0000',
  'PH': '#0038a8', 'SG': '#ed2939', 'MM': '#fecb00', 'KH': '#032ea1',
  'LA': '#ce1126', 'BD': '#006a4e', 'NP': '#dc143c', 'LK': '#8d153a',
  'PK': '#01411c', 'AF': '#000000', 'IR': '#239f40', 'IQ': '#ce1126',
  'SA': '#006c35', 'AE': '#00732f', 'IL': '#0038b8', 'JO': '#007a3d',
  'LB': '#ed1c24', 'SY': '#ce1126', 'YE': '#ce1126', 'OM': '#db161b',
  'KW': '#007a3d', 'QA': '#8d1b3d', 'BH': '#ce1126', 'KZ': '#00afca',
  'UZ': '#1eb53a', 'TM': '#28ae66', 'KG': '#e8112d', 'TJ': '#006600',
  'MN': '#c4272f', 'KP': '#024fa2', 'TW': '#fe0000', 'HK': '#de2910',
  'GE': '#ff0000', 'AM': '#d90012', 'AZ': '#00b5e2',
  
  // África
  'ZA': '#007a4d', 'EG': '#ce1126', 'NG': '#008751', 'KE': '#006600',
  'MA': '#c1272d', 'DZ': '#006233', 'TN': '#e70013', 'LY': '#000000',
  'SD': '#007229', 'SS': '#078930', 'ET': '#009739', 'ER': '#4189dd',
  'DJ': '#6ab2e7', 'SO': '#4189dd', 'TZ': '#1eb53a', 'UG': '#fcdc04',
  'RW': '#00a1de', 'BI': '#ce1126', 'CD': '#007fff', 'CG': '#009543',
  'GA': '#009e60', 'GQ': '#3e9a00', 'CM': '#007a5e', 'CF': '#003082',
  'TD': '#002664', 'NE': '#e05206', 'ML': '#14b53a', 'MR': '#006233',
  'SN': '#00853f', 'GM': '#ce1126', 'GW': '#ce1126', 'GN': '#ce1126',
  'SL': '#1eb53a', 'LR': '#002868', 'CI': '#f77f00', 'BF': '#009e49',
  'GH': '#006b3f', 'TG': '#006a4e', 'BJ': '#e8112d', 'AO': '#cc092f',
  'ZM': '#198a00', 'ZW': '#006400', 'MW': '#ce1126', 'MZ': '#007168',
  'BW': '#75aadb', 'NA': '#003580', 'SZ': '#3e5eb9', 'LS': '#00209f',
  'MG': '#fc3d32',
  
  // Oceania
  'AU': '#00008b', 'NZ': '#00247d', 'PG': '#ce1126', 'FJ': '#68bfe5',
};

// Coordenadas centrais dos países para labels
const COUNTRY_CENTERS: Record<string, [number, number]> = {
  // Américas
  'BR': [-51.9, -14.2], 'US': [-95.7, 39.0], 'CA': [-106.3, 56.1], 'MX': [-102.6, 23.6],
  'AR': [-63.6, -38.4], 'CL': [-71.5, -35.7], 'CO': [-74.3, 4.6], 'PE': [-75.0, -9.2],
  'VE': [-66.6, 6.4], 'EC': [-78.2, -1.8], 'BO': [-65.0, -16.3], 'PY': [-58.4, -23.4],
  'UY': [-55.8, -32.5], 'GY': [-58.9, 4.9], 'SR': [-56.0, 4.0], 'CU': [-77.8, 21.5],
  'JM': [-77.3, 18.1], 'HT': [-72.3, 19.0], 'DO': [-70.2, 18.7], 'PR': [-66.6, 18.2],
  'PA': [-80.8, 8.5], 'CR': [-84.0, 9.7], 'NI': [-85.2, 12.9], 'HN': [-86.2, 15.2],
  'SV': [-88.9, 13.8], 'GT': [-90.2, 15.8], 'BZ': [-88.5, 17.2],
  
  // Europa
  'DE': [10.4, 51.2], 'GB': [-3.4, 54.4], 'FR': [2.2, 46.2], 'IT': [12.6, 42.5],
  'ES': [-3.7, 40.5], 'PT': [-8.2, 39.4], 'NL': [5.3, 52.1], 'BE': [4.5, 50.5],
  'CH': [8.2, 46.8], 'AT': [14.6, 47.5], 'PL': [19.1, 52.0], 'CZ': [15.5, 49.8],
  'SE': [18.6, 62.0], 'NO': [8.5, 62.0], 'DK': [9.5, 56.3], 'FI': [25.7, 64.0],
  'IE': [-8.2, 53.4], 'IS': [-19.0, 65.0], 'GR': [21.8, 39.1], 'TR': [35.2, 38.9],
  'UA': [31.2, 48.4], 'RO': [25.0, 46.0], 'HU': [19.5, 47.2], 'BG': [25.5, 42.7],
  'RS': [21.0, 44.0], 'HR': [15.2, 45.1], 'SK': [19.7, 48.7], 'SI': [14.6, 46.2],
  'BA': [17.7, 43.9], 'AL': [20.2, 41.2], 'MK': [21.7, 41.5], 'ME': [19.4, 42.7],
  'XK': [20.9, 42.6], 'EE': [25.0, 58.6], 'LV': [24.6, 56.9], 'LT': [23.9, 55.2],
  'BY': [27.9, 53.7], 'MD': [28.4, 47.4], 'LU': [6.1, 49.8], 'MT': [14.4, 35.9],
  'CY': [33.4, 35.1],
  
  // Ásia
  'JP': [138.3, 36.2], 'CN': [104.2, 35.9], 'IN': [78.9, 20.6], 'KR': [127.8, 36.0],
  'TH': [100.9, 15.9], 'VN': [108.3, 14.1], 'MY': [101.9, 4.2], 'ID': [113.9, -0.8],
  'PH': [121.8, 12.9], 'SG': [103.8, 1.4], 'MM': [96.0, 21.9], 'KH': [105.0, 12.6],
  'LA': [102.5, 19.9], 'BD': [90.4, 23.7], 'NP': [84.1, 28.4], 'LK': [80.8, 7.9],
  'PK': [69.3, 30.4], 'AF': [67.7, 33.9], 'IR': [53.7, 32.4], 'IQ': [43.7, 33.2],
  'SA': [45.1, 23.9], 'AE': [53.8, 23.4], 'IL': [34.9, 31.0], 'JO': [36.2, 31.2],
  'LB': [35.9, 33.9], 'SY': [38.0, 35.0], 'YE': [48.5, 15.6], 'OM': [55.9, 21.5],
  'KW': [47.5, 29.3], 'QA': [51.2, 25.4], 'BH': [50.6, 26.0], 'KZ': [66.9, 48.0],
  'UZ': [64.6, 41.4], 'TM': [59.6, 38.9], 'KG': [74.8, 41.2], 'TJ': [71.3, 38.9],
  'MN': [103.8, 46.9], 'KP': [127.5, 40.3], 'TW': [121.0, 23.7], 'HK': [114.2, 22.3],
  'RU': [105.3, 61.5], 'GE': [43.4, 42.3], 'AM': [45.0, 40.1], 'AZ': [47.6, 40.1],
  
  // África
  'ZA': [22.9, -30.6], 'EG': [30.8, 26.8], 'NG': [8.7, 9.1], 'KE': [37.9, -0.0],
  'MA': [-7.1, 31.8], 'DZ': [1.7, 28.0], 'TN': [9.5, 33.9], 'LY': [17.2, 26.3],
  'SD': [30.2, 12.9], 'SS': [31.3, 6.9], 'ET': [40.5, 9.1], 'ER': [39.8, 15.2],
  'DJ': [42.6, 11.8], 'SO': [46.2, 5.2], 'TZ': [34.9, -6.4], 'UG': [32.3, 1.4],
  'RW': [29.9, -1.9], 'BI': [29.9, -3.4], 'CD': [21.8, -4.0], 'CG': [15.8, -0.2],
  'GA': [11.6, -0.8], 'GQ': [10.3, 1.7], 'CM': [12.4, 7.4], 'CF': [20.9, 6.6],
  'TD': [18.7, 15.5], 'NE': [8.1, 17.6], 'ML': [-4.0, 17.6], 'MR': [-10.9, 21.0],
  'SN': [-14.5, 14.5], 'GM': [-15.3, 13.4], 'GW': [-15.2, 12.0], 'GN': [-9.7, 9.9],
  'SL': [-11.8, 8.5], 'LR': [-9.4, 6.4], 'CI': [-5.5, 7.5], 'BF': [-1.6, 12.2],
  'GH': [-1.0, 7.9], 'TG': [0.8, 8.6], 'BJ': [2.3, 9.3], 'AO': [17.9, -11.2],
  'ZM': [27.8, -13.1], 'ZW': [29.2, -19.0], 'MW': [34.3, -13.3], 'MZ': [35.5, -18.7],
  'BW': [24.7, -22.3], 'NA': [18.5, -22.6], 'SZ': [31.5, -26.5], 'LS': [28.2, -29.6],
  'MG': [46.9, -18.8],
  
  // Oceania
  'AU': [133.8, -25.3], 'NZ': [174.9, -41.0], 'PG': [143.9, -6.3], 'FJ': [178.0, -17.7],
};

// Mapeamento de nomes para códigos ISO
const NAME_TO_ISO: Record<string, string> = {
  'Brazil': 'BR', 'United States of America': 'US', 'Germany': 'DE', 'Japan': 'JP',
  'United Arab Emirates': 'AE', 'United Kingdom': 'GB', 'France': 'FR', 'Italy': 'IT',
  'Spain': 'ES', 'Portugal': 'PT', 'Netherlands': 'NL', 'Belgium': 'BE', 'Switzerland': 'CH',
  'Austria': 'AT', 'Poland': 'PL', 'Czechia': 'CZ', 'Sweden': 'SE', 'Norway': 'NO',
  'Denmark': 'DK', 'Finland': 'FI', 'Russia': 'RU', 'China': 'CN', 'India': 'IN',
  'Australia': 'AU', 'New Zealand': 'NZ', 'Canada': 'CA', 'Mexico': 'MX', 'Argentina': 'AR',
  'Chile': 'CL', 'Colombia': 'CO', 'Peru': 'PE', 'South Africa': 'ZA', 'Egypt': 'EG',
  'Nigeria': 'NG', 'Kenya': 'KE', 'Morocco': 'MA', 'Saudi Arabia': 'SA', 'Israel': 'IL',
  'Turkey': 'TR', 'Greece': 'GR', 'Thailand': 'TH', 'Vietnam': 'VN', 'Singapore': 'SG',
  'Malaysia': 'MY', 'Indonesia': 'ID', 'Philippines': 'PH', 'South Korea': 'KR',
  'Taiwan': 'TW', 'Ireland': 'IE', 'Iceland': 'IS', 'Luxembourg': 'LU', 'Croatia': 'HR',
  'Hungary': 'HU', 'Romania': 'RO', 'Bulgaria': 'BG', 'Ukraine': 'UA', 'Serbia': 'RS',
  'Slovakia': 'SK', 'Slovenia': 'SI', 'Estonia': 'EE', 'Latvia': 'LV', 'Lithuania': 'LT',
  'Cyprus': 'CY', 'Malta': 'MT', 'Venezuela': 'VE', 'Ecuador': 'EC', 'Bolivia': 'BO',
  'Paraguay': 'PY', 'Uruguay': 'UY', 'Cuba': 'CU', 'Jamaica': 'JM', 'Panama': 'PA',
  'Costa Rica': 'CR', 'Guatemala': 'GT', 'Honduras': 'HN', 'El Salvador': 'SV',
  'Nicaragua': 'NI', 'Dominican Rep.': 'DO', 'Haiti': 'HT', 'Puerto Rico': 'PR',
  'Algeria': 'DZ', 'Tunisia': 'TN', 'Libya': 'LY', 'Sudan': 'SD', 'Ethiopia': 'ET',
  'Tanzania': 'TZ', 'Uganda': 'UG', 'Ghana': 'GH', 'Cameroon': 'CM', 'Senegal': 'SN',
  'Ivory Coast': 'CI', 'Angola': 'AO', 'Mozambique': 'MZ', 'Zimbabwe': 'ZW', 'Zambia': 'ZM',
  'Botswana': 'BW', 'Namibia': 'NA', 'Iran': 'IR', 'Iraq': 'IQ', 'Syria': 'SY',
  'Jordan': 'JO', 'Lebanon': 'LB', 'Kuwait': 'KW', 'Qatar': 'QA', 'Bahrain': 'BH',
  'Oman': 'OM', 'Yemen': 'YE', 'Afghanistan': 'AF', 'Pakistan': 'PK', 'Bangladesh': 'BD',
  'Sri Lanka': 'LK', 'Nepal': 'NP', 'Myanmar': 'MM', 'Cambodia': 'KH', 'Laos': 'LA',
  'Mongolia': 'MN', 'North Korea': 'KP', 'Papua New Guinea': 'PG', 'Fiji': 'FJ',
  "Côte d'Ivoire": 'CI', 'Dem. Rep. Congo': 'CD', 'Central African Rep.': 'CF',
  'S. Sudan': 'SS', 'Eq. Guinea': 'GQ', 'W. Sahara': 'EH', 'Somaliland': 'SO',
  'Somalia': 'SO', 'Eritrea': 'ER', 'Djibouti': 'DJ', 'Gabon': 'GA', 'Congo': 'CG',
  'eSwatini': 'SZ', 'Lesotho': 'LS', 'Malawi': 'MW', 'Rwanda': 'RW', 'Burundi': 'BI',
  'Benin': 'BJ', 'Togo': 'TG', 'Burkina Faso': 'BF', 'Mali': 'ML', 'Mauritania': 'MR',
  'Niger': 'NE', 'Chad': 'TD', 'Gambia': 'GM', 'Guinea-Bissau': 'GW', 'Guinea': 'GN',
  'Sierra Leone': 'SL', 'Liberia': 'LR', 'Madagascar': 'MG', 'Comoros': 'KM',
  'Mauritius': 'MU', 'Seychelles': 'SC', 'Cape Verde': 'CV', 'São Tomé and Príncipe': 'ST',
};

function InteractiveGlobe({ 
  countries, 
  stats, 
  onCountryClick
}: InteractiveGlobeProps) {
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [zoom, setZoom] = useState(1);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const dragStarted = useRef(false);
  const lastPinchDistance = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const baseScale = 210;
  const currentScale = baseScale * zoom;

  const getCountryCode = useCallback((name: string) => {
    return NAME_TO_ISO[name] || null;
  }, []);

  const getCountryData = useCallback((name: string) => {
    const code = getCountryCode(name);
    if (!code) return null;
    return countries.find(c => c.code.toUpperCase() === code);
  }, [countries, getCountryCode]);

  const getCountryColor = useCallback((name: string) => {
    const code = getCountryCode(name);
    if (!code) return '#e2e8f0'; // Cinza claro para países sem dados
    
    // Retorna a cor da bandeira
    return FLAG_COLORS[code] || '#94a3b8';
  }, [getCountryCode]);

  const handleCountryClick = useCallback((name: string) => {
    if (dragStarted.current) return;
    const code = getCountryCode(name);
    if (code) {
      const country = countries.find(c => c.code === code);
      if (country) {
        onCountryClick(code.toLowerCase());
      }
    }
  }, [getCountryCode, countries, onCountryClick]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStarted.current = false;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      dragStarted.current = true;
      setRotation(prev => [
        prev[0] - dx * 0.3,
        Math.max(-60, Math.min(60, prev[1] + dy * 0.3)),
        prev[2]
      ]);
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    setTimeout(() => { dragStarted.current = false; }, 50);
  }, []);

  // Zoom com scroll do mouse
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(4, prev + delta)));
  }, []);

  // Touch events para mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - drag
      isDragging.current = true;
      dragStarted.current = false;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      // Pinch to zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Previne scroll da página
    
    if (e.touches.length === 1 && isDragging.current) {
      // Single touch - drag rotation
      const dx = e.touches[0].clientX - lastPos.current.x;
      const dy = e.touches[0].clientY - lastPos.current.y;
      
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        dragStarted.current = true;
        setRotation(prev => [
          prev[0] - dx * 0.5, // Sensibilidade maior para touch
          Math.max(-60, Math.min(60, prev[1] + dy * 0.5)),
          prev[2]
        ]);
        lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    } else if (e.touches.length === 2 && lastPinchDistance.current !== null) {
      // Pinch to zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const delta = (distance - lastPinchDistance.current) * 0.01;
      setZoom(prev => Math.max(0.5, Math.min(4, prev + delta)));
      
      lastPinchDistance.current = distance;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    lastPinchDistance.current = null;
    setTimeout(() => { dragStarted.current = false; }, 50);
  }, []);

  const hoveredData = hoveredCountry ? getCountryData(hoveredCountry) : null;
  const hoveredStats = hoveredData ? (stats[hoveredData.code] || { green: 0, yellow: 0, red: 0 }) : null;

  // Função para verificar se um ponto está visível no globo
  const isVisible = useCallback((coords: [number, number]) => {
    // Calcula a distância angular entre o centro e o ponto
    const lambda1 = (coords[0] * Math.PI) / 180;
    const phi1 = (coords[1] * Math.PI) / 180;
    const lambda2 = ((rotation[0] * -1) * Math.PI) / 180;
    const phi2 = ((rotation[1] * -1) * Math.PI) / 180;
    
    const cosAngle = Math.sin(phi1) * Math.sin(phi2) + 
                     Math.cos(phi1) * Math.cos(phi2) * Math.cos(lambda1 - lambda2);
    
    return cosAngle > 0; // Visível se o ângulo é menor que 90 graus
  }, [rotation]);

  return (
    <div className="globe-container relative flex flex-col items-center">
      <div 
        ref={containerRef}
        className="rounded-full overflow-hidden bg-blue-950 shadow-2xl select-none touch-none"
        style={{ 
          width: 'min(450px, 90vw)', 
          height: 'min(450px, 90vw)',
          cursor: isDragging.current ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <ComposableMap
          projection="geoOrthographic"
          projectionConfig={{
            scale: currentScale,
            rotate: rotation,
          }}
          width={450}
          height={450}
          style={{ width: '100%', height: '100%' }}
        >
          <Sphere id="sphere" fill="#1e3a5f" stroke="#3b82f6" strokeWidth={1.5} />
          <Graticule stroke="#3b82f650" strokeWidth={0.4} />
          
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = geo.properties.name;
                const country = getCountryData(name);
                const isHovered = hoveredCountry === name;
                const hasData = !!country;
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getCountryColor(name)}
                    stroke={isHovered ? '#fff' : '#ffffff60'}
                    strokeWidth={isHovered ? 1.5 : 0.3}
                    style={{
                      default: { 
                        outline: 'none', 
                        transition: 'fill 0.1s',
                        opacity: hasData ? 1 : 0.5,
                      },
                      hover: { 
                        outline: 'none', 
                        cursor: hasData ? 'pointer' : 'grab',
                        opacity: 1,
                        filter: 'brightness(1.2)',
                      },
                      pressed: { outline: 'none' },
                    }}
                    onClick={() => handleCountryClick(name)}
                    onMouseEnter={() => setHoveredCountry(name)}
                    onMouseLeave={() => setHoveredCountry(null)}
                  />
                );
              })
            }
          </Geographies>

          {/* Labels dos países com mini bandeiras */}
          {countries.map((country) => {
            const coords = COUNTRY_CENTERS[country.code];
            if (!coords) return null;
            
            // Não renderiza se está no lado oculto do globo
            if (!isVisible(coords)) return null;
            
            return (
              <Marker 
                key={country.code} 
                coordinates={coords}
                onClick={() => onCountryClick(country.code.toLowerCase())}
              >
                <g style={{ cursor: 'pointer' }} transform="translate(-8, -6)">
                  {/* Mini bandeira */}
                  <image
                    href={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                    x="0"
                    y="0"
                    width="16"
                    height="11"
                    style={{ 
                      filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))',
                    }}
                  />
                  {/* Nome do país */}
                  <text
                    x="8"
                    y="17"
                    textAnchor="middle"
                    style={{
                      fontFamily: 'system-ui',
                      fontSize: 4,
                      fontWeight: 700,
                      fill: '#fff',
                      stroke: '#000',
                      strokeWidth: 0.3,
                      paintOrder: 'stroke',
                      pointerEvents: 'none',
                    }}
                  >
                    {country.code}
                  </text>
                </g>
              </Marker>
            );
          })}
        </ComposableMap>
      </div>

      {/* Info do país hover */}
      {hoveredData && (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-[250px] animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <img
              src={`https://flagcdn.com/w40/${hoveredData.code.toLowerCase()}.png`}
              alt=""
              className="w-10 h-7 object-cover rounded shadow"
            />
            <div>
              <span className="font-bold text-gray-900 dark:text-white text-lg">
                {hoveredData.name}
              </span>
              <div 
                className="text-sm font-medium"
                style={{ 
                  color: hoveredData.freedom_index >= 7 ? '#22c55e' : 
                         hoveredData.freedom_index >= 5 ? '#f59e0b' : '#ef4444' 
                }}
              >
                Índice de Liberdade: {hoveredData.freedom_index}/10
              </div>
            </div>
          </div>
          {hoveredStats && (
            <div className="flex gap-2 mt-2">
              {hoveredStats.green > 0 && (
                <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-medium">
                  ✓ {hoveredStats.green} permitidos
                </span>
              )}
              {hoveredStats.yellow > 0 && (
                <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 text-xs font-medium">
                  ⚠ {hoveredStats.yellow} restrições
                </span>
              )}
              {hoveredStats.red > 0 && (
                <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs font-medium">
                  ✗ {hoveredStats.red} proibidos
                </span>
              )}
            </div>
          )}
          <p className="text-xs text-indigo-500 mt-2 text-center">Clique para ver todas as leis</p>
        </div>
      )}

      {/* Placeholder quando não hover */}
      {!hoveredData && (
        <div className="mt-4 text-center text-gray-500 dark:text-gray-400 text-sm h-[100px] flex items-center px-4">
          <p className="hidden md:block">🖱️ Arraste para girar • Scroll para zoom • Clique em um país</p>
          <p className="md:hidden">👆 Arraste para girar • Pinça para zoom • Toque em um país</p>
        </div>
      )}

      {/* Botões de controle */}
      <div className="flex gap-2 mt-2 flex-wrap justify-center px-4">
        <button
          onClick={() => setRotation(prev => [prev[0] + 40, prev[1], prev[2]])}
          className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
          aria-label="Girar para oeste"
        >
          ← <span className="hidden sm:inline">Oeste</span>
        </button>
        <button
          onClick={() => setRotation(prev => [prev[0] - 40, prev[1], prev[2]])}
          className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
          aria-label="Girar para leste"
        >
          <span className="hidden sm:inline">Leste</span> →
        </button>
        <button
          onClick={() => setRotation(prev => [prev[0], Math.max(-60, prev[1] - 20), prev[2]])}
          className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
          aria-label="Girar para cima"
        >
          ↑
        </button>
        <button
          onClick={() => setRotation(prev => [prev[0], Math.min(60, prev[1] + 20), prev[2]])}
          className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
          aria-label="Girar para baixo"
        >
          ↓
        </button>
        <button
          onClick={() => setZoom(prev => Math.min(4, prev + 0.3))}
          className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
          aria-label="Aumentar zoom"
        >
          🔍+
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(0.5, prev - 0.3))}
          className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
          aria-label="Diminuir zoom"
        >
          🔍−
        </button>
        <button
          onClick={() => { setRotation([0, 0, 0]); setZoom(1); }}
          className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
          aria-label="Resetar visualização"
        >
          ↺
        </button>
      </div>
      
      {/* Indicador de zoom */}
      <div className="text-xs text-gray-400 mt-1">
        Zoom: {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

export default memo(InteractiveGlobe);

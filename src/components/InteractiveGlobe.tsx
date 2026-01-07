'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Globe from 'react-globe.gl';

interface Country {
  code: string;
  name: string;
  flag: string;
  freedom_index: number;
}

interface CountryStats {
  [code: string]: { green: number; yellow: number; red: number };
}

interface GeoFeature {
  properties: {
    ISO_A2: string;
    ADMIN: string;
  };
  geometry: object;
}

interface InteractiveGlobeProps {
  countries: Country[];
  stats: CountryStats;
  onCountryClick: (countryCode: string) => void;
  freedomRange: [number, number];
}

export default function InteractiveGlobe({ 
  countries, 
  stats, 
  onCountryClick,
  freedomRange 
}: InteractiveGlobeProps) {
  const globeRef = useRef<any>(null);
  const [geoData, setGeoData] = useState<{ features: GeoFeature[] } | null>(null);
  const [hoverCountry, setHoverCountry] = useState<GeoFeature | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 });

  // Carregar dados geográficos
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error('Failed to load geo data:', err));
  }, []);

  // Ajustar dimensões responsivamente
  useEffect(() => {
    const updateDimensions = () => {
      const width = Math.min(window.innerWidth - 48, 800);
      const height = Math.min(width * 0.8, 600);
      setDimensions({ width, height });
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Auto-rotação inicial
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
      
      const stopRotation = () => {
        if (globeRef.current) {
          globeRef.current.controls().autoRotate = false;
        }
      };
      
      globeRef.current.controls().addEventListener('start', stopRotation);
    }
  }, [geoData]);

  const getCountryData = useCallback((isoCode: string) => {
    return countries.find(c => c.code.toUpperCase() === isoCode?.toUpperCase());
  }, [countries]);

  const getCountryColor = useCallback((feature: GeoFeature) => {
    const isoCode = feature.properties.ISO_A2;
    const country = getCountryData(isoCode);
    
    if (!country) return 'rgba(100, 100, 100, 0.3)';
    
    if (country.freedom_index < freedomRange[0] || country.freedom_index > freedomRange[1]) {
      return 'rgba(100, 100, 100, 0.2)';
    }
    
    const fi = country.freedom_index;
    if (fi >= 7) return 'rgba(34, 197, 94, 0.7)';
    if (fi >= 5) return 'rgba(245, 158, 11, 0.7)';
    return 'rgba(239, 68, 68, 0.7)';
  }, [getCountryData, freedomRange]);

  const getHoverColor = useCallback((feature: GeoFeature) => {
    const isoCode = feature.properties.ISO_A2;
    const country = getCountryData(isoCode);
    
    if (!country) return 'rgba(150, 150, 150, 0.5)';
    
    const fi = country.freedom_index;
    if (fi >= 7) return 'rgba(34, 197, 94, 1)';
    if (fi >= 5) return 'rgba(245, 158, 11, 1)';
    return 'rgba(239, 68, 68, 1)';
  }, [getCountryData]);

  const handleCountryClick = useCallback((feature: GeoFeature) => {
    const isoCode = feature.properties.ISO_A2;
    const country = getCountryData(isoCode);
    
    if (country) {
      onCountryClick(country.code.toLowerCase());
    }
  }, [getCountryData, onCountryClick]);

  const getLabel = useCallback((feature: GeoFeature) => {
    const isoCode = feature.properties.ISO_A2;
    const country = getCountryData(isoCode);
    
    if (!country) {
      return `<div class="globe-tooltip globe-tooltip-disabled">
        <span class="globe-tooltip-name">${feature.properties.ADMIN}</span>
        <span class="globe-tooltip-unavailable">Dados não disponíveis</span>
      </div>`;
    }
    
    const countryStats = stats[country.code] || { green: 0, yellow: 0, red: 0 };
    
    return `<div class="globe-tooltip">
      <div class="globe-tooltip-header">
        <img src="https://flagcdn.com/w40/${country.code.toLowerCase()}.png" alt="" class="globe-tooltip-flag" />
        <span class="globe-tooltip-name">${country.name}</span>
      </div>
      <div class="globe-tooltip-stats">
        <span class="globe-tooltip-freedom" style="color: ${country.freedom_index >= 7 ? '#22c55e' : country.freedom_index >= 5 ? '#f59e0b' : '#ef4444'}">
          Índice: ${country.freedom_index}/10
        </span>
        <div class="globe-tooltip-badges">
          ${countryStats.green > 0 ? `<span class="badge badge-green">${countryStats.green} ✓</span>` : ''}
          ${countryStats.yellow > 0 ? `<span class="badge badge-yellow">${countryStats.yellow} ⚠</span>` : ''}
          ${countryStats.red > 0 ? `<span class="badge badge-red">${countryStats.red} ✗</span>` : ''}
        </div>
      </div>
      <span class="globe-tooltip-hint">Clique para ver leis</span>
    </div>`;
  }, [getCountryData, stats]);

  if (!geoData) {
    return (
      <div className="flex items-center justify-center" style={{ height: dimensions.height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Carregando globo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="globe-container">
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        polygonsData={geoData.features}
        polygonAltitude={(d: object) => hoverCountry === d ? 0.06 : 0.01}
        polygonCapColor={(d: object) => hoverCountry === d ? getHoverColor(d as GeoFeature) : getCountryColor(d as GeoFeature)}
        polygonSideColor={() => 'rgba(100, 100, 100, 0.15)'}
        polygonStrokeColor={() => 'rgba(200, 200, 200, 0.5)'}
        polygonLabel={(d: object) => getLabel(d as GeoFeature)}
        onPolygonClick={(d: object) => handleCountryClick(d as GeoFeature)}
        onPolygonHover={(d: object | null) => setHoverCountry(d as GeoFeature | null)}
        polygonsTransitionDuration={300}
        atmosphereColor="lightskyblue"
        atmosphereAltitude={0.15}
      />
      
      <div className="globe-instructions">
        <p>🖱️ Arraste para girar • Scroll para zoom • Clique em um país</p>
      </div>
    </div>
  );
}

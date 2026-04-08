'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCompassStore } from '@/lib/store';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';

// Available countries with deep data
const AVAILABLE_COUNTRIES: Record<string, { name: string; route: string; center: [number, number] }> = {
  CAN: { name: 'Canada', route: '/explore/canada', center: [-96, 56] },
};

// Country accent colors for available countries
const COUNTRY_COLORS: Record<string, string> = {
  CAN: '#a600ff',
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type WorldFeature = any;

export default function WorldMap() {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const { hoveredCountry, setHoveredCountry } = useCompassStore();
  const [features, setFeatures] = useState<any[]>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; available: boolean } | null>(null);
  const [isZooming, setIsZooming] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 });

  // Load world topology data
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then((r) => r.json())
      .then((topo: Topology<{ countries: GeometryCollection }>) => {
        const countries = feature(topo, topo.objects.countries);
        setFeatures(countries.features as unknown as WorldFeature[]);
      })
      .catch(console.error);
  }, []);

  // Responsive sizing
  useEffect(() => {
    const updateSize = () => {
      if (svgRef.current?.parentElement) {
        const rect = svgRef.current.parentElement.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // D3 projection
  const projection = geoNaturalEarth1()
    .fitSize([dimensions.width, dimensions.height], {
      type: 'FeatureCollection',
      features: features,
    })
    .translate([dimensions.width / 2, dimensions.height / 2]);

  const pathGenerator = geoPath(projection);

  // Country name mapping (world-atlas uses numeric IDs, not ISO codes)
  const getCountryCode = useCallback((feature: WorldFeature): string => {
    return feature.properties?.iso_a3 || '';
  }, []);

  const handleCountryClick = (feature: WorldFeature) => {
    const code = getCountryCode(feature);
    const country = AVAILABLE_COUNTRIES[code];
    if (country) {
      setIsZooming(true);
      setTimeout(() => {
        router.push(country.route);
      }, 600);
    }
  };

  const handleMouseMove = (
    e: React.MouseEvent<SVGPathElement>,
    feature: WorldFeature
  ) => {
    const code = getCountryCode(feature);
    const name = feature.properties?.name || 'Unknown';
    const available = !!AVAILABLE_COUNTRIES[code];
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      name,
      available,
    });
    setHoveredCountry(code);
  };

  const handleMouseLeave = () => {
    setTooltip(null);
    setHoveredCountry(null);
  };

  return (
    <div className="relative w-full h-full">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[800px] h-[800px] rounded-full animate-pulse-glow"
          style={{
            background: 'radial-gradient(circle, rgba(131,0,202,0.08) 0%, transparent 60%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      {/* SVG Map */}
      <motion.svg
        ref={svgRef}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: isZooming ? 0 : 1, scale: isZooming ? 1.5 : 1 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Graticule grid */}
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(131,0,202,0.06)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="countryGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background glow */}
        <rect width="100%" height="100%" fill="url(#mapGlow)" />

        {/* Country paths */}
        {features.map((f, i) => {
          const code = getCountryCode(f);
          const isAvailable = !!AVAILABLE_COUNTRIES[code];
          const isHovered = hoveredCountry === code;
          const d = pathGenerator(f.geometry) || '';

          return (
            <path
              key={i}
              d={d}
              className="country-path"
              fill={
                isAvailable
                  ? isHovered
                    ? 'rgba(166, 0, 255, 0.5)'
                    : 'rgba(131, 0, 202, 0.25)'
                  : isHovered
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(255,255,255,0.06)'
              }
              stroke={
                isAvailable
                  ? isHovered
                    ? '#a600ff'
                    : 'rgba(131,0,202,0.4)'
                  : 'rgba(255,255,255,0.08)'
              }
              strokeWidth={isAvailable ? (isHovered ? 1.5 : 0.8) : 0.3}
              filter={isAvailable && isHovered ? 'url(#countryGlow)' : undefined}
              onMouseMove={(e) => handleMouseMove(e, f)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleCountryClick(f)}
              style={{
                cursor: isAvailable ? 'pointer' : 'default',
              }}
            />
          );
        })}

        {/* Pulsing dots for available countries */}
        {Object.entries(AVAILABLE_COUNTRIES).map(([code, info]) => {
          const point = projection(info.center);
          if (!point) return null;
          return (
            <g key={code}>
              <circle
                cx={point[0]}
                cy={point[1]}
                r={6}
                fill={COUNTRY_COLORS[code] || '#a600ff'}
                opacity={0.6}
                className="animate-ring-pulse"
              />
              <circle
                cx={point[0]}
                cy={point[1]}
                r={3}
                fill="#fff"
                opacity={0.9}
              />
            </g>
          );
        })}
      </motion.svg>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 pointer-events-none glass-strong rounded-xl px-4 py-3"
            style={{
              left: tooltip.x + 16,
              top: tooltip.y - 8,
            }}
          >
            <div className="text-sm font-bold text-white">{tooltip.name}</div>
            {tooltip.available ? (
              <div className="text-[10px] font-bold text-primary-container mt-0.5">
                Click to explore
              </div>
            ) : (
              <div className="text-[10px] text-white/30 mt-0.5">
                Coming soon
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

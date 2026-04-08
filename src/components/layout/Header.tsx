'use client';

import { useCompassStore } from '@/lib/store';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Globe,
  Factory,
  Search,
  FileDown,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { generateCanadaReport } from '@/lib/pdfExport';

export default function Header() {
  const { lens, setLens, theme, toggleTheme, sidebarOpen, toggleSidebar } =
    useCompassStore();
  const pathname = usePathname();

  const isHome = pathname === '/';

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6"
      style={{
        background: 'rgba(9, 9, 11, 0.8)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Left: Logo + Sidebar Toggle */}
      <div className="flex items-center gap-4">
        {!isHome && (
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <PanelLeftClose size={18} className="text-white/60" />
            ) : (
              <PanelLeftOpen size={18} className="text-white/60" />
            )}
          </button>
        )}
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center gradient-primary"
            style={{ boxShadow: '0 0 20px rgba(131,0,202,0.3)' }}
          >
            <Globe size={16} className="text-white" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tighter text-white">
              COMPASS
            </span>
            <span className="text-[9px] font-bold tracking-[0.3em] text-white/30 ml-2 uppercase">
              Accenture
            </span>
          </div>
        </Link>
      </div>

      {/* Center: Lens Switcher */}
      <div className="flex items-center gap-1 p-1 rounded-full glass">
        <button
          onClick={() => setLens('regional')}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-300 ${
            lens === 'regional'
              ? 'gradient-primary text-white shadow-lg'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          <Globe size={14} />
          Regional Lens
        </button>
        <button
          onClick={() => setLens('industry')}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-300 ${
            lens === 'industry'
              ? 'gradient-primary text-white shadow-lg'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          <Factory size={14} />
          Industry Lens
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button className="p-2.5 rounded-xl glass transition-all hover:bg-white/10">
          <Search size={16} className="text-white/60" />
        </button>
        <button
          onClick={generateCanadaReport}
          className="p-2.5 rounded-xl glass transition-all hover:bg-white/10"
          title="Export PDF Report"
        >
          <FileDown size={16} className="text-white/60" />
        </button>
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl glass transition-all hover:bg-white/10"
        >
          {theme === 'dark' ? (
            <Sun size={16} className="text-white/60" />
          ) : (
            <Moon size={16} className="text-white/60" />
          )}
        </button>
        <div className="ml-2 w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-[11px] font-bold text-white">
          LP
        </div>
      </div>
    </header>
  );
}

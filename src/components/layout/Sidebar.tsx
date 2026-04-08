'use client';

import { useCompassStore } from '@/lib/store';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Factory,
  DollarSign,
  TrendingUp,
  Globe,
  ChevronRight,
  MapPin,
  FileText,
  Settings,
} from 'lucide-react';

const countryNav = [
  { label: 'Overview', href: '/explore/canada', icon: LayoutDashboard },
  { label: 'Talent', href: '/explore/canada/talent', icon: Users },
  { label: 'Industries', href: '/explore/canada/industries', icon: Factory },
  { label: 'Financials', href: '/explore/canada/financials', icon: DollarSign },
  { label: 'Macro & Trends', href: '/explore/canada/macro', icon: TrendingUp },
];

const industryNav = [
  { label: 'All Industries', href: '/industries', icon: Factory },
  { label: 'Technology', href: '/industries/technology', icon: Factory },
  { label: 'Financial Services', href: '/industries/financial-services', icon: DollarSign },
  { label: 'Energy & Resources', href: '/industries/energy', icon: TrendingUp },
  { label: 'Public Services', href: '/industries/public-services', icon: Globe },
  { label: 'Health & Life Sciences', href: '/industries/health', icon: Users },
];

export default function Sidebar() {
  const { sidebarOpen, lens } = useCompassStore();
  const pathname = usePathname();

  const isExplore = pathname.startsWith('/explore');
  const isIndustries = pathname.startsWith('/industries');
  const navItems = lens === 'industry' || isIndustries ? industryNav : countryNav;
  const showSidebar = isExplore || isIndustries;

  if (!showSidebar || !sidebarOpen) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: -260, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -260, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="fixed left-0 top-16 bottom-0 w-64 z-40 flex flex-col"
        style={{
          background: 'rgba(14, 14, 16, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Context Header */}
        <div className="p-5 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={12} className="text-primary-container" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">
              {lens === 'industry' ? 'Industry Intelligence' : 'Regional Explorer'}
            </span>
          </div>
          {isExplore && (
            <h3 className="text-lg font-black tracking-tight text-white">
              Canada
            </h3>
          )}
          {isIndustries && (
            <h3 className="text-lg font-black tracking-tight text-white">
              Industries
            </h3>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group ${
                  isActive
                    ? 'bg-primary/15 text-white border-l-2 border-primary-container'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5 hover:translate-x-1'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-primary-container' : 'text-white/30 group-hover:text-white/50'} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight size={14} className="text-primary-container" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 space-y-2">
          <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium text-white/30 hover:text-white/50 hover:bg-white/5 transition-all w-full">
            <FileText size={14} />
            Generate Report
          </button>
          <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium text-white/30 hover:text-white/50 hover:bg-white/5 transition-all w-full">
            <Settings size={14} />
            Settings
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { ChevronRight, Home, Menu, X } from 'lucide-react';
import { useApiHealth } from '../api/useApiHealth';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  title,
  subtitle,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const { status, data } = useApiHealth(15000);

  // Compute breadcrumb label
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentSegment = pathSegments[0] || '';

  const getBreadcrumbTitle = (seg: string) => {
    switch (seg) {
      case 'lab':
        return 'Network Laboratory';
      case 'strategies':
        return 'Routing Strategies';
      case 'research':
        return 'Experimental Research';
      case 'about':
        return 'Methodology & About';
      default:
        return seg.charAt(0).toUpperCase() + seg.slice(1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-nexus-950 text-nexus-300">
      <Navbar />

      <div className="flex-1 flex w-full">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block shrink-0">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Drawer */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative w-64 bg-nexus-900 border-r border-nexus-800 z-50 flex flex-col">
              <div className="p-4 border-b border-nexus-800 flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-nexus-200 uppercase tracking-wider">
                  Navigation
                </span>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded text-nexus-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Sidebar />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-nexus-950">
          {/* Subheader / Breadcrumbs bar */}
          <div className="h-12 border-b border-nexus-850 px-4 sm:px-6 lg:px-8 flex items-center justify-between bg-nexus-950/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-1 mr-1 rounded bg-nexus-900 border border-nexus-800 text-nexus-400 hover:text-nexus-200"
                aria-label="Open sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
              <Link
                to="/"
                className="text-nexus-500 hover:text-nexus-300 transition-colors flex items-center gap-1"
              >
                <Home className="w-3.5 h-3.5" />
                <span>NEXUS</span>
              </Link>
              <ChevronRight className="w-3 h-3 text-nexus-600" />
              <span className="text-nexus-200 font-medium">
                {getBreadcrumbTitle(currentSegment)}
              </span>
            </div>

            {/* Quick API status indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border ${
                  status === 'connected'
                    ? 'border-accent-emerald/30 bg-accent-emerald-subtle text-accent-emerald'
                    : 'border-nexus-800 bg-nexus-900 text-nexus-400'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    status === 'connected'
                      ? 'bg-accent-emerald'
                      : 'bg-accent-amber'
                  }`}
                />
                <span>
                  {status === 'connected'
                    ? `Live Engine (${data?.active_sessions ?? 0} active)`
                    : 'Engine Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Page Header (if title passed) */}
          {title && (
            <div className="px-4 sm:px-6 lg:px-8 py-6 border-b border-nexus-850 bg-gradient-to-b from-nexus-900/40 to-transparent">
              <div className="max-w-6xl">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-nexus-100">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-1 text-sm text-nexus-400 leading-relaxed max-w-3xl">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Body content */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
            {children}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

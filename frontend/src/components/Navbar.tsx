import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  Cpu,
  Layers,
  BarChart3,
  BookOpen,
  Menu,
  X,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { useApiHealth } from '../api/useApiHealth';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { status, data } = useApiHealth(15000);

  const navLinks = [
    { label: 'Overview', path: '/', icon: Activity },
    { label: 'Network Lab', path: '/lab', icon: Cpu },
    { label: 'Strategies', path: '/strategies', icon: Layers },
    { label: 'Research', path: '/research', icon: BarChart3 },
    { label: 'About', path: '/about', icon: BookOpen },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-nexus-950/85 backdrop-blur-md border-b border-nexus-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-cyan/20 to-accent-violet/30 border border-accent-cyan/40 flex items-center justify-center shadow-lg shadow-accent-cyan/5 group-hover:border-accent-cyan transition-colors">
            <Radio className="w-5 h-5 text-accent-cyan group-hover:scale-105 transition-transform" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-lg tracking-wider text-nexus-100">
                NEXUS
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-accent-violet-subtle text-accent-violet border border-accent-violet/20 font-medium">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-nexus-500 font-medium tracking-tight -mt-0.5 hidden sm:block">
              Self-Adaptive Network Intelligence
            </p>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  active
                    ? 'text-accent-cyan bg-nexus-900 border border-nexus-800 shadow-sm'
                    : 'text-nexus-400 hover:text-nexus-100 hover:bg-nexus-900/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-accent-cyan' : 'text-nexus-500'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section: API Status & CTA */}
        <div className="hidden sm:flex items-center gap-3">
          {/* API Health Pill */}
          <div
            title={
              status === 'connected'
                ? `FastAPI server connected (${data?.active_sessions ?? 0} active sessions)`
                : 'Backend API offline - run: uvicorn api.main:app'
            }
            className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono border transition-colors ${
              status === 'connected'
                ? 'bg-accent-emerald-subtle border-accent-emerald/30 text-accent-emerald'
                : status === 'checking'
                ? 'bg-nexus-900 border-nexus-700 text-nexus-400'
                : 'bg-accent-amber-subtle border-accent-amber/30 text-accent-amber'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'connected'
                  ? 'bg-accent-emerald animate-pulse'
                  : status === 'checking'
                  ? 'bg-nexus-400 animate-ping'
                  : 'bg-accent-amber'
              }`}
            />
            <span className="text-[11px] font-medium">
              {status === 'connected'
                ? 'API Online'
                : status === 'checking'
                ? 'Checking...'
                : 'API Offline'}
            </span>
          </div>

          {/* Quick CTA */}
          <Link
            to="/lab"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-accent-cyan to-accent-cyan-hover text-nexus-950 font-semibold shadow-md shadow-accent-cyan/15 hover:opacity-95 transition-all"
          >
            <span>Launch Lab</span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          {/* Compact API status pill */}
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              status === 'connected' ? 'bg-accent-emerald' : 'bg-accent-amber'
            }`}
          />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-nexus-900 border border-nexus-800 text-nexus-300 hover:text-white"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-nexus-800 bg-nexus-950/95 px-4 pt-2 pb-4 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                  active
                    ? 'text-accent-cyan bg-nexus-900 border border-nexus-800'
                    : 'text-nexus-400 hover:text-nexus-100 hover:bg-nexus-900/50'
                }`}
              >
                <Icon className="w-4 h-4 text-nexus-500" />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-nexus-850 flex items-center justify-between">
            <span className="text-xs text-nexus-500 font-mono">
              Status: {status === 'connected' ? 'Connected' : 'Offline'}
            </span>
            <Link
              to="/lab"
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs font-semibold text-accent-cyan flex items-center gap-1"
            >
              <span>Go to Network Lab</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

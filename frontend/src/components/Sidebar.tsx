import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Cpu,
  Layers,
  BarChart3,
  BookOpen,
  ArrowLeft,
  Server,
} from 'lucide-react';
import { useApiHealth } from '../api/useApiHealth';

interface SidebarProps {
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const location = useLocation();
  const { status, data } = useApiHealth(15000);

  const menuItems = [
    {
      title: 'Lab & Simulation',
      items: [
        { label: 'Network Lab', path: '/lab', icon: Cpu, badge: 'Phase 6/7' },
        { label: 'Routing Strategies', path: '/strategies', icon: Layers },
      ],
    },
    {
      title: 'Research & Evaluation',
      items: [
        { label: 'Experimental Analytics', path: '/research', icon: BarChart3 },
        { label: 'Methodology & About', path: '/about', icon: BookOpen },
      ],
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-64 bg-nexus-900 border-r border-nexus-800 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        {/* Back to Landing Page */}
        <Link
          to="/"
          className="flex items-center gap-2 text-xs font-mono text-nexus-400 hover:text-accent-cyan transition-colors px-2 py-1.5 rounded bg-nexus-950/60 border border-nexus-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing Page</span>
        </Link>

        {/* Navigation Categories */}
        <div className="space-y-6">
          {menuItems.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              <p className="px-2 text-[10px] uppercase font-mono tracking-wider font-semibold text-nexus-500">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? 'bg-nexus-850 text-accent-cyan border border-nexus-750 shadow-sm'
                          : 'text-nexus-400 hover:text-nexus-200 hover:bg-nexus-850/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 ${
                            active ? 'text-accent-cyan' : 'text-nexus-500'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-nexus-800 text-nexus-400 border border-nexus-700">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Telemetry Card */}
      <div className="p-4 border-t border-nexus-800/80 bg-nexus-950/40">
        <div className="rounded-xl bg-nexus-950 border border-nexus-800 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-nexus-300 font-medium">
              <Server className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Backend Engine</span>
            </div>
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'connected'
                  ? 'bg-accent-emerald animate-pulse'
                  : 'bg-accent-amber'
              }`}
            />
          </div>

          <div className="text-[11px] font-mono text-nexus-400 space-y-1">
            <div className="flex justify-between">
              <span className="text-nexus-500">FastAPI:</span>
              <span className="text-nexus-300">
                {status === 'connected' ? 'v1.0.0 Online' : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-nexus-500">Sessions:</span>
              <span className="text-nexus-300">
                {data?.active_sessions ?? 0} active
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-nexus-500">Mamdani:</span>
              <span className="text-accent-cyan">Centroid COA</span>
            </div>
          </div>

          {status === 'offline' && (
            <p className="text-[10px] text-accent-amber/90 leading-tight pt-1">
              Run <code className="text-nexus-200">uvicorn api.main:app</code> for live session calculation.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};

import React from 'react';
import type { EventResponse } from '../../api/types';
import {
  History,
  ChevronRight,
} from 'lucide-react';

interface EventHistoryProps {
  events: EventResponse[];
  onSelectEvent: (event: EventResponse) => void;
  selectedEventIndex: number | null;
}

export const EventHistory: React.FC<EventHistoryProps> = ({
  events,
  onSelectEvent,
  selectedEventIndex,
}) => {
  return (
    <div className="rounded-2xl bg-nexus-900/90 border border-nexus-800 p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-nexus-800 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-accent-cyan" />
          <h3 className="font-semibold text-sm text-nexus-100">
            Session Event Audit History ({events.length})
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-nexus-950 border border-nexus-800 text-nexus-400">
          Ephemeral Session Log
        </span>
      </div>

      {events.length === 0 ? (
        <div className="py-6 text-center text-xs font-mono text-nexus-500 space-y-1">
          <p>No events logged in this session yet.</p>
          <p className="text-[10px] text-nexus-600">
            All dynamic events applied during this browser session appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-nexus-850">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-nexus-950 text-nexus-400 text-[11px] uppercase border-b border-nexus-850">
              <tr>
                <th className="py-2.5 px-3 font-semibold">#</th>
                <th className="py-2.5 px-3 font-semibold">Event</th>
                <th className="py-2.5 px-3 font-semibold">Decision</th>
                <th className="py-2.5 px-3 font-semibold">Route Transition</th>
                <th className="py-2.5 px-3 font-semibold">Latency Δ</th>
                <th className="py-2.5 px-3 font-semibold">Recovery Time</th>
                <th className="py-2.5 px-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexus-850">
              {events.map((ev, idx) => {
                const isSelected = selectedEventIndex === idx;
                const isTriggered = ev.triggered;
                const isUnreachable = ev.unreachable;

                return (
                  <tr
                    key={idx}
                    onClick={() => onSelectEvent(ev)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-accent-cyan-subtle/50 text-nexus-100 font-medium'
                        : 'hover:bg-nexus-850/40 text-nexus-300'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-nexus-500">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold uppercase text-[11px] text-nexus-200">
                        {ev.event_name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          isUnreachable
                            ? 'bg-accent-coral-subtle text-accent-coral'
                            : isTriggered
                            ? 'bg-accent-emerald-subtle text-accent-emerald'
                            : 'bg-accent-amber-subtle text-accent-amber'
                        }`}
                      >
                        {isUnreachable
                          ? 'Unreachable'
                          : isTriggered
                          ? 'Rerouted'
                          : 'Tolerated'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-nexus-300 text-[11px]">
                      {ev.previous_route.join('→')} →{' '}
                      <span
                        className={
                          ev.route_changed ? 'text-accent-cyan font-bold' : ''
                        }
                      >
                        {ev.new_route.length > 0
                          ? ev.new_route.join('→')
                          : 'CUT'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {ev.performance_delta?.latency_ms !== undefined &&
                      ev.performance_delta?.latency_ms !== null ? (
                        <span
                          className={
                            ev.performance_delta.latency_ms > 0
                              ? 'text-accent-coral'
                              : 'text-accent-emerald'
                          }
                        >
                          {ev.performance_delta.latency_ms > 0 ? '+' : ''}
                          {ev.performance_delta.latency_ms.toFixed(1)}ms
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-nexus-400">
                      {(ev.processing_time_ms + ev.reroute_time_ms).toFixed(1)}ms
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        className="text-xs text-accent-cyan hover:underline flex items-center gap-0.5 ml-auto"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

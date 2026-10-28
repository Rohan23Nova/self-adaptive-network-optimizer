/**
 * Centralized typed API client for NEXUS Network Intelligence Backend.
 */

import type {
  HealthResponse,
  TopologyResponse,
  SessionResponse,
  CreateSessionRequest,
  CompareStrategiesResponse,
  CompareRequest,
  EventRequest,
  EventResponse,
  ExperimentSummaryResponse,
  ExperimentResultsResponse,
  ConvergenceResponse,
  TimelineResponse,
} from './types';

export const API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.VITE_API_URL as string) ||
  'http://127.0.0.1:8000'
).replace(/\/+$/, '');

export class ApiError extends Error {
  status?: number;
  data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 8000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 8000
): Promise<T> {
  const fullUrl = `${API_BASE_URL.replace(/\/+$/, '')}${endpoint}`;
  try {
    const response = await fetchWithTimeout(fullUrl, options, timeoutMs);
    if (!response.ok) {
      let errorBody: any = null;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }
      const msg =
        (errorBody && (errorBody.detail || errorBody.message)) ||
        `API request failed with status ${response.status}`;
      throw new ApiError(msg, response.status, errorBody);
    }
    return (await response.json()) as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err.name === 'AbortError') {
      throw new ApiError(`Connection timeout to ${fullUrl} after ${timeoutMs}ms`);
    }
    throw new ApiError(
      `Cannot connect to NEXUS API at ${API_BASE_URL}. Is the backend running?`,
      undefined,
      err
    );
  }
}

export const api = {
  // Health
  async getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>('/api/health', { method: 'GET' }, 4000);
  },

  // Topology
  async getTopology(type: 'demo' | 'experiment' = 'demo'): Promise<TopologyResponse> {
    return request<TopologyResponse>(`/api/network/topology?type=${type}`, {
      method: 'GET',
    });
  },

  // Sessions
  async createSession(payload: CreateSessionRequest = {}): Promise<SessionResponse> {
    return request<SessionResponse>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getSession(sessionId: string): Promise<SessionResponse> {
    return request<SessionResponse>(`/api/sessions/${sessionId}`, {
      method: 'GET',
    });
  },

  async triggerEvent(sessionId: string, payload: EventRequest): Promise<EventResponse> {
    return request<EventResponse>(`/api/sessions/${sessionId}/events`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async resetSession(sessionId: string): Promise<SessionResponse> {
    return request<SessionResponse>(`/api/sessions/${sessionId}/reset`, {
      method: 'POST',
    });
  },

  async updateEndpoints(
    sessionId: string,
    payload: { source: number; destination: number }
  ): Promise<SessionResponse> {
    return request<SessionResponse>(`/api/sessions/${sessionId}/endpoints`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async compareStrategies(
    sessionId: string,
    payload: CompareRequest = {}
  ): Promise<CompareStrategiesResponse> {
    return request<CompareStrategiesResponse>(`/api/sessions/${sessionId}/compare`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Experiments
  async getExperimentSummary(): Promise<ExperimentSummaryResponse> {
    return request<ExperimentSummaryResponse>('/api/experiments/summary', {
      method: 'GET',
    });
  },

  async getExperimentResults(
    scenario?: string,
    strategy?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ExperimentResultsResponse> {
    const params = new URLSearchParams();
    if (scenario && scenario !== 'all') params.append('scenario', scenario);
    if (strategy && strategy !== 'all') params.append('strategy', strategy);
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    return request<ExperimentResultsResponse>(
      `/api/experiments/results?${params.toString()}`,
      { method: 'GET' }
    );
  },

  async getConvergence(scenario?: string): Promise<ConvergenceResponse> {
    const q = scenario ? `?scenario=${encodeURIComponent(scenario)}` : '';
    return request<ConvergenceResponse>(`/api/experiments/convergence${q}`, {
      method: 'GET',
    });
  },

  async getAcoConvergence(scenario?: string): Promise<ConvergenceResponse> {
    return this.getConvergence(scenario);
  },

  async getTimeline(): Promise<TimelineResponse> {
    return request<TimelineResponse>('/api/experiments/timeline', {
      method: 'GET',
    });
  },

  async getDynamicTimeline(): Promise<TimelineResponse> {
    return this.getTimeline();
  },
};

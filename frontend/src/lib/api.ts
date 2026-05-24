// Frontend API Client and Type Definitions

import { toEvalRunSummary, type BackendEvalRunResult } from './evalTransforms';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface AlertListItem {
  id: string;
  title: string;
  source: string;
  vendor: string | null;
  product: string | null;
  device_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'closed';
  category: string;
  created_at: string;
}

export interface AlertListResponse {
  items: AlertListItem[];
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  source: string;
  vendor: string | null;
  product: string | null;
  device_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'closed';
  entities: {
    src_ip?: string;
    dst_host?: string;
    username?: string;
    [key: string]: JsonValue | undefined;
  };
  time_range: {
    start: string;
    end: string;
  };
  raw: Record<string, JsonValue>;
}

export interface Investigation {
  id: string;
  alert_id: string;
  status: 'created' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled';
  summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  mitre_techniques: string[];
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineItem {
  id: string;
  investigation_id: string;
  type: 'agent_message' | 'tool_call' | 'tool_result' | 'approval_created' | 'approval_decision' | 'report_created' | 'error';
  title: string;
  content: string;
  tool_name: string | null;
  input: Record<string, JsonValue> | null;
  output: Record<string, JsonValue> | null;
  created_at: string;
}

export interface TimelineResponse {
  items: TimelineItem[];
}

export interface InvestigationCreateResponse {
  id: string;
  alert_id: string;
  status: 'created';
  created_at: string;
}

export interface InvestigationRunResponse {
  id: string;
  status: 'running';
}

export interface InvestigationListResponse {
  items: Investigation[];
}

// Approval Structures
export interface ApprovalListItem {
  id: string;
  investigation_id: string;
  action_type: 'block_ip' | 'isolate_host' | 'disable_user' | 'collect_artifact' | 'notify_owner';
  target: string;
  risk_level: 'medium' | 'high' | 'critical';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  comment: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface ApprovalListResponse {
  items: ApprovalListItem[];
}

export interface ApprovalDecisionResponse {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface IMStatus {
  enabled: boolean;
  provider: string;
  notification_only: boolean;
  callback_enabled: boolean;
  card_enabled?: boolean;
  last_error?: string | null;
}

export interface LLMStatus {
  enabled: boolean;
  provider: string;
  model: string;
  base_url_configured: boolean;
  api_key_configured: boolean;
  prompt_profile: string;
  temperature: number;
  timeout_seconds: number;
  action_mode: 'recommend_only' | 'approval_required' | 'auto_approve_simulated';
  constraints: {
    structured_output_required: boolean;
    allowed_actions: string[];
    action_mode: string;
    high_risk_actions_allowed: boolean;
    high_risk_requires_approval: boolean;
    real_response_actions_enabled: boolean;
    secrets_hidden: boolean;
  };
  supported_providers: string[];
  supported_action_modes: string[];
}

export interface SystemHealth {
  backend: { status: 'online' | 'offline' | 'disabled' };
  database: { status: 'online' | 'offline' | 'disabled' };
  llm: { status: 'online' | 'offline' | 'disabled'; configured: boolean };
  im: { status: 'online' | 'offline' | 'disabled'; configured: boolean };
}

export interface DashboardSummary {
  health: SystemHealth;
  metrics: {
    total_alerts: number;
    today_alerts: number;
    high_risk_alerts: number;
    investigations_total: number;
    investigations_running: number;
    investigations_waiting_approval: number;
    investigations_completed: number;
    pending_approvals: number;
  };
  recent_timeline: Array<{
    id: string;
    investigation_id: string;
    type: TimelineItem['type'];
    title: string;
    content: string;
    created_at: string;
  }>;
  recent_high_risk_alerts: Array<{
    id: string;
    title: string;
    severity: AlertListItem['severity'];
    category: string;
    created_at: string;
  }>;
}

export interface SecurityLogEvent {
  id: string;
  alert_id: string;
  event_time: string;
  log_type: string;
  host?: string | null;
  message: string;
  src_ip?: string | null;
  username?: string | null;
  severity?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface SecurityLogResponse {
  items: SecurityLogEvent[];
  count: number;
  total: number;
}

export interface ServiceLogEntry {
  id: string;
  level: string;
  message: string;
  created_at: string | null;
}

export interface ServiceLogResponse {
  items: ServiceLogEntry[];
  count: number;
}

export interface SystemConfigItem {
  key: string;
  value: string | null;
  configured: boolean;
  sensitive: boolean;
  updated_at: string | null;
}

export interface SettingsResponse {
  items: Record<string, SystemConfigItem>;
}

// Report Structure
export interface Report {
  id: string;
  investigation_id: string;
  format: 'markdown';
  content: string;
  created_at: string;
}

// Evals Structures
export interface EvalCaseResult {
  case_id: string;
  alert_id: string;
  expected_severity: string;
  actual_severity: string;
  expected_category: string;
  actual_category: string;
  expected_mitre: string[];
  actual_mitre: string[];
  requires_approval: boolean;
  expected_approval_type: string | null;
  actual_approval_type: string | null;

  // Breakdown
  severity_match: boolean;
  category_match: boolean;
  mitre_match: boolean;
  tool_call_match: boolean;
  approval_match: boolean;
  report_evidence_match: boolean;

  passed: boolean;
  diagnostics: string;
  diagnostics_en?: string;
}

export interface EvalRunSummary {
  run_id: string;
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  average_score: number;
  cases: EvalCaseResult[];
  created_at: string;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

const ENV_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || '';
let tauriBackendBaseUrl: Promise<string> | null = null;

async function getBackendBaseUrl(): Promise<string> {
  if (ENV_API_BASE) {
    return ENV_API_BASE;
  }

  if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
    tauriBackendBaseUrl ??= import('@tauri-apps/api/core')
      .then(({ invoke }) => invoke<string>('backend_base_url'))
      .then((url) => url.replace(/\/$/, ''));
    return tauriBackendBaseUrl;
  }

  return '';
}

async function resolveApiUrl(path: string): Promise<string> {
  const baseUrl = await getBackendBaseUrl();
  const apiPath = path === '/health' ? '/health' : `/api${path}`;
  return `${baseUrl}${apiPath}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = await resolveApiUrl(path);
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    let errMsg = `Request failed with status ${response.status}`;
    try {
      const errBody: unknown = await response.json();
      if (
        typeof errBody === 'object' &&
        errBody !== null &&
        'error' in errBody &&
        typeof errBody.error === 'object' &&
        errBody.error !== null &&
        'message' in errBody.error &&
        typeof errBody.error.message === 'string'
      ) {
        errMsg = errBody.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Alerts
  async getAlerts(): Promise<AlertListResponse> {
    return request<AlertListResponse>('/alerts');
  },

  async getAlert(alertId: string): Promise<Alert> {
    return request<Alert>(`/alerts/${alertId}`);
  },

  // Investigations
  async getInvestigations(params: Record<string, string> = {}): Promise<InvestigationListResponse> {
    const query = new URLSearchParams(params);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request<InvestigationListResponse>(`/investigations${suffix}`);
  },

  async createInvestigation(alertId: string): Promise<InvestigationCreateResponse> {
    return request<InvestigationCreateResponse>('/investigations', {
      method: 'POST',
      body: JSON.stringify({ alert_id: alertId }),
    });
  },

  async runInvestigation(investigationId: string): Promise<InvestigationRunResponse> {
    return request<InvestigationRunResponse>(`/investigations/${investigationId}/run`, {
      method: 'POST',
    });
  },

  async getInvestigation(investigationId: string): Promise<Investigation> {
    return request<Investigation>(`/investigations/${investigationId}`);
  },

  async getTimeline(investigationId: string): Promise<TimelineResponse> {
    return request<TimelineResponse>(`/investigations/${investigationId}/timeline`);
  },

  // Approvals
  async getAllApprovals(params: Record<string, string> = {}): Promise<ApprovalListResponse> {
    const query = new URLSearchParams(params);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request<ApprovalListResponse>(`/approvals${suffix}`);
  },

  async getApprovals(investigationId: string): Promise<ApprovalListResponse> {
    return request<ApprovalListResponse>(`/investigations/${investigationId}/approvals`);
  },

  async decideApproval(approvalId: string, decision: 'approved' | 'rejected', comment?: string): Promise<ApprovalDecisionResponse> {
    return request<ApprovalDecisionResponse>(`/approvals/${approvalId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, comment: comment || "" })
    });
  },

  // Reports
  async getReport(investigationId: string): Promise<Report> {
    return request<Report>(`/investigations/${investigationId}/report`);
  },

  // Evals Dashboard
  async runEvals(): Promise<EvalRunSummary> {
    const realResult = await request<BackendEvalRunResult>('/evals/run', { method: 'POST' });
    return toEvalRunSummary(realResult);
  },

  async getEvalRun(runId: string): Promise<EvalRunSummary> {
    const realResult = await request<BackendEvalRunResult>(`/evals/${runId}`);
    return toEvalRunSummary(realResult);
  },

  // Health
  async checkHealth(): Promise<{ status: string }> {
    return request<{ status: string }>('/health');
  },

  async getIMStatus(): Promise<IMStatus> {
    return request<IMStatus>('/integrations/im/status');
  },

  async getLLMStatus(): Promise<LLMStatus> {
    return request<LLMStatus>('/integrations/llm/status');
  },

  async getSystemDashboard(): Promise<DashboardSummary> {
    return request<DashboardSummary>('/system/dashboard');
  },

  async getSystemHealth(): Promise<SystemHealth> {
    return request<SystemHealth>('/system/health');
  },

  async getSecurityLogs(params: Record<string, string>): Promise<SecurityLogResponse> {
    const query = new URLSearchParams(params);
    return request<SecurityLogResponse>(`/logs/security?${query.toString()}`);
  },

  async getServiceLogs(params: Record<string, string>): Promise<ServiceLogResponse> {
    const query = new URLSearchParams(params);
    return request<ServiceLogResponse>(`/system/logs/service?${query.toString()}`);
  },

  async getSettings(): Promise<SettingsResponse> {
    return request<SettingsResponse>('/settings');
  },

  async updateSettings(items: Record<string, string>): Promise<SettingsResponse> {
    return request<SettingsResponse>('/settings', {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    });
  }
};

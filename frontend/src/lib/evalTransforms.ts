import { evalBaselineSummary } from './evalBaseline';
import type { EvalRunSummary } from './api';

interface BackendEvalCaseResult {
  case_id: string;
  passed: boolean;
  scores: {
    severity_match?: boolean;
    category_match?: boolean;
    mitre_match?: boolean;
    tool_call_match?: boolean;
    approval_match?: boolean;
    report_evidence_match?: boolean;
  };
  notes: string[];
}

export interface BackendEvalRunResult {
  run_id: string;
  summary?: {
    total?: number;
    passed?: number;
    failed?: number;
  };
  cases?: BackendEvalCaseResult[];
}

export function toEvalRunSummary(realResult: BackendEvalRunResult): EvalRunSummary {
  const cases = evalBaselineSummary.cases.map(mockCase => {
    const realCase = realResult.cases?.find(c => c.case_id === mockCase.case_id);
    if (!realCase) {
      return {
        ...mockCase,
        actual_severity: 'missing',
        actual_category: 'missing',
        actual_mitre: [],
        actual_approval_type: null,
        severity_match: false,
        category_match: false,
        mitre_match: false,
        tool_call_match: false,
        approval_match: false,
        report_evidence_match: false,
        passed: false,
        diagnostics: `Backend eval response did not include case ${mockCase.case_id}.`,
      };
    }

    return {
      ...mockCase,
      passed: realCase.passed,
      severity_match: realCase.scores?.severity_match ?? false,
      category_match: realCase.scores?.category_match ?? false,
      mitre_match: realCase.scores?.mitre_match ?? false,
      tool_call_match: realCase.scores?.tool_call_match ?? false,
      approval_match: realCase.scores?.approval_match ?? false,
      report_evidence_match: realCase.scores?.report_evidence_match ?? false,
      diagnostics: realCase.notes?.length ? realCase.notes.join('；') : mockCase.diagnostics,
      diagnostics_en: realCase.notes?.length ? realCase.notes.join('; ') : mockCase.diagnostics_en,
    };
  });
  const totalCases = cases.length;
  const passedCases = cases.filter(c => c.passed).length;
  const failedCases = totalCases - passedCases;

  return {
    ...evalBaselineSummary,
    run_id: realResult.run_id,
    total_cases: totalCases,
    passed_cases: passedCases,
    failed_cases: failedCases,
    average_score: totalCases === 0 ? 0 : Math.round((passedCases / totalCases) * 100),
    cases,
    created_at: new Date().toISOString(),
  };
}

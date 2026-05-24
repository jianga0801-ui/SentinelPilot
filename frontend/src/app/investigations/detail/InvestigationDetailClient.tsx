'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Cpu,
  Terminal,
  CheckCircle,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sliders,
  AlertOctagon,
  Code,
  ClipboardList,
  ShieldCheck,
  ShieldX,
  MessageSquare
} from 'lucide-react';
import { api, Investigation, TimelineItem, ApprovalListItem, Report } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { getTranslationEntry, translations, translateFrom } from '@/lib/translations';
import ReportPreview from './ReportPreview';
const categoryNames: Record<string, { zh: string; en: string }> = {
  credential_access: { zh: '凭据盗取与破解', en: 'Credential Access' },
  execution: { zh: '恶意命令与脚本执行', en: 'Command & Script Execution' },
  web_intrusion: { zh: 'Web 漏洞入侵后门', en: 'Web Intrusion' },
  command_and_control: { zh: '命令控制信道通信', en: 'Command & Control' },
  lateral_movement: { zh: '内网横向移动渗透', en: 'Lateral Movement' },
  data_exfiltration: { zh: '敏感业务数据外泄', en: 'Data Exfiltration' },
  false_positive: { zh: '研发测试业务误报', en: 'Benign False Positive' }
};

export default function InvestigationDetailPage() {
  const searchParams = useSearchParams();
  const investigationId = searchParams.get('id') || '';
  const { language, t } = useLanguage();

  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalListItem[]>([]);
  const [report, setReport] = useState<Report | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');

  // Tab selector between 'timeline' and 'report'
  const [activePanelTab, setActivePanelTab] = useState<'timeline' | 'report'>('timeline');

  // Accordion state to hold collapsed/expanded status of each timeline item
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Reference to track interval for safe cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const investigationStatus = investigation?.status;

  const fetchDetails = useCallback(async (showLoading = false) => {
    if (!investigationId) return;
    try {
      if (showLoading) setLoading(true);

      const invData = await api.getInvestigation(investigationId);
      setInvestigation(invData);

      const timelineData = await api.getTimeline(investigationId);
      setTimelineItems(timelineData?.items || []);

      if (invData.status === 'waiting_approval') {
        const appData = await api.getApprovals(investigationId);
        setApprovals(appData?.items?.filter(a => a.status === 'pending') || []);
      } else {
        setApprovals([]);
      }

      if (invData.status === 'completed') {
        try {
          const reportData = await api.getReport(investigationId);
          setReport(reportData);
          setActivePanelTab('report');
        } catch (repErr: unknown) {
          console.warn("Failed to fetch report", repErr);
        }
      }

      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (language === 'zh' ? '获取 AI 研判详情或时间线故障。' : 'Failed to retrieve investigation trace or timeline details.'));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [investigationId, language]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchDetails(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchDetails]);

  useEffect(() => {
    if (!investigationStatus) return;

    const isRunning = investigationStatus === 'created' || investigationStatus === 'running';

    if (isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(() => {
        void fetchDetails(false);
      }, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchDetails, investigationStatus]);

  const handleDecision = async (approvalId: string, decision: 'approved' | 'rejected') => {
    try {
      setSubmittingApproval(true);
      await api.decideApproval(approvalId, decision, approvalComment);
      setApprovalComment('');

      api.runInvestigation(investigationId).catch(err => {
        console.error("Failed to auto-trigger investigation run after approval decision:", err);
      });

      await fetchDetails(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : (language === 'zh' ? '决策提交异常，请稍后重试。' : 'Failed to submit decision. Please try again.'));
    } finally {
      setSubmittingApproval(false);
    }
  };

  const toggleExpandItem = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const getActionName = (action: string) => {
    const act = getTranslationEntry(translations.investigation.actionTypes, action);
    if (act) {
      return act[language] || act.en || action;
    }
    return {
      block_ip: language === 'zh' ? '阻断源 IP 恶意入站' : 'Block IP Address',
      isolate_host: language === 'zh' ? '终端安全强行隔离' : 'Isolate Endpoint Host',
      disable_user: language === 'zh' ? '禁用受损登录账户' : 'Disable Account',
      collect_artifact: language === 'zh' ? '提取终端分析样本' : 'Collect Forensic Artifact',
      notify_owner: language === 'zh' ? '向资产归属方预警' : 'Notify System Owner',
    }[action] || action;
  };

  const selectRecommendation = (rec: string) => {
    setApprovalComment(rec);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 min-h-[50vh]">
        <Loader2 className="w-6 h-6 text-[#C2593F] animate-spin" />
        <span className="text-sm text-stone-500 font-mono tracking-wider">
          {language === 'zh' ? '正在连通研判协处理器流程监控...' : 'Connecting to investigation coprocessor...'}
        </span>
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="flex-1 p-8 space-y-4 max-w-7xl mx-auto w-full">
        <Link href="/alerts" className="flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-[#1E2022]">
          <ArrowLeft className="w-4 h-4" /> {language === 'zh' ? '返回安全告警台账' : 'Return to Alerts Ledger'}
        </Link>
        <div className="bg-white border border-[#EAE9E4] p-10 rounded text-center flex flex-col items-center gap-3">
          <AlertOctagon className="w-8 h-8 text-[#B83C25]" />
          <h4 className="text-sm font-bold text-[#1E2022]">
            {language === 'zh' ? '拉取研判任务详情失败' : 'Failed to retrieve investigation trace'}
          </h4>
          <p className="text-xs text-stone-500 max-w-sm">
            {error || (language === 'zh' ? '该研判任务不存在或已被安全撤销。' : 'This investigation task does not exist or has been cancelled.')}
          </p>
        </div>
      </div>
    );
  }

  const sKey = investigation.status as 'created' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled';
  const statusLabels = {
    created: { text: t('investigation', 'statusLabel.created', 'Queued'), color: 'text-stone-500 bg-[#F5F3EB] border-[#EAE9E4]' },
    running: { text: t('investigation', 'statusLabel.running', 'Analyzing'), color: 'text-[#C2593F] bg-[#FAF5E6] border-[#FAF5E6]' },
    waiting_approval: { text: t('investigation', 'statusLabel.waiting_approval', 'Pending Approval'), color: 'text-[#B83C25] bg-[#FCF1EE] border-[#FCF1EE]' },
    completed: { text: t('investigation', 'statusLabel.completed', 'Completed'), color: 'text-[#25633A] bg-[#F0F6F1] border-[#F0F6F1]' },
    failed: { text: t('investigation', 'statusLabel.failed', 'Failed'), color: 'text-[#B83C25] bg-[#FCF1EE] border-[#EAE9E4]' },
    cancelled: { text: t('investigation', 'statusLabel.cancelled', 'Cancelled'), color: 'text-stone-500 bg-[#F5F3EB] border-[#EAE9E4]' },
  }[sKey] || { text: investigation.status, color: 'text-stone-500 bg-[#F5F3EB] border-[#EAE9E4]' };

  return (
    <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Breadcrumbs Navigation */}
      <div className="border-b border-[#EAE9E4] pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#6B6D70]">
            <Link href="/alerts" className="hover:text-[#1E2022] transition-colors">{t('investigation', 'breadcrumbList')}</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/alerts/detail?id=${encodeURIComponent(investigation.alert_id)}`} className="hover:text-[#1E2022] transition-colors font-mono">{investigation.alert_id}</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#C2593F]">{t('investigation', 'breadcrumbTrace')}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <Link
              href={`/alerts/detail?id=${encodeURIComponent(investigation.alert_id)}`}
              className="w-8 h-8 border border-[#EAE9E4] rounded bg-white flex items-center justify-center text-stone-600 hover:text-[#1E2022] hover:bg-[#F5F3EB] transition-colors duration-150"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h2 className="text-2xl font-serif font-black text-[#1E2022] tracking-tight leading-tight">
              {t('investigation', 'title')}
            </h2>
          </div>
          <p className="text-xs text-[#6B6D70] leading-relaxed max-w-2xl font-sans mt-0.5">
            {t('investigation', 'subtitle')}
          </p>
        </div>

        <div>
          <span className={`inline-block text-xs font-bold font-mono px-3.5 py-1.5 rounded border select-none ${statusLabels.color}`}>
            {statusLabels.text}
          </span>
        </div>
      </div>

      {/* Grid: Details HUD Panel + Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* HUD Details Panel (Left Column 1/3) */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-white border border-[#EAE9E4] p-6 rounded space-y-4.5">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4.5 h-4.5 text-[#C2593F]" />
              <h4 className="text-xs font-bold text-[#6B6D70] uppercase tracking-wider font-sans">
                {language === 'zh' ? '研判概要 (HUD)' : 'Investigation Summary (HUD)'}
              </h4>
            </div>

            {/* Core Specs */}
            <div className="space-y-3 font-mono text-sm border-b border-[#EAE9E4] pb-4">
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">{language === 'zh' ? '调查单 ID (ID)' : 'Investigation ID'}</span>
                <span className="text-stone-800 font-bold">{investigation.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">{language === 'zh' ? '对应安全告警' : 'Target Alert'}</span>
                <Link href={`/alerts/detail?id=${encodeURIComponent(investigation.alert_id)}`} className="text-[#C2593F] font-semibold hover:underline">
                  {investigation.alert_id}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">{t('investigation', 'severity')}</span>
                <span className={`font-bold uppercase ${
                  investigation.severity === 'high' || investigation.severity === 'critical' ? 'text-[#B83C25]' :
                  investigation.severity === 'medium' ? 'text-[#A37110]' : 'text-[#25633A]'
                }`}>
                  {t('alerts', `severity.${investigation.severity.toLowerCase()}`, investigation.severity.toUpperCase())}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">{t('investigation', 'category')}</span>
                <span className="text-stone-800 uppercase font-semibold">
                  {investigation.category
                    ? (language === 'zh' ? (categoryNames[investigation.category]?.zh || investigation.category) : (categoryNames[investigation.category]?.en || investigation.category))
                    : (language === 'zh' ? '分析中...' : 'Analyzing...')}
                </span>
              </div>
            </div>

            {/* MITRE ATT&CK Mapping */}
            <div className="space-y-2.5 border-b border-[#EAE9E4] pb-4">
              <span className="text-xs font-bold text-[#6B6D70] tracking-wider uppercase block">{t('investigation', 'mitre')}</span>
              {investigation.mitre_techniques && investigation.mitre_techniques.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {investigation.mitre_techniques.map(tech => (
                    <span
                      key={tech}
                      className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-[#FCF5E3] border border-[#EAE9E4] text-[#A37110] uppercase tracking-wide animate-pulse"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-stone-400 block italic leading-snug font-sans">
                  {investigation.status === 'created' || investigation.status === 'running'
                    ? (language === 'zh' ? 'AI 协处理器正在梳理日志细节并映射 MITRE 技术...' : 'AI Coprocessor is analyzing system logs and mapping MITRE techniques...')
                    : (language === 'zh' ? '本研判场景无明显的恶意战术动作。' : 'No significant malicious tactics mapped for this trace.')}
                </span>
              )}
            </div>

            {/* Times */}
            <div className="space-y-2 font-mono text-xs text-stone-500 leading-none pt-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>{language === 'zh' ? '立案时间:' : 'Created At:'} {new Date(investigation.created_at).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { hour12: false })}</span>
              </div>
              {investigation.updated_at && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>{language === 'zh' ? '更新时间:' : 'Updated At:'} {new Date(investigation.updated_at).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { hour12: false })}</span>
                </div>
              )}
            </div>
          </div>

          {/* User-Safe Error Panel */}
          {investigation.status === 'failed' && (
            <div className="bg-[#FCF1EE] p-5 rounded border border-[#EAE9E4] space-y-2">
              <div className="flex items-center gap-2 text-[#B83C25] font-bold text-xs">
                <AlertOctagon className="w-4 h-4" />
                <span>{language === 'zh' ? 'AI 研判协处理器发生内部故障' : 'AI Coprocessor Workflow Exception'}</span>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed font-sans">
                {investigation.error_message || (language === 'zh'
                  ? '系统在执行分布式回溯取证工具时遭遇超时无响应故障，任务已触发安全围栏自动阻断。请联系技术人员审计后台容器环境日志。'
                  : 'The system encountered a timeout or unresponsiveness while executing forensic tools. Workflow aborted by safety sandbox. Please contact SOC administrator.')}
              </p>
            </div>
          )}
        </div>

        {/* Workspace (Right Column 2/3) */}
        <div className="lg:col-span-2 space-y-6">

          {/* SOC Human Approval Panel (Renders only when status is waiting_approval) */}
          {investigation.status === 'waiting_approval' && approvals.length > 0 && (
            <div className="bg-[#F7F5EF] p-6 rounded border border-[#EAE9E4] space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#FCF1EE] flex items-center justify-center text-[#B83C25]">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-serif font-black text-[#1E2022] tracking-wide">
                    {t('investigation', 'approvalPanelTitle')}
                  </h4>
                  <span className="text-[10px] text-[#6B6D70] block tracking-wider mt-0.5">
                    {t('investigation', 'approvalPanelDesc')}
                  </span>
                </div>
              </div>

              {approvals.map(approval => (
                <div key={approval.id} className="bg-white border border-[#EAE9E4] p-4.5 rounded space-y-4">
                  <div className="flex flex-col md:flex-row justify-between gap-2 border-b border-[#EAE9E4] pb-3">
                    <div>
                      <span className="text-xs font-sans font-bold text-stone-500 uppercase block">{t('investigation', 'recommendedAction')}</span>
                      <span className="text-sm font-bold text-stone-850 font-mono mt-0.5 block select-all">
                        {getActionName(approval.action_type)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-sans font-bold text-stone-500 uppercase block md:text-right">{t('investigation', 'targetEntity')}</span>
                      <span className="text-sm font-bold text-[#C2593F] font-mono mt-0.5 block select-all bg-[#FCF5E3] px-2.5 py-0.5 rounded w-max md:ml-auto">
                        {approval.target}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-sans font-bold text-stone-500 uppercase block">{t('investigation', 'reasonText')}</span>
                    <p className="text-sm text-stone-700 leading-relaxed leading-5">
                      “ {approval.reason} ”
                    </p>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-2.5 pt-2 border-t border-[#EAE9E4]">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-stone-500 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-[#C2593F]" />
                        <span>{language === 'zh' ? '分析研判批注说明' : 'Auditing Remarks'}</span>
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => selectRecommendation(language === 'zh' ? "判定主机恶意后门成立，授权执行受控终端隔离。" : "Host backdoor activity verified. Isolate host endpoint immediately.")}
                          className="text-xs font-medium bg-[#EFECE3] hover:bg-[#E2DFD5] text-stone-700 hover:text-stone-900 px-2 py-0.5 rounded transition-colors"
                        >
                          {language === 'zh' ? '同意隔离' : 'Approve Isolation'}
                        </button>
                        <button
                          onClick={() => selectRecommendation(language === 'zh' ? "判定外部 IP 恶意爆破攻击成立，批准立即加入防护策略。" : "External IP credential stuffing verified. Block IP address immediately.")}
                          className="text-xs font-medium bg-[#EFECE3] hover:bg-[#E2DFD5] text-stone-700 hover:text-stone-900 px-2 py-0.5 rounded transition-colors"
                        >
                          {language === 'zh' ? '同意阻断' : 'Approve Blocking'}
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      placeholder={t('investigation', 'commentPlaceholder')}
                      className="w-full text-sm bg-white border border-[#EAE9E4] rounded p-3 focus:outline-none focus:border-[#C2593F] text-stone-800 placeholder-stone-400 font-sans min-h-[70px] resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-1">
                    <button
                      disabled={submittingApproval}
                      onClick={() => handleDecision(approval.id, 'rejected')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded border border-[#EAE9E4] bg-white hover:bg-[#FCF1EE] text-[#B83C25] text-xs font-bold transition-all disabled:opacity-50 duration-150"
                    >
                      <ShieldX className="w-3.5 h-3.5" />
                      <span>{t('investigation', 'btnReject')}</span>
                    </button>
                    <button
                      disabled={submittingApproval}
                      onClick={() => handleDecision(approval.id, 'approved')}
                      className="flex items-center gap-1.5 px-4.5 py-2 rounded bg-[#C2593F] text-white hover:bg-[#A94A32] text-xs font-bold transition-all disabled:opacity-50 duration-150"
                    >
                      {submittingApproval ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      <span>{t('investigation', 'btnApprove')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Diagnostic Summary Block */}
          <div className="bg-white border border-[#EAE9E4] p-6 rounded space-y-4">
            <h4 className="text-base font-serif font-black text-[#1E2022] tracking-tight flex items-center gap-2">
              <Sliders className="w-4.5 h-4.5 text-[#C2593F]" />
              <span>{t('investigation', 'summary')}</span>
            </h4>
            <div className="p-4 bg-[#FBF8F0] border border-[#EAE9E4] rounded leading-relaxed">
              {investigation.summary ? (
                <p className="text-sm text-stone-700 leading-relaxed font-sans whitespace-pre-line">
                  {language === 'zh' ? translateFrom(translations.mockAlerts, investigation.summary, language, investigation.summary) : investigation.summary}
                </p>
              ) : (
                <div className="flex items-center gap-3 text-stone-500 text-sm font-mono italic">
                  {(investigation.status === 'created' || investigation.status === 'running') ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#C2593F]" />
                      <span>{language === 'zh' ? 'AI 安全协处理器正在分析关联网络行为日志，判定摘要实时生成中...' : 'AI Security coprocessor is analyzing event log chains...'}</span>
                    </>
                  ) : (
                    <span>{language === 'zh' ? '研判任务单建立就绪，待人工拉起流程...' : 'Investigation trace ready. Pending execution...'}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Polling indicator */}
          {(investigation.status === 'created' || investigation.status === 'running') && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded bg-[#FAF5E6] border border-[#EAE9E4] w-max">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C2593F] animate-pulse"></span>
              <span className="text-xs font-bold text-[#A37110] tracking-wider font-sans">
                {t('investigation', 'pollingText')}
              </span>
            </div>
          )}

          {/* Tabs selector */}
          <div className="space-y-4">
            <div className="flex border-b border-[#EAE9E4] select-none">
              <button
                onClick={() => setActivePanelTab('timeline')}
                className={`pb-3 text-xs font-bold tracking-wider border-b-2 px-4 transition-all flex items-center gap-2 ${
                  activePanelTab === 'timeline'
                    ? 'border-[#C2593F] text-[#C2593F] font-semibold'
                    : 'border-transparent text-[#6B6D70] hover:text-[#1E2022]'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>{language === 'zh' ? '分析行动时间线' : 'Timeline Trace Audit'}</span>
              </button>
              <button
                disabled={!report}
                onClick={() => setActivePanelTab('report')}
                className={`pb-3 text-xs font-bold tracking-wider border-b-2 px-4 transition-all flex items-center gap-2 ${
                  activePanelTab === 'report'
                    ? 'border-[#C2593F] text-[#C2593F] font-semibold'
                    : report
                      ? 'border-transparent text-[#6B6D70] hover:text-[#1E2022] cursor-pointer'
                      : 'border-transparent text-stone-300 cursor-not-allowed'
                }`}
                title={!report ? "研判未完成，暂无法查看报告" : "查看研判报告"}
              >
                <FileText className="w-4 h-4" />
                <span>{t('investigation', 'reportHeader')}</span>
                {report && (
                  <span className="w-1.5 h-1.5 rounded bg-[#25633A] animate-pulse"></span>
                )}
              </button>
            </div>

            {activePanelTab === 'timeline' ? (
              /* Timeline Node Flow */
              <div className="relative pl-6 space-y-6 border-l border-[#EAE9E4] ml-3.5">
                {timelineItems.length === 0 ? (
                  <div className="text-stone-400 text-sm italic font-sans py-4">
                    {language === 'zh'
                      ? '暂无可用时间线数据。AI 自动化研判编排启动后，工具链调用链审计细节将汇聚于此。'
                      : 'No timeline traces. Forensic analysis logs will be aggregated here once AI starts.'}
                  </div>
                ) : (
                  timelineItems.map((item, idx) => {
                    const styleConfig = {
                      agent_message: { icon: Cpu, color: 'bg-[#F5F3EB] text-stone-700 border-[#EAE9E4]' },
                      tool_call: { icon: Terminal, color: 'bg-[#F5F3EB] text-stone-700 border-[#EAE9E4]' },
                      tool_result: { icon: Code, color: 'bg-[#F0F6F1] text-[#25633A] border-[#EAE9E4]' },
                      approval_created: { icon: ShieldAlert, color: 'bg-[#FCF1EE] text-[#B83C25] border-[#EAE9E4]' },
                      approval_decision: { icon: CheckCircle, color: 'bg-[#F0F6F1] text-[#25633A] border-[#EAE9E4]' },
                      report_created: { icon: FileText, color: 'bg-[#F0F6F1] text-[#25633A] border-[#EAE9E4]' },
                      error: { icon: AlertTriangle, color: 'bg-[#FCF1EE] text-[#B83C25] border-[#EAE9E4]' },
                    }[item.type] || { icon: Terminal, color: 'bg-[#F5F3EB] text-stone-500 border-[#EAE9E4]' };

                    const Icon = styleConfig.icon;
                    const isExpandable = item.input !== null || item.output !== null;
                    const isItemExpanded = expandedItems[item.id] || false;

                    const typeName = t('investigation', `stepTypes.${item.type}`, item.type.replace('_', ' '));

                    return (
                      <div key={item.id} className="relative group">
                        {/* Visual node bullet */}
                        <div className={`absolute -left-9.5 top-1.5 w-6 h-6 rounded-full flex items-center justify-center border z-10 ${styleConfig.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>

                        {/* Timeline card */}
                        <div className="bg-white border border-[#EAE9E4] p-5 rounded space-y-3">
                          {/* Node Header */}
                          <div className="flex flex-col md:flex-row gap-2 justify-between items-start md:items-center">
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-stone-500 tracking-widest block">
                                {t('investigation', 'step')} {idx + 1} • {typeName}
                                {item.tool_name && ` (${item.tool_name})`}
                              </span>
                              <h4 className="text-base font-bold text-stone-850 tracking-tight leading-none pt-0.5">
                                {item.title}
                              </h4>
                            </div>
                            <span className="text-xs font-mono text-stone-400">
                              {new Date(item.created_at).toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', { hour12: false })}
                            </span>
                          </div>

                          {/* Content Description */}
                          <p className="text-sm text-stone-600 leading-relaxed font-sans whitespace-pre-line leading-5">
                            {item.content}
                          </p>

                          {/* Collapsible Inputs & Outputs */}
                          {isExpandable && (
                            <div className="pt-1">
                              <button
                                onClick={() => toggleExpandItem(item.id)}
                                className="flex items-center gap-1 text-xs font-bold font-mono text-[#C2593F] hover:text-[#A94A32] transition-colors uppercase select-none"
                              >
                                <span>{t('investigation', isItemExpanded ? 'hideLogs' : 'viewLogs')}</span>
                                {isItemExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>

                              {isItemExpanded && (
                                <div className="mt-2.5 space-y-2.5 border-t border-[#EAE9E4] pt-2.5 font-mono text-xs">
                                  {item.input && (
                                    <div className="p-3 bg-[#FBF8F0] border border-[#EAE9E4] rounded relative">
                                      <span className="absolute right-3.5 top-3.5 text-[8px] font-bold text-stone-400 uppercase tracking-widest">INPUT ARGS</span>
                                      <pre className="text-stone-700 overflow-x-auto max-h-40 leading-relaxed text-xs">
                                        {JSON.stringify(item.input, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {item.output && (
                                    <div className="p-3 bg-[#FBF8F0] border border-[#EAE9E4] rounded relative">
                                      <span className="absolute right-3.5 top-3.5 text-[8px] font-bold text-stone-400 uppercase tracking-widest">OUTPUT VAL</span>
                                      <pre className="text-stone-700 overflow-x-auto max-h-56 leading-relaxed text-xs">
                                        {JSON.stringify(item.output, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Markdown Report Panel */
              report ? (
                <div className="animate-[fadeIn_0.15s_ease-out]">
                  <ReportPreview report={report} />
                </div>
              ) : (
                <div className="bg-white border border-[#EAE9E4] p-10 rounded text-center flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 text-[#C2593F] animate-spin" />
                  <span className="text-sm text-stone-500 font-mono">
                    {language === 'zh' ? '正在拉取已持久化的 Markdown 安全事件研判报告...' : 'Retrieving Markdown Incident Investigation report...'}
                  </span>
                </div>
              )
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

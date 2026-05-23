'use client';

import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Shield,
  Activity,
  Workflow,
  Cpu
} from 'lucide-react';
import { Report } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { getTranslationEntry, translations, translateFrom } from '@/lib/translations';

const categoryNames: Record<string, { zh: string; en: string }> = {
  credential_access: { zh: '凭据盗取与破解', en: 'Credential Access' },
  execution: { zh: '恶意命令与脚本执行', en: 'Command & Script Execution' },
  web_intrusion: { zh: 'Web 漏洞入侵后门', en: 'Web Intrusion' },
  command_and_control: { zh: '命令控制信道通信', en: 'Command & Control' },
  lateral_movement: { zh: '内网横向移动渗透', en: 'Lateral Movement' },
  data_exfiltration: { zh: '敏感业务数据外泄', en: 'Data Exfiltration' },
  false_positive: { zh: '研发测试业务误报', en: 'Benign False Positive' }
};

const translateReportLine = (line: string, language: string): string => {
  if (language !== 'zh') return line;

  let translated = line;

  // 1. Translate exact mock alerts or summaries
  const trimmed = line.trim();
  const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
  if (bulletMatch) {
    const textContent = bulletMatch[1];
    const mockTranslation = getTranslationEntry(translations.mockAlerts, textContent);
    if (mockTranslation?.zh) {
      return line.replace(textContent, mockTranslation.zh);
    }
  } else {
    const mockTranslation = getTranslationEntry(translations.mockAlerts, trimmed);
    if (mockTranslation?.zh) {
      return mockTranslation.zh;
    }
  }

  // 2. Specific headers and field key-value pairs in Alert Details section
  if (translated.startsWith('- Alert ID:')) {
    translated = translated.replace('- Alert ID:', '- 告警 ID:');
  } else if (translated.startsWith('- Title:')) {
    const titleVal = translated.replace('- Title:', '').trim();
    const transTitle = translateFrom(translations.mockAlerts, titleVal, 'zh', titleVal);
    translated = `- 告警标题: ${transTitle}`;
  } else if (translated.startsWith('- Source:')) {
    translated = translated.replace('- Source:', '- 设备源:');
  } else if (translated.startsWith('- Severity:')) {
    const sevVal = translated.replace('- Severity:', '').trim().toLowerCase();
    const transSev = translateFrom(translations.alerts.severity, sevVal, 'zh', sevVal.toUpperCase());
    translated = `- 严重级别: ${transSev}`;
  } else if (translated.startsWith('- Category:')) {
    const catVal = translated.replace('- Category:', '').trim();
    const transCat = categoryNames[catVal]?.zh || catVal;
    translated = `- 资产分类: ${transCat}`;
  }

  // 3. Section 6: Impact Assessment
  const impactMatch = translated.match(/Severity is assessed as (\w+) based on normalized evidence\./i);
  if (impactMatch) {
    const sevVal = impactMatch[1].toLowerCase();
    const transSev = translateFrom(translations.alerts.severity, sevVal, 'zh', sevVal.toUpperCase());
    translated = `基于归一化取证证据，威胁严重级别评估为 ${transSev}。`;
  }

  // 4. Section 7: Response Recommendations
  if (translated.includes('Review response actions in approval records before simulated execution.')) {
    translated = translated.replace('Review response actions in approval records before simulated execution.', '在执行模拟处置前，请在审批记录中审计安全防护响应动作。');
  }

  // 5. Section 9: Hardening Recommendations
  if (translated.includes('Review affected accounts, hosts, and network controls.')) {
    translated = translated.replace('Review affected accounts, hosts, and network controls.', '评估受波及的账户、主机及网络访问控制策略。');
  }
  if (translated.includes('Tune detections with confirmed evidence from this investigation.')) {
    translated = translated.replace('Tune detections with confirmed evidence from this investigation.', '使用此项调查确证的取证证据微调及优化关联检测规则。');
  }
  if (translated.includes('Keep all response actions simulated until enterprise integration is approved.')) {
    translated = translated.replace('Keep all response actions simulated until enterprise integration is approved.', '在企业级响应策略授权集成获批前，保持所有处置动作为模拟状态。');
  }

  // 6. Section 8: Approval History & Timeline & Evidence Fallbacks
  if (translated.includes('No approval records were required.')) {
    translated = translated.replace('No approval records were required.', '本次研判未触发高危响应动作，无需人工授权审批。');
  }
  if (translated.includes('No explicit evidence IDs were captured.')) {
    translated = translated.replace('No explicit evidence IDs were captured.', '未捕获到显式取证证据 ID 记录。');
  }
  if (translated.includes('No confident MITRE mapping.')) {
    translated = translated.replace('No confident MITRE mapping.', '未映射到明确的 MITRE ATT&CK 战术。');
  }
  if (translated.includes('No timeline events recorded.')) {
    translated = translated.replace('No timeline events recorded.', '未记录到任何时间线事件。');
  }

  // 7. Timeline summary in Section 3
  const timelineSummaryMatch = translated.match(/^-\s+(\w+):\s+(.+)$/);
  if (timelineSummaryMatch) {
    const stepType = timelineSummaryMatch[1];
    const stepTitle = timelineSummaryMatch[2];
    const stepTypeObj = getTranslationEntry(translations.investigation.stepTypes, stepType);
    const transType = stepTypeObj?.zh || stepType;
    const transTitle = translateFrom(translations.mockAlerts, stepTitle, 'zh', stepTitle);
    translated = `- ${transType}: ${transTitle}`;
  }

  // 8. Approval History in Section 8
  const approvalMatch = translated.match(/^-\s+(\w+)\s+([^\s:]+):\s+(\w+)$/);
  if (approvalMatch) {
    const actType = approvalMatch[1];
    const target = approvalMatch[2];
    const status = approvalMatch[3];
    const actTypeObj = getTranslationEntry(translations.investigation.actionTypes, actType);
    const transAct = actTypeObj?.zh || actType;

    let transStatus = status;
    if (status === 'pending') transStatus = '待审批';
    else if (status === 'approved') transStatus = '已批准';
    else if (status === 'rejected') transStatus = '已驳回';

    translated = `- ${transAct} [ ${target} ]: ${transStatus}`;
  }

  return translated;
};

interface ReportPreviewProps {
  report: Report;
}

export default function ReportPreview({ report }: ReportPreviewProps) {
  const { language, t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy report", err);
    }
  };

  // Parse markdown content into structured sections
  const parseSections = (markdown: string) => {
    const lines = markdown.split('\n');
    const sections: { title: string; key: string; content: string[] }[] = [];
    let currentSection = { title: 'Overview', key: 'intro', content: [] as string[] };

    const sectionMap: Record<string, string> = {
      'Executive Summary': 'summary',
      'Alert Details': 'alert',
      'Investigation Steps': 'steps',
      'Evidence Chain': 'evidence',
      'MITRE ATT&CK Mapping': 'mitre',
      'Impact Assessment': 'impact',
      'Response Recommendations': 'response',
      'Approval History': 'approval',
      'Hardening Recommendations': 'hardening'
    };

    lines.forEach(line => {
      const headerMatch = line.match(/^##\s+(.+)$/);
      if (headerMatch) {
        if (currentSection.content.some(l => l.trim() !== '')) {
          sections.push({ ...currentSection });
        }

        const title = headerMatch[1].trim();
        // Strip numbers from title for matching (e.g. "1. Executive Summary" -> "Executive Summary")
        const cleanTitleKey = title.replace(/^\d+\.\s*/, '');
        const key = sectionMap[cleanTitleKey] || title.toLowerCase().replace(/\s+/g, '_');
        currentSection = { title, key, content: [] };
      } else {
        if (!line.startsWith('# ')) {
          currentSection.content.push(line);
        }
      }
    });

    if (currentSection.content.some(l => l.trim() !== '')) {
      sections.push(currentSection);
    }

    return sections;
  };

  const sections = parseSections(report.content);

  const renderLineContent = (rawLine: string) => {
    const line = translateReportLine(rawLine, language);
    if (line.startsWith('### ')) {
      return (
        <h4 className="text-sm font-semibold text-[#1E2022] mt-5 mb-2.5 tracking-tight font-serif">
          {line.replace('### ', '')}
        </h4>
      );
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const bulletText = line.substring(2);
      return (
        <li className="text-sm text-[#2A2B2D] leading-relaxed list-disc list-inside ml-2 my-1.5 font-sans">
          {highlightIdentifiers(bulletText)}
        </li>
      );
    }

    if (line.match(/^\|/)) {
      return (
        <div className="font-mono text-xs text-[#1E2022] leading-relaxed bg-[#FBF8F0] p-2 px-3 rounded border border-[#EAE9E4] my-1 whitespace-pre overflow-x-auto">
          {line}
        </div>
      );
    }

    if (line.trim() === '') return <div className="h-2.5"></div>;

    return (
      <p className="text-sm text-[#2A2B2D] leading-relaxed my-2 font-sans">
        {highlightIdentifiers(line)}
      </p>
    );
  };

  const highlightIdentifiers = (text: string) => {
    const regex = /(evt_[a-zA-Z0-9_]+|T\d{4}(?:\.\d{3})?)/g;
    const parts = text.split(regex);
    if (parts.length === 1) return text;

    return parts.map((part, i) => {
      if (part.startsWith('evt_')) {
        return (
          <span
            key={i}
            className="font-mono font-medium px-1.5 py-0.5 rounded bg-[#FBF8F0] border border-[#EAE9E4] text-[#C2593F] text-xs select-all cursor-pointer hover:bg-[#F5F3EB] hover:text-[#B83C25] transition-colors"
            title="Click to copy event ID"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(part);
            }}
          >
            {part}
          </span>
        );
      }
      if (part.match(/^T\d{4}/)) {
        return (
          <span
            key={i}
            className="font-mono font-medium px-1.5 py-0.5 rounded bg-[#FCF5EE] border border-[#F3EBE1] text-[#C2593F] text-xs"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="glass-panel rounded flex flex-col h-[700px] bg-white overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[#EAE9E4] flex justify-between items-center bg-[#FAFAF8]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#FCF5EE] border border-[#F3EBE1] flex items-center justify-center text-[#C2593F]">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1E2022] tracking-wider font-serif">
              {t('investigation', 'reportHeader')}
            </h3>
            <span className="text-[11px] font-mono text-[#6B6D70] uppercase tracking-widest block mt-0.5">
              {language === 'zh' ? 'SentinelPilot 安全事件研判分析报告' : 'SentinelPilot Incident Investigation Report'}
            </span>
          </div>
        </div>

        {/* Copy Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#EAE9E4] hover:border-[#D1CDC2] hover:bg-[#F5F3EB] text-[#4A4B4D] hover:text-[#1E2022] bg-white transition-all cursor-pointer font-mono text-xs font-medium"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#B83C25]" />
                <span className="text-[#B83C25] font-semibold">{language === 'zh' ? '已复制' : 'Copied'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#6B6D70]" />
                <span>{t('investigation', 'copyBtn')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[#EAE9E4] bg-[#FCFAF6] overflow-x-auto custom-scrollbar select-none">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4.5 py-3 text-xs font-semibold font-mono uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'all'
              ? 'border-[#C2593F] text-[#C2593F] bg-[#FCF5EE]/40'
              : 'border-transparent text-[#6B6D70] hover:text-[#1E2022] hover:bg-[#F5F3EB]/30'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{t('report', 'Full Report')}</span>
        </button>
        {sections.map(sec => {
          const Icon = {
            summary: Shield,
            alert: Cpu,
            evidence: Workflow,
            mitre: FileText,
          }[sec.key] || FileText;

          const cleanTitle = sec.title.replace(/^\d+\.\s*/, '');

          return (
            <button
              key={sec.key}
              onClick={() => setActiveTab(sec.key)}
              className={`px-4.5 py-3 text-xs font-semibold font-mono uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === sec.key
                  ? 'border-[#C2593F] text-[#C2593F] bg-[#FCF5EE]/40'
                  : 'border-transparent text-[#6B6D70] hover:text-[#1E2022] hover:bg-[#F5F3EB]/30'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t('report', cleanTitle, sec.title)}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6.5 space-y-6 bg-white leading-relaxed">
        {activeTab === 'all' ? (
          sections.map(sec => {
            const cleanTitle = sec.title.replace(/^\d+\.\s*/, '');
            return (
              <div key={sec.key} className="space-y-3.5 border-b border-[#EAE9E4]/60 pb-6 last:border-b-0 last:pb-0">
                <h3 className="text-sm font-semibold text-[#C2593F] uppercase tracking-wider font-mono flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C2593F]"></span>
                  <span>{t('report', cleanTitle, sec.title)}</span>
                </h3>
                <div className="pl-3.5 space-y-1">
                  {sec.content.map((line, idx) => (
                    <React.Fragment key={idx}>
                      {renderLineContent(line)}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          sections
            .filter(sec => sec.key === activeTab)
            .map(sec => {
              const cleanTitle = sec.title.replace(/^\d+\.\s*/, '');
              return (
                <div key={sec.key} className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#C2593F] uppercase tracking-wider font-serif flex items-center gap-2 border-b border-[#EAE9E4] pb-3">
                    <span className="w-1.5 h-1.5 rounded bg-[#C2593F]"></span>
                    <span>{t('report', cleanTitle, sec.title)}</span>
                  </h3>
                  <div className="pl-1.5 space-y-1.5">
                    {sec.content.map((line, idx) => (
                      <React.Fragment key={idx}>
                        {renderLineContent(line)}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}

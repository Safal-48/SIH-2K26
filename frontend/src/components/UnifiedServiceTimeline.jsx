import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
  Building2,
  GraduationCap,
  Landmark,
  FileCheck,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight
} from 'lucide-react';

/**
 * Stage Metadata Configuration
 * Strict citizen-facing information: no technical jargon, no internal codes.
 */
const STAGE_CONFIG = {
  APPLICATION_RECEIVED: {
    order: 1,
    name: '1. Application Submitted',
    shortName: 'Application Submitted',
    department: 'Civil Registration Grid',
    icon: FileCheck,
    defaultMessage: 'Application details and identity records registered in the National Service Grid.',
  },
  EDUCATION_VERIFICATION: {
    order: 2,
    name: '2. Education Verification',
    shortName: 'Education Verification',
    department: 'Department of Higher Education',
    icon: GraduationCap,
    defaultMessage: 'Academic enrollment, degree course, and institution credentials verified electronically.',
  },
  INCOME_VERIFICATION: {
    order: 3,
    name: '3. Income Verification',
    shortName: 'Income Verification',
    department: 'Revenue & Land Administration Department',
    icon: Landmark,
    defaultMessage: 'Annual household income certificate authenticated with the Revenue Department.',
  },
  BANK_VERIFICATION: {
    order: 4,
    name: '4. Bank Verification',
    shortName: 'Bank Verification',
    department: 'Public Financial Management & DBT Mission',
    icon: Building2,
    defaultMessage: 'Bank account holder match and active Direct Benefit Transfer (DBT) mandate verified.',
  },
  ELIGIBILITY_CHECK: {
    order: 5,
    name: '5. Eligibility Check',
    shortName: 'Eligibility Check',
    department: 'Scholarship Evaluation Board',
    icon: ShieldCheck,
    defaultMessage: 'Automated evaluation of composite academic, income, and banking criteria against scheme guidelines.',
  },
  OFFICER_APPROVAL: {
    order: 6,
    name: '6. Officer Approval',
    shortName: 'Officer Approval',
    department: 'State Nodal Sanction Authority',
    icon: Award,
    defaultMessage: 'Administrative review and welfare officer sanction approval granted.',
  },
  COMPLETION: {
    order: 7,
    name: '7. Completion',
    shortName: 'Completion',
    department: 'Direct Benefit Transfer Cell',
    icon: Sparkles,
    defaultMessage: 'Scholarship sanctioned and approved for electronic direct benefit disbursement.',
  },
};

/**
 * Format timestamp nicely for citizens
 * e.g. "27 Sep 2026, 12:45 PM"
 */
function formatTimestamp(isoString) {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return null;
  }
}

/**
 * Map raw backend workflow state to citizen-friendly label
 * Standard PRD status label taxonomy:
 * - Verified
 * - Pending
 * - Failed
 * - Retrying
 * - Queued
 * - Completed
 * - SLA Breach
 */
function getCitizenLabel(stepIdentifier, rawStatus) {
  const statusUpper = (rawStatus || 'PENDING').toUpperCase();

  if (statusUpper === 'SUCCESS' || statusUpper === 'COMPLETED') {
    if (stepIdentifier === 'COMPLETION') {
      return 'Completed';
    }
    return 'Verified';
  }

  if (statusUpper === 'SLA_BREACH' || statusUpper === 'BREACHED' || statusUpper === 'SLA BREACH') {
    return 'SLA Breach';
  }

  if (statusUpper === 'RETRYING') {
    return 'Retrying';
  }

  if (statusUpper === 'QUEUED') {
    return 'Queued';
  }

  if (statusUpper === 'FAILED') {
    return 'Failed';
  }

  if (statusUpper === 'RUNNING') {
    return 'Pending';
  }

  return 'Pending';
}

/**
 * Return citizen-friendly guidance message
 * Guarantees zero exposure of correlation IDs, retry counts, or technical stack traces.
 */
function getCitizenMessage(stepIdentifier, rawStatus, backendMessage) {
  const statusUpper = (rawStatus || 'PENDING').toUpperCase();

  // If backend provided a sanitized basic_message that does not leak technical info, use it
  if (backendMessage && typeof backendMessage === 'string' && !backendMessage.includes('Error') && !backendMessage.includes('50') && !backendMessage.includes('CORR-')) {
    return backendMessage;
  }

  if (stepIdentifier === 'BANK_VERIFICATION') {
    if (statusUpper === 'FAILED' || statusUpper === 'QUEUED') {
      return 'Bank verification encountered a temporary network delay. You can retry verification now without resubmitting your application.';
    }
    if (statusUpper === 'RETRYING' || statusUpper === 'RUNNING') {
      return 'Connecting to banking network to confirm account readiness and active DBT mandate...';
    }
    if (statusUpper === 'SUCCESS' || statusUpper === 'COMPLETED') {
      return 'Bank account verified and active for Direct Benefit Transfer (DBT).';
    }
    return 'Scheduled to verify Direct Benefit Transfer (DBT) bank account.';
  }

  if (stepIdentifier === 'EDUCATION_VERIFICATION') {
    if (statusUpper === 'FAILED') {
      return 'Academic enrollment credentials could not be authenticated. Please review your student ID.';
    }
    if (statusUpper === 'RUNNING' || statusUpper === 'RETRYING') {
      return 'Verifying student enrollment credentials with higher education authorities...';
    }
    if (statusUpper === 'SUCCESS' || statusUpper === 'COMPLETED') {
      return 'Academic enrollment and student credentials verified with the State Higher Education Council.';
    }
    return 'Scheduled to verify student enrollment records.';
  }

  if (stepIdentifier === 'INCOME_VERIFICATION') {
    if (statusUpper === 'FAILED') {
      return 'Income certificate could not be authenticated with the Revenue Department.';
    }
    if (statusUpper === 'RUNNING' || statusUpper === 'RETRYING') {
      return 'Authenticating income certificate with the Revenue & Land Administration Department...';
    }
    if (statusUpper === 'SUCCESS' || statusUpper === 'COMPLETED') {
      return 'Annual family income certificate authenticated with the Revenue Department.';
    }
    return 'Scheduled to verify family income certificate.';
  }

  if (stepIdentifier === 'ELIGIBILITY_CHECK') {
    if (statusUpper === 'FAILED') {
      return 'Application criteria did not meet current scholarship scheme guidelines.';
    }
    if (statusUpper === 'RUNNING') {
      return 'Evaluating composite eligibility criteria across education, income, and banking credentials...';
    }
    if (statusUpper === 'SUCCESS' || statusUpper === 'COMPLETED') {
      return 'Composite scheme eligibility criteria evaluated and confirmed.';
    }
    return 'Scheduled to evaluate scheme eligibility criteria.';
  }

  if (stepIdentifier === 'OFFICER_APPROVAL') {
    if (statusUpper === 'FAILED') {
      return 'Administrative sanction review pending clarification.';
    }
    if (statusUpper === 'RUNNING') {
      return 'Under administrative review by the scholarship sanction authority...';
    }
    if (statusUpper === 'SUCCESS' || statusUpper === 'COMPLETED') {
      return 'Administrative review completed and approved by the sanction authority.';
    }
    return 'Scheduled for sanction officer review.';
  }

  if (stepIdentifier === 'COMPLETION') {
    if (statusUpper === 'SUCCESS' || statusUpper === 'COMPLETED') {
      return 'Scholarship successfully sanctioned and approved for electronic benefit transfer.';
    }
    if (statusUpper === 'RUNNING') {
      return 'Finalizing electronic sanction order and disbursal mandate...';
    }
    return 'Scheduled for final disbursement.';
  }

  // Stage 1 Application Submitted
  if (statusUpper === 'SUCCESS' || statusUpper === 'COMPLETED') {
    return 'Application details recorded and verified in the National Service Grid.';
  }
  return 'Application details submitted for verification.';
}

/**
 * Visual styling configuration for each visual state
 */
function getVisualStateStyles(rawStatus, citizenLabel) {
  const statusUpper = (rawStatus || 'PENDING').toUpperCase();

  switch (statusUpper) {
    case 'SUCCESS':
    case 'COMPLETED':
      return {
        dotBg: 'bg-emerald-500 ring-4 ring-emerald-500/20 text-white shadow-lg shadow-emerald-500/30',
        badgeBg: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
        badgeIcon: CheckCircle2,
        cardBorder: 'border-emerald-500/30 bg-slate-900/80 hover:border-emerald-500/50 shadow-lg',
        indicator: 'completed',
      };

    case 'RUNNING':
      return {
        dotBg: 'bg-teal-500 ring-4 ring-teal-500/20 text-white animate-pulse shadow-lg shadow-teal-500/30',
        badgeBg: 'bg-teal-500/15 text-teal-300 border border-teal-500/30',
        badgeIcon: Loader2,
        badgeIconAnimate: 'animate-spin',
        cardBorder: 'border-teal-500/40 bg-teal-950/20 shadow-lg',
        indicator: 'running',
      };

    case 'RETRYING':
      return {
        dotBg: 'bg-amber-500 ring-4 ring-amber-500/20 text-white shadow-lg shadow-amber-500/30',
        badgeBg: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
        badgeIcon: RefreshCw,
        badgeIconAnimate: 'animate-spin',
        cardBorder: 'border-amber-500/30 bg-amber-950/20 shadow-lg',
        indicator: 'retrying',
      };

    case 'QUEUED':
      return {
        dotBg: 'bg-amber-500 ring-4 ring-amber-500/20 text-white',
        badgeBg: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
        badgeIcon: Clock,
        cardBorder: 'border-amber-500/30 bg-amber-950/20 shadow-lg',
        indicator: 'queued',
      };

    case 'FAILED':
      return {
        dotBg: 'bg-rose-500 ring-4 ring-rose-500/20 text-white shadow-lg shadow-rose-500/30',
        badgeBg: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
        badgeIcon: AlertCircle,
        cardBorder: 'border-rose-500/30 bg-rose-950/25 shadow-lg',
        indicator: 'failed',
      };

    case 'SLA_BREACH':
    case 'BREACHED':
    case 'SLA BREACH':
      return {
        dotBg: 'bg-rose-600 ring-4 ring-rose-600/20 text-white shadow-lg shadow-rose-600/30',
        badgeBg: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
        badgeIcon: AlertCircle,
        cardBorder: 'border-rose-500/40 bg-rose-950/30 shadow-lg',
        indicator: 'failed',
      };

    case 'PENDING':
    default:
      return {
        dotBg: 'bg-slate-800 ring-4 ring-white/5 text-slate-400',
        badgeBg: 'bg-slate-800/80 text-slate-400 border border-white/10',
        badgeIcon: Clock,
        cardBorder: 'border-white/10 bg-slate-900/60',
        indicator: 'pending',
      };
  }
}

/**
 * UnifiedServiceTimeline Component
 * 
 * Props:
 * - timeline: Array of stage objects from backend
 * - onRetry: Function to trigger workflow resume / retry
 * - isRetrying: Boolean loading state for retry
 * - canRetry: Boolean whether retry is allowed
 */
export default function UnifiedServiceTimeline({
  timeline = [],
  onRetry,
  isRetrying = false,
  canRetry = true,
}) {
  // Normalize input into 7 fixed sequential stages
  const stepIdentifiers = [
    'APPLICATION_RECEIVED',
    'EDUCATION_VERIFICATION',
    'INCOME_VERIFICATION',
    'BANK_VERIFICATION',
    'ELIGIBILITY_CHECK',
    'OFFICER_APPROVAL',
    'COMPLETION',
  ];

  // Index timeline items by step_identifier or step_number
  const timelineMap = new Map();
  if (Array.isArray(timeline)) {
    timeline.forEach((item) => {
      if (item.step_identifier) {
        timelineMap.set(item.step_identifier, item);
      }
      if (item.step_number) {
        timelineMap.set(String(item.step_number), item);
      }
    });
  }

  // Compute progress
  let completedCount = 0;
  let hasFailure = false;
  let failedStage = null;

  const normalizedStages = stepIdentifiers.map((id, index) => {
    const stageMeta = STAGE_CONFIG[id];
    const rawRecord = timelineMap.get(id) || timelineMap.get(String(index + 1)) || {};

    const rawStatus = (rawRecord.status || 'PENDING').toUpperCase();
    const citizenLabel = rawRecord.citizen_status || getCitizenLabel(id, rawStatus);
    const basicMessage = getCitizenMessage(id, rawStatus, rawRecord.basic_message);
    const timestamp = rawRecord.completed_at || rawRecord.started_at;
    const styles = getVisualStateStyles(rawStatus, citizenLabel);

    if (rawStatus === 'SUCCESS' || rawStatus === 'COMPLETED') {
      completedCount++;
    } else if (rawStatus === 'FAILED' || rawStatus === 'QUEUED' || rawStatus === 'SLA_BREACH' || rawStatus === 'BREACHED') {
      hasFailure = true;
      if (!failedStage) {
        failedStage = { id, name: stageMeta.shortName, message: basicMessage };
      }
    }

    return {
      id,
      order: index + 1,
      name: stageMeta.name,
      shortName: stageMeta.shortName,
      department: stageMeta.department,
      Icon: stageMeta.icon,
      rawStatus,
      citizenLabel,
      basicMessage,
      timestamp,
      styles,
    };
  });

  const progressPercent = Math.round((completedCount / 7) * 100);

  return (
    <div className="glass-card border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
      {/* 1. Header & Progress Overview */}
      <div className="space-y-3 pb-5 border-b border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
              <Clock className="w-5 h-5 text-teal-400" />
              <span>Unified Service Verification Timeline</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Authoritative inter-departmental verification checkpoints for your scholarship
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start sm:self-auto">
            <span className="text-xs font-bold text-teal-300 bg-teal-500/15 border border-teal-500/30 px-3 py-1 rounded-full font-mono">
              {completedCount} of 7 Stages Complete ({progressPercent}%)
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-white/5">
          <div
            className={`h-full transition-all duration-500 ${
              hasFailure
                ? 'bg-amber-400'
                : completedCount === 7
                ? 'bg-emerald-400'
                : 'bg-teal-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2. Failure Recovery Banner (If Bank or any stage is FAILED or QUEUED) */}
      {hasFailure && (
        <div className="glass-card bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-300">
                Temporary Verification Notice: {failedStage?.name || 'Bank Verification'}
              </h4>
              <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
                {failedStage?.message || 'We encountered a temporary network response delay. Your previous verified stages are preserved. You do not need to resubmit.'}
              </p>
            </div>
          </div>

          {canRetry && onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="shrink-0 inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-900/40 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Resuming Verification...' : 'Retry Verification Now'}</span>
            </button>
          )}
        </div>
      )}

      {/* 3. The 7 Timeline Stages */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-white/10">
        {normalizedStages.map((stage) => {
          const { styles, Icon } = stage;
          const BadgeIcon = styles.badgeIcon;
          const formattedTime = formatTimestamp(stage.timestamp);

          return (
            <div key={stage.id} className="relative group">
              {/* Node Icon on vertical timeline wire */}
              <div
                className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all ${styles.dotBg}`}
              >
                {styles.indicator === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : styles.indicator === 'failed' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : styles.indicator === 'running' || styles.indicator === 'retrying' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span className="text-[10px] font-bold">{stage.order}</span>
                )}
              </div>

              {/* Stage Card */}
              <div
                className={`border rounded-xl p-4 sm:p-5 transition-all duration-200 ${styles.cardBorder}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-teal-300">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-white text-sm sm:text-base">
                      {stage.name}
                    </h4>
                  </div>

                  {/* Citizen-Friendly Status Badge */}
                  <span
                    className={`inline-flex items-center self-start sm:self-auto text-xs font-semibold px-2.5 py-1 rounded-md border ${styles.badgeBg}`}
                  >
                    <BadgeIcon className={`w-3.5 h-3.5 mr-1.5 ${styles.badgeIconAnimate || ''}`} />
                    <span>{stage.citizenLabel}</span>
                  </span>
                </div>

                {/* Citizen-Friendly Narrative Message */}
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {stage.basicMessage}
                </p>

                {/* Stage Metadata Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/10 text-[11px] text-slate-400">
                  <span className="font-medium text-slate-300">
                    Authority: {stage.department}
                  </span>

                  {formattedTime && (
                    <span className="text-slate-400 font-mono">
                      {styles.indicator === 'completed' ? 'Verified on: ' : 'Updated: '}
                      {formattedTime}
                    </span>
                  )}
                </div>

                {/* Specific Inline Retry Button if this specific stage is FAILED/QUEUED */}
                {(stage.rawStatus === 'FAILED' || stage.rawStatus === 'QUEUED') && canRetry && onRetry && (
                  <div className="mt-3 pt-3 border-t border-rose-500/20 flex items-center justify-between">
                    <span className="text-[11px] text-rose-300 font-medium">
                      Previous verification steps remain safe and verified.
                    </span>
                    <button
                      onClick={onRetry}
                      disabled={isRetrying}
                      className="inline-flex items-center space-x-1 text-xs font-bold text-teal-300 hover:text-white bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                      <span>Retry {stage.shortName}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, AlertTriangle, Clock, CheckCircle, XCircle, Bot, Copy, Check, RefreshCw } from 'lucide-react'
import { cases } from '../api'
import AddCaseModal from '../components/AddCaseModal'
import { formatDistanceToNow, parseISO } from 'date-fns'

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  submitted:    { label: 'Submitted',    color: 'bg-gray-100 border-gray-300',   text: 'text-gray-600' },
  pending:      { label: 'Pending UW',   color: 'bg-blue-50 border-blue-200',    text: 'text-blue-700' },
  requirements: { label: 'Requirements', color: 'bg-red-50 border-red-300',      text: 'text-red-700' },
  approved:     { label: 'Approved',     color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  delivery:     { label: 'Delivery',     color: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
  placed:       { label: 'Placed ✓',     color: 'bg-green-50 border-green-300',  text: 'text-green-700' },
  nto:          { label: 'NTO',          color: 'bg-orange-50 border-orange-300', text: 'text-orange-700' },
  declined:     { label: 'Declined',     color: 'bg-red-100 border-red-400',     text: 'text-red-800' },
  postponed:    { label: 'Postponed',    color: 'bg-yellow-50 border-yellow-300', text: 'text-yellow-700' },
}

const RISK_CONFIG = {
  low:      { label: 'Low',      bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  medium:   { label: 'Medium',   bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  high:     { label: 'High',     bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  critical: { label: 'Critical', bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
}

const KANBAN_STAGES = ['submitted', 'pending', 'requirements', 'approved', 'delivery']
const TERMINAL_STAGES = ['placed', 'nto', 'declined', 'postponed']

function fmt(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Cases() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [selectedCase, setSelectedCase] = useState(null)
  const [staleOnly, setStaleOnly] = useState(false)

  const { data: allCases = [], isLoading } = useQuery({
    queryKey: ['cases', staleOnly],
    queryFn: () => cases.list({ stale_only: staleOnly }),
  })

  const { data: metrics } = useQuery({
    queryKey: ['case-metrics'],
    queryFn: cases.metrics,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => cases.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cases'] })
      qc.invalidateQueries({ queryKey: ['case-metrics'] })
      if (selectedCase) {
        const updated = allCases.find(c => c.id === selectedCase.id)
        if (updated) setSelectedCase(updated)
      }
    },
  })

  const byStatus = (status) => allCases.filter(c => c.status === status)
  const m = metrics || {}

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pending Cases</h1>
              <p className="text-gray-500 mt-1">Track life applications from submission to placement</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={staleOnly} onChange={e => setStaleOnly(e.target.checked)} className="rounded" />
                Stale only
              </label>
              <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
                <Plus size={16} /> Add Case
              </button>
            </div>
          </div>

          {/* Metrics bar */}
          <div className="grid grid-cols-6 gap-3 mb-4">
            <MetricChip label="Active" value={m.total_active ?? 0} color="blue" />
            <MetricChip label="Requirements" value={m.in_requirements ?? 0} color="red" alert />
            <MetricChip label="Stale" value={m.stale_cases ?? 0} color="orange" alert={m.stale_cases > 0} />
            <MetricChip label="Critical" value={m.critical_cases ?? 0} color="red" alert={m.critical_cases > 0} />
            <MetricChip label="Placement Rate" value={`${m.placement_rate ?? 0}%`} color="green" />
            <MetricChip label="Premium at Risk" value={fmt(m.active_premium_at_risk)} color="purple" />
          </div>
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto px-8 pb-8">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="flex gap-4 h-full min-w-max">
              {KANBAN_STAGES.map(status => {
                const cols = STATUS_CONFIG[status]
                const stageCases = byStatus(status)
                return (
                  <div key={status} className={`w-64 rounded-xl border-2 ${cols.color} flex flex-col`} style={{ maxHeight: 'calc(100vh - 260px)' }}>
                    <div className="px-3 py-2.5 shrink-0">
                      <div className="flex items-center justify-between">
                        <p className={`font-semibold text-sm ${cols.text}`}>{cols.label}</p>
                        <span className="bg-white text-gray-500 text-xs font-bold px-1.5 py-0.5 rounded-full border">
                          {stageCases.length}
                        </span>
                      </div>
                      {status === 'requirements' && stageCases.length > 0 && (
                        <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                          <AlertTriangle size={10} /> Needs immediate action
                        </p>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                      {stageCases.map(c => (
                        <CaseCard
                          key={c.id}
                          case={c}
                          selected={selectedCase?.id === c.id}
                          onClick={() => setSelectedCase(c.id === selectedCase?.id ? null : c)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Terminal statuses column */}
              <div className="w-64 rounded-xl border-2 bg-gray-50 border-gray-200 flex flex-col" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                <div className="px-3 py-2.5 shrink-0">
                  <p className="font-semibold text-sm text-gray-500">Closed</p>
                  <p className="text-xs text-gray-400">Placed · NTO · Declined · Postponed</p>
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                  {TERMINAL_STAGES.flatMap(s => byStatus(s)).map(c => (
                    <CaseCard
                      key={c.id}
                      case={c}
                      selected={selectedCase?.id === c.id}
                      onClick={() => setSelectedCase(c.id === selectedCase?.id ? null : c)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedCase && (
        <CaseDetailPanel
          caseData={selectedCase}
          onClose={() => setSelectedCase(null)}
          onStatusChange={(newStatus) => {
            updateMutation.mutate({ id: selectedCase.id, data: { status: newStatus } })
            setSelectedCase(prev => ({ ...prev, status: newStatus }))
          }}
          onRefresh={(updated) => setSelectedCase(updated)}
        />
      )}

      {showAdd && <AddCaseModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

// ── Metric chip ───────────────────────────────────────────────────────────────
function MetricChip({ label, value, color, alert }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  }
  return (
    <div className={`rounded-lg border px-3 py-2 ${colors[color] || colors.blue}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className={`text-xl font-bold flex items-center gap-1 ${alert && value !== '0' && value !== 0 ? 'animate-pulse' : ''}`}>
        {alert && (value !== '0' && value !== 0) ? <AlertTriangle size={14} /> : null}
        {value}
      </p>
    </div>
  )
}

// ── Case card (kanban) ────────────────────────────────────────────────────────
function CaseCard({ case: c, selected, onClick }) {
  const risk = RISK_CONFIG[c.ai_risk_level] || null
  const staleClass = c.is_stale ? 'border-l-4 border-l-orange-400' : ''

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg p-3 cursor-pointer border transition-all ${
        selected ? 'border-blue-400 shadow-md ring-1 ring-blue-300' : 'border-gray-100 hover:border-gray-300'
      } ${staleClass}`}
    >
      <p className="font-semibold text-gray-900 text-xs leading-tight">{c.client_name}</p>
      <p className="text-gray-400 text-xs mt-0.5">{c.carrier} · {c.product_type || '—'}</p>

      <div className="flex items-center justify-between mt-2">
        <p className="text-xs font-medium text-gray-600">
          {c.face_amount ? fmt(c.face_amount) : c.annual_premium ? `${fmt(c.annual_premium)}/yr` : '—'}
        </p>
        <div className="flex items-center gap-1">
          {c.is_stale && <AlertTriangle size={11} className="text-orange-400" />}
          {risk && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${risk.bg} ${risk.text}`}>
              {risk.label}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-1.5">
        {c.days_in_status}d in status
        {c.is_stale && c.stale_threshold ? ` · stale after ${c.stale_threshold}d` : ''}
      </p>

      {c.agent_name && (
        <p className="text-xs text-blue-500 mt-1 truncate">{c.agent_name}</p>
      )}
    </div>
  )
}

// ── Case detail panel ─────────────────────────────────────────────────────────
function CaseDetailPanel({ caseData: c, onClose, onStatusChange, onRefresh }) {
  const qc = useQueryClient()
  const [analyzing, setAnalyzing] = useState(false)
  const [followupLoading, setFollowupLoading] = useState(false)
  const [followupMsg, setFollowupMsg] = useState(null)
  const [copied, setCopied] = useState(false)

  const risk = RISK_CONFIG[c.ai_risk_level] || null

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const updated = await cases.analyze(c.id)
      onRefresh(updated)
      qc.invalidateQueries({ queryKey: ['cases'] })
      qc.invalidateQueries({ queryKey: ['case-metrics'] })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleFollowup = async () => {
    setFollowupLoading(true)
    try {
      const result = await cases.followup(c.id)
      setFollowupMsg(result.message)
    } finally {
      setFollowupLoading(false)
    }
  }

  const copyFollowup = () => {
    navigator.clipboard.writeText(followupMsg)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-96 border-l border-gray-200 bg-white flex flex-col overflow-y-auto shrink-0">
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
        <div>
          <h2 className="font-bold text-gray-900">{c.client_name}</h2>
          <p className="text-sm text-gray-500">{c.carrier} · {c.product_type || '—'}</p>
          {c.agent_name && <p className="text-xs text-blue-500 mt-0.5">{c.agent_name} · {c.agent_company}</p>}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none ml-2">×</button>
      </div>

      <div className="flex-1 px-5 py-4 space-y-5 overflow-y-auto">
        {/* Risk badge */}
        {risk && (
          <div className={`rounded-lg p-3 ${risk.bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${risk.dot}`} />
              <p className={`text-sm font-bold ${risk.text}`}>{risk.label} Risk</p>
              {c.is_stale && <span className="text-xs bg-orange-200 text-orange-700 px-1.5 py-0.5 rounded-full">STALE</span>}
            </div>
            {c.ai_risk_reason && <p className="text-xs text-gray-600">{c.ai_risk_reason}</p>}
          </div>
        )}

        {/* Status selector */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">Status</p>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={c.status}
            onChange={e => onStatusChange(e.target.value)}
          >
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">{c.days_in_status} days in current status</p>
        </div>

        {/* Case details */}
        <div className="space-y-3">
          <DetailRow label="Face Amount" value={c.face_amount ? fmt(c.face_amount) : '—'} />
          <DetailRow label="Annual Premium" value={c.annual_premium ? fmt(c.annual_premium) : '—'} />
          {c.client_age && <DetailRow label="Insured Age" value={`${c.client_age}`} />}
          {c.carrier_case_number && <DetailRow label="Case Number" value={c.carrier_case_number} mono />}
          {c.submitted_at && (
            <DetailRow label="Submitted" value={formatDistanceToNow(parseISO(c.submitted_at), { addSuffix: true })} />
          )}
          {c.next_followup_date && (
            <DetailRow
              label="Next Follow-up"
              value={formatDistanceToNow(parseISO(c.next_followup_date), { addSuffix: true })}
              highlight={parseISO(c.next_followup_date) < new Date()}
            />
          )}
        </div>

        {/* Requirements outstanding */}
        {c.requirements_outstanding && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
              <AlertTriangle size={12} /> Requirements Outstanding
            </p>
            <p className="text-sm text-red-800 whitespace-pre-wrap">{c.requirements_outstanding}</p>
          </div>
        )}

        {/* AI recommended action */}
        {c.ai_recommended_action && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1">
              <Bot size={12} /> Recommended Action
            </p>
            <p className="text-sm text-gray-700">{c.ai_recommended_action}</p>
            {c.ai_analyzed_at && (
              <p className="text-xs text-gray-400 mt-1">
                Analyzed {formatDistanceToNow(parseISO(c.ai_analyzed_at), { addSuffix: true })}
              </p>
            )}
          </div>
        )}

        {/* Notes */}
        {c.notes && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.notes}</p>
          </div>
        )}

        {/* AI follow-up message */}
        {followupMsg && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                <Bot size={12} /> Draft Agent Check-in
              </p>
              <button onClick={copyFollowup} className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1">
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="px-3 py-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{followupMsg}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-5 py-4 border-t border-gray-100 space-y-2">
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-full btn-secondary flex items-center justify-center gap-2 text-sm"
        >
          <RefreshCw size={14} className={analyzing ? 'animate-spin' : ''} />
          {analyzing ? 'Analyzing...' : 'Re-analyze Risk'}
        </button>
        <button
          onClick={handleFollowup}
          disabled={followupLoading}
          className="w-full btn-primary flex items-center justify-center gap-2 text-sm"
        >
          <Bot size={14} />
          {followupLoading ? 'Drafting...' : 'Draft Agent Check-in'}
        </button>
      </div>
    </div>
  )
}

function DetailRow({ label, value, mono, highlight }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs text-gray-400 shrink-0">{label}</p>
      <p className={`text-sm text-right ${mono ? 'font-mono text-gray-600' : 'text-gray-800'} ${highlight ? 'text-red-500 font-medium' : ''}`}>
        {value}
      </p>
    </div>
  )
}

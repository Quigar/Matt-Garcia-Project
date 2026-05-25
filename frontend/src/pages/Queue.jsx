import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCircle, X, RefreshCw, Copy, Check, AlertTriangle, Clock, Bot, Mail } from 'lucide-react'
import { queue as queueApi } from '../api'
import { formatDistanceToNow, parseISO } from 'date-fns'

const STATUS_TABS = [
  { key: 'pending',   label: 'Pending' },
  { key: 'sent',      label: 'Sent' },
  { key: 'dismissed', label: 'Dismissed' },
]

const RISK_CONFIG = {
  low:      { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  medium:   { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  high:     { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  critical: { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
}

const CASE_STATUS_URGENCY = {
  requirements: 3,
  delivery: 2,
  approved: 2,
  pending: 1,
  submitted: 1,
}

function fmt(n) {
  if (!n) return null
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export default function Queue() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('pending')
  const [checking, setChecking] = useState(false)

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['queue', activeTab],
    queryFn: () => queueApi.list({ status: activeTab }),
  })

  const { data: metrics } = useQuery({
    queryKey: ['queue-metrics'],
    queryFn: queueApi.metrics,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['queue'] })
    qc.invalidateQueries({ queryKey: ['queue-metrics'] })
  }

  const sendMutation = useMutation({
    mutationFn: (id) => queueApi.markSent(id),
    onSuccess: invalidate,
  })

  const dismissMutation = useMutation({
    mutationFn: (id) => queueApi.dismiss(id),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => queueApi.update(id, data),
    onSuccess: invalidate,
  })

  const handleCheck = async () => {
    setChecking(true)
    try {
      await queueApi.triggerCheck()
      invalidate()
    } finally {
      setChecking(false)
    }
  }

  // Sort pending items: critical first, then by case status urgency, then by triggered_at asc
  const sorted = [...items].sort((a, b) => {
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3, null: 4 }
    const ra = riskOrder[a.ai_risk_level] ?? 4
    const rb = riskOrder[b.ai_risk_level] ?? 4
    if (ra !== rb) return ra - rb
    const ua = CASE_STATUS_URGENCY[a.case_status] ?? 0
    const ub = CASE_STATUS_URGENCY[b.case_status] ?? 0
    return ub - ua
  })

  const m = metrics || {}

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell size={22} className="text-blue-500" />
            Follow-up Queue
          </h1>
          <p className="text-gray-500 mt-1">
            AI-generated check-ins for stale pending cases — review, edit, and send
          </p>
        </div>
        <button
          onClick={handleCheck}
          disabled={checking}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Checking...' : 'Check Now'}
        </button>
      </div>

      {/* Metrics bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard icon={Bell} label="Pending" value={m.pending ?? 0} color="blue" urgent={m.pending > 0} />
        <MetricCard icon={CheckCircle} label="Sent Today" value={m.sent_today ?? 0} color="green" />
        <MetricCard icon={X} label="Dismissed" value={m.dismissed ?? 0} color="gray" />
        <MetricCard icon={Bot} label="Total Generated" value={m.total ?? 0} color="purple" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
            {tab.key === 'pending' && m.pending > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {m.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Queue items */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-medium">
            {activeTab === 'pending'
              ? 'No pending follow-ups — all cases are on track.'
              : `No ${activeTab} items.`}
          </p>
          {activeTab === 'pending' && (
            <button onClick={handleCheck} className="mt-4 btn-secondary text-sm">
              Run check for stale cases
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(item => (
            <QueueItem
              key={item.id}
              item={item}
              onSend={() => sendMutation.mutate(item.id)}
              onDismiss={() => dismissMutation.mutate(item.id)}
              onEdit={(msg) => updateMutation.mutate({ id: item.id, data: { message: msg } })}
              isPending={activeTab === 'pending'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, color, urgent }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    gray: 'bg-gray-50 text-gray-500 border-gray-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  }
  return (
    <div className={`card border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium opacity-70">{label}</p>
        <Icon size={16} />
      </div>
      <p className={`text-3xl font-bold mt-1 ${urgent ? 'animate-pulse' : ''}`}>{value}</p>
    </div>
  )
}

// ── Queue item card ────────────────────────────────────────────────────────────
function QueueItem({ item, onSend, onDismiss, onEdit, isPending }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.message)
  const [copied, setCopied] = useState(false)

  const risk = RISK_CONFIG[item.ai_risk_level] || null

  const handleSaveEdit = () => {
    onEdit(draft)
    setEditing(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(item.message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`card p-5 ${item.ai_risk_level === 'critical' ? 'border-red-300 border-l-4 border-l-red-500' : ''}`}>
      <div className="flex items-start gap-5">
        {/* Left: case & agent info */}
        <div className="w-56 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            {risk && (
              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${risk.bg} ${risk.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />
                {item.ai_risk_level}
              </span>
            )}
            <span className="text-xs text-gray-400 capitalize bg-gray-100 px-1.5 py-0.5 rounded">
              {item.case_status}
            </span>
          </div>

          <p className="font-semibold text-gray-900 text-sm">{item.client_name}</p>
          <p className="text-xs text-gray-500">{item.carrier} · {item.product_type || '—'}</p>
          {(item.face_amount || item.annual_premium) && (
            <p className="text-xs text-gray-500 mt-0.5">
              {item.face_amount ? fmt(item.face_amount) : ''}{item.face_amount && item.annual_premium ? ' · ' : ''}
              {item.annual_premium ? `${fmt(item.annual_premium)}/yr` : ''}
            </p>
          )}

          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs font-medium text-blue-600">{item.agent_name}</p>
            {item.agent_email && <p className="text-xs text-gray-400 truncate">{item.agent_email}</p>}
          </div>

          <div className="mt-2">
            <p className="text-xs text-orange-600 flex items-center gap-1">
              <Clock size={10} />
              {item.trigger_reason}
            </p>
            {item.triggered_at && (
              <p className="text-xs text-gray-400 mt-0.5">
                Queued {formatDistanceToNow(parseISO(item.triggered_at), { addSuffix: true })}
              </p>
            )}
          </div>

          {item.requirements_outstanding && (
            <div className="mt-2 bg-red-50 border border-red-100 rounded p-2">
              <p className="text-xs text-red-600 font-medium mb-0.5 flex items-center gap-1">
                <AlertTriangle size={10} /> Requirements
              </p>
              <p className="text-xs text-red-700 line-clamp-3">{item.requirements_outstanding}</p>
            </div>
          )}

          {item.ai_recommended_action && (
            <div className="mt-2 bg-blue-50 border border-blue-100 rounded p-2">
              <p className="text-xs text-blue-600 font-medium mb-0.5 flex items-center gap-1">
                <Bot size={10} /> Next action
              </p>
              <p className="text-xs text-blue-700 line-clamp-3">{item.ai_recommended_action}</p>
            </div>
          )}
        </div>

        {/* Right: message + actions */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <Mail size={12} /> Agent Check-in Message
            </p>
            <div className="flex items-center gap-2">
              {isPending && !editing && (
                <button
                  onClick={() => { setEditing(true); setDraft(item.message) }}
                  className="text-xs text-gray-400 hover:text-gray-700"
                >
                  Edit
                </button>
              )}
              <button onClick={handleCopy} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
                {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {editing ? (
            <div>
              <textarea
                className="w-full border border-blue-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={5}
                value={draft}
                onChange={e => setDraft(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                <button onClick={handleSaveEdit} className="btn-primary text-xs px-3 py-1.5">Save</button>
                <button onClick={() => setEditing(false)} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap min-h-[80px]">
              {item.message}
            </div>
          )}

          {/* Action buttons */}
          {isPending && !editing && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={onSend}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <CheckCircle size={14} />
                Mark Sent
              </button>
              <button
                onClick={onDismiss}
                className="btn-secondary flex items-center gap-1.5 text-sm"
              >
                <X size={14} />
                Dismiss
              </button>
            </div>
          )}

          {item.status === 'sent' && item.sent_at && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <CheckCircle size={12} />
              Sent {formatDistanceToNow(parseISO(item.sent_at), { addSuffix: true })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

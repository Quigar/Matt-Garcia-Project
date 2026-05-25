import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Users, Calendar, TrendingUp, FileText, Bell, AlertTriangle,
  Clock, CheckCircle, Bot, RefreshCw, ChevronRight, Activity,
  Zap, DollarSign, Star,
} from 'lucide-react'
import { format, formatDistanceToNow, parseISO, isToday } from 'date-fns'
import { pipeline, appointments, cases, queue, prospects } from '../api'

// ── Shared helpers ────────────────────────────────────────────────────────────
function fmt(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

const PRODUCT_COLORS = {
  iul_vul:       'bg-purple-100 text-purple-700',
  annuities:     'bg-blue-100 text-blue-700',
  whole_life:    'bg-green-100 text-green-700',
  term:          'bg-sky-100 text-sky-700',
  final_expense: 'bg-orange-100 text-orange-700',
  mixed:         'bg-gray-100 text-gray-600',
}
const PRODUCT_LABELS = {
  iul_vul: 'IUL/VUL', annuities: 'Annuities', whole_life: 'Whole Life',
  term: 'Term', final_expense: 'FE', mixed: 'Mixed',
}
const STATUS_COLORS = {
  lead:            'bg-gray-100 text-gray-600',
  contacted:       'bg-blue-100 text-blue-700',
  qualified:       'bg-green-100 text-green-700',
  unqualified:     'bg-red-100 text-red-700',
  appointment_set: 'bg-purple-100 text-purple-700',
}
const RISK_DOT = {
  critical: 'bg-red-500', high: 'bg-orange-500',
  medium: 'bg-yellow-500', low: 'bg-green-500',
}
const STAGE_CONFIG = {
  lead:             { label: 'Lead',        bar: 'bg-gray-400' },
  qualified:        { label: 'Qualified',   bar: 'bg-blue-400' },
  discovery_call:   { label: 'Discovery',   bar: 'bg-indigo-500' },
  demo:             { label: 'Demo',        bar: 'bg-purple-500' },
  proposal:         { label: 'Proposal',    bar: 'bg-orange-500' },
  contracting:      { label: 'Contracting', bar: 'bg-yellow-500' },
  closed_won:       { label: 'Won',         bar: 'bg-green-500' },
}

// ── Live clock ────────────────────────────────────────────────────────────────
function useLiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const now = useLiveClock()
  const REFETCH = 60_000

  const { data: pm }  = useQuery({ queryKey: ['pipeline-metrics'],  queryFn: pipeline.metrics,     refetchInterval: REFETCH })
  const { data: pl }  = useQuery({ queryKey: ['pipeline'],          queryFn: pipeline.get,         refetchInterval: REFETCH })
  const { data: cm }  = useQuery({ queryKey: ['case-metrics'],      queryFn: cases.metrics,        refetchInterval: REFETCH })
  const { data: qm }  = useQuery({ queryKey: ['queue-metrics'],     queryFn: queue.metrics,        refetchInterval: REFETCH })
  const { data: apptList } = useQuery({ queryKey: ['appointments'], queryFn: () => appointments.list({ status: 'scheduled' }), refetchInterval: REFETCH })
  const { data: recentProspects } = useQuery({ queryKey: ['prospects-recent'], queryFn: () => prospects.recent(10), refetchInterval: REFETCH })
  const { data: riskyCases } = useQuery({ queryKey: ['cases-risky'], queryFn: () => cases.list({ stale_only: false }), refetchInterval: REFETCH })
  const { data: queueItems } = useQuery({ queryKey: ['queue', 'pending'], queryFn: () => queue.list({ status: 'pending', limit: 5 }), refetchInterval: REFETCH })

  const m  = pm || {}
  const todayAppts = (apptList || []).filter(a => a.scheduled_at && isToday(parseISO(a.scheduled_at)))
  const upcomingAppts = (apptList || []).filter(a => a.scheduled_at && !isToday(parseISO(a.scheduled_at))).slice(0, 3)
  const atRiskCases = (riskyCases || [])
    .filter(c => c.ai_risk_level === 'critical' || c.ai_risk_level === 'high' || c.is_stale)
    .sort((a, b) => {
      const o = { critical: 0, high: 1, medium: 2, low: 3 }
      return (o[a.ai_risk_level] ?? 4) - (o[b.ai_risk_level] ?? 4)
    })
    .slice(0, 6)

  // Product focus breakdown from recent prospects
  const allProspectData = recentProspects?.items || []

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      {/* ── Command center header ── */}
      <header className="bg-slate-900 px-8 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-blue-400" />
            <p className="text-white font-bold text-base tracking-tight">InsureFlow AI — Command Center</p>
          </div>
          <p className="text-slate-400 text-xs mt-0.5">Life insurance agent sales platform</p>
        </div>
        <div className="text-right">
          <p className="text-white text-sm font-mono">{format(now, 'h:mm:ss a')}</p>
          <p className="text-slate-400 text-xs">{format(now, 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </header>

      <div className="p-6 space-y-5">

        {/* ── KPI strip ── */}
        <div className="grid grid-cols-6 gap-3">
          <KpiCard icon={Users}       label="Total Agents"   value={m.total_prospects ?? 0}         sub={`${m.qualified_prospects ?? 0} qualified`} color="blue" />
          <KpiCard icon={Star}        label="Avg Lead Score"  value={m.avg_lead_score ?? 0}          sub={`${m.win_rate ?? 0}% win rate`}            color="green" />
          <KpiCard icon={Calendar}    label="Appts Today"    value={todayAppts.length}              sub={`${(apptList || []).length} upcoming`}      color="purple" />
          <KpiCard icon={DollarSign}  label="Pipeline"       value={fmt(m.active_pipeline_value)}   sub={`${fmt(m.won_revenue)} closed`}            color="indigo" />
          <KpiCard
            icon={AlertTriangle}
            label="Cases at Risk"
            value={cm ? (cm.critical_cases ?? 0) + (cm.stale_cases ?? 0) : 0}
            sub={`${cm?.in_requirements ?? 0} in requirements`}
            color="red"
            urgent={(cm?.critical_cases ?? 0) > 0}
          />
          <KpiCard
            icon={Bell}
            label="Queue Pending"
            value={qm?.pending ?? 0}
            sub={`${qm?.sent_today ?? 0} sent today`}
            color="orange"
            urgent={(qm?.pending ?? 0) > 0}
          />
        </div>

        {/* ── Lead Influx + Today's Agenda ── */}
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-3 card flex flex-col" style={{ maxHeight: 380 }}>
            <SectionHeader icon={Activity} title="Lead Influx" sub="Most recently added agents" link="/app/prospects" linkLabel="View all" />
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {allProspectData.length === 0 ? (
                <p className="text-gray-400 text-sm px-5 py-8 text-center">No prospects yet.</p>
              ) : allProspectData.map(p => (
                <LeadRow key={p.id} prospect={p} />
              ))}
            </div>
          </div>

          <div className="col-span-2 card flex flex-col" style={{ maxHeight: 380 }}>
            <SectionHeader icon={Calendar} title="Today's Agenda" sub={format(now, 'EEEE, MMM d')} link="/app/appointments" linkLabel="Calendar" />
            <div className="flex-1 overflow-y-auto">
              {todayAppts.length === 0 && (queueItems || []).length === 0 ? (
                <p className="text-gray-400 text-sm px-5 py-8 text-center">Nothing scheduled for today.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {todayAppts.map(a => <AgendaApptRow key={a.id} appt={a} />)}
                  {(queueItems || []).length > 0 && (
                    <div className="px-5 pt-3 pb-1">
                      <p className="text-xs font-semibold text-orange-500 flex items-center gap-1 mb-2">
                        <Bell size={11} /> {queueItems.length} follow-up{queueItems.length !== 1 ? 's' : ''} need review
                      </p>
                      {queueItems.slice(0, 3).map(item => <AgendaQueueRow key={item.id} item={item} />)}
                    </div>
                  )}
                  {upcomingAppts.length > 0 && (
                    <div className="px-5 pt-3 pb-1">
                      <p className="text-xs font-semibold text-gray-400 mb-2">UPCOMING</p>
                      {upcomingAppts.map(a => <AgendaApptRow key={a.id} appt={a} muted />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Pipeline Health ── */}
        <div className="card p-5">
          <SectionHeader icon={TrendingUp} title="Pipeline Health" sub="Active deals by stage" link="/app/pipeline" linkLabel="Full pipeline" inline />
          <PipelineStrip data={pl} />
        </div>

        {/* ── Cases at Risk + Production Mix ── */}
        <div className="grid grid-cols-2 gap-5">
          <div className="card flex flex-col" style={{ maxHeight: 320 }}>
            <SectionHeader icon={AlertTriangle} title="Cases at Risk" sub="Critical · High · Stale" link="/app/cases" linkLabel="All cases" />
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {atRiskCases.length === 0 ? (
                <p className="text-gray-400 text-sm px-5 py-8 text-center flex flex-col items-center gap-2">
                  <CheckCircle size={24} className="text-green-400" />
                  All cases on track — no urgent issues.
                </p>
              ) : atRiskCases.map(c => <RiskCaseRow key={c.id} case={c} />)}
            </div>
          </div>

          <div className="card p-5">
            <SectionHeader icon={Bot} title="Production Mix" sub="Agents by product focus" inline />
            <ProductionMix metrics={m} />
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, sub, link, linkLabel, inline }) {
  const navigate = useNavigate()
  const content = (
    <div className={`flex items-center justify-between ${inline ? 'mb-4' : 'px-5 py-3 border-b border-gray-100'}`}>
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-blue-500 shrink-0" />
        <div>
          <p className="font-semibold text-gray-900 text-sm">{title}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </div>
      {link && (
        <button onClick={() => navigate(link)} className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5">
          {linkLabel} <ChevronRight size={12} />
        </button>
      )}
    </div>
  )
  return content
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color, urgent }) {
  const colors = {
    blue:   'bg-blue-500',
    green:  'bg-green-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
    red:    'bg-red-500',
    orange: 'bg-orange-500',
  }
  return (
    <div className={`card p-4 ${urgent ? 'ring-2 ring-red-400' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${colors[color] || 'bg-blue-500'}`}>
          <Icon size={13} className="text-white" />
        </div>
      </div>
      <p className={`text-2xl font-bold text-gray-900 ${urgent ? 'text-red-600' : ''}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Lead influx row ───────────────────────────────────────────────────────────
function LeadRow({ prospect: p }) {
  const navigate = useNavigate()
  const score = p.lead_score ?? 0
  const scoreColor = score >= 70 ? 'text-green-600 bg-green-50' : score >= 40 ? 'text-yellow-600 bg-yellow-50' : 'text-red-500 bg-red-50'
  return (
    <div
      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer"
      onClick={() => navigate(`/app/prospects/${p.id}`)}
    >
      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-slate-600">
          {(p.first_name?.[0] ?? '') + (p.last_name?.[0] ?? '')}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">{p.full_name}</p>
          {p.product_focus && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${PRODUCT_COLORS[p.product_focus] || 'bg-gray-100 text-gray-600'}`}>
              {PRODUCT_LABELS[p.product_focus] || p.product_focus}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">{p.company || p.imo_fmo_affiliation || p.title || '—'}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {p.status && STATUS_COLORS[p.status] && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>
            {p.status.replace('_', ' ')}
          </span>
        )}
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor}`}>{score}</span>
        {p.created_at && (
          <span className="text-xs text-gray-300">{formatDistanceToNow(parseISO(p.created_at), { addSuffix: true })}</span>
        )}
      </div>
    </div>
  )
}

// ── Agenda appointment row ─────────────────────────────────────────────────────
function AgendaApptRow({ appt, muted }) {
  return (
    <div className={`flex items-center gap-3 px-5 py-2.5 ${muted ? 'opacity-60' : ''}`}>
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${muted ? 'bg-gray-300' : 'bg-blue-500'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{appt.prospect_name}</p>
        <p className="text-xs text-gray-400">{appt.title} · {appt.employee_name}</p>
      </div>
      <p className="text-xs text-gray-500 shrink-0">
        {appt.scheduled_at ? format(parseISO(appt.scheduled_at), 'h:mm a') : ''}
      </p>
    </div>
  )
}

// ── Agenda queue row ───────────────────────────────────────────────────────────
function AgendaQueueRow({ item }) {
  const navigate = useNavigate()
  const risk = item.ai_risk_level
  return (
    <div
      className="flex items-center gap-2 py-1.5 cursor-pointer hover:opacity-80"
      onClick={() => navigate('/app/queue')}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${RISK_DOT[risk] || 'bg-gray-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate">{item.client_name} · {item.carrier}</p>
        <p className="text-xs text-gray-400 truncate">{item.agent_name}</p>
      </div>
      <span className="text-xs text-orange-500 capitalize shrink-0">{risk}</span>
    </div>
  )
}

// ── Pipeline health strip ──────────────────────────────────────────────────────
function PipelineStrip({ data }) {
  if (!data) return <div className="h-20 flex items-center justify-center text-gray-300 text-sm">Loading...</div>

  const activeStages = (data.stages || []).filter(s =>
    !['closed_lost'].includes(s.stage) && STAGE_CONFIG[s.stage]
  )
  const maxVal = Math.max(...activeStages.map(s => s.total_value), 1)

  return (
    <div className="flex gap-3">
      {activeStages.map(s => {
        const cfg = STAGE_CONFIG[s.stage]
        const pct = Math.max((s.total_value / maxVal) * 100, s.count > 0 ? 8 : 0)
        const isWon = s.stage === 'closed_won'
        return (
          <div key={s.stage} className="flex-1">
            <div className="flex items-end justify-between mb-1.5">
              <p className={`text-xs font-semibold ${isWon ? 'text-green-600' : 'text-gray-600'}`}>
                {cfg.label}
              </p>
              <p className={`text-lg font-bold ${isWon ? 'text-green-600' : 'text-gray-800'}`}>{s.count}</p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${cfg.bar} transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{fmt(s.total_value)}</p>
          </div>
        )
      })}
    </div>
  )
}

// ── Risk case row ──────────────────────────────────────────────────────────────
function RiskCaseRow({ case: c }) {
  const navigate = useNavigate()
  const risk = c.ai_risk_level
  const dot = RISK_DOT[risk] || 'bg-gray-400'
  return (
    <div
      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer"
      onClick={() => navigate('/app/cases')}
    >
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{c.client_name}</p>
        <p className="text-xs text-gray-400 truncate">{c.carrier} · {c.product_type || '—'} · {c.agent_name}</p>
        {c.requirements_outstanding && (
          <p className="text-xs text-red-500 truncate mt-0.5">Req: {c.requirements_outstanding}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-semibold capitalize text-gray-500">{c.status}</p>
        <p className="text-xs text-orange-500">{c.days_in_status}d stale</p>
      </div>
    </div>
  )
}

// ── Production mix ─────────────────────────────────────────────────────────────
function ProductionMix({ metrics: m }) {
  const tiers = m?.production_tier_breakdown || {}
  const tierConfig = [
    { key: 'top_producer', label: 'Top Producer ($1M+)',    color: 'bg-yellow-400' },
    { key: 'established',  label: 'Established ($500K–$1M)', color: 'bg-green-400' },
    { key: 'growing',      label: 'Growing ($100K–$500K)',  color: 'bg-blue-400' },
    { key: 'emerging',     label: 'Emerging (<$100K)',      color: 'bg-gray-300' },
  ]
  const total = Object.values(tiers).reduce((a, b) => a + b, 0) || 1

  return (
    <div className="space-y-3 mt-1">
      {tierConfig.map(({ key, label, color }) => {
        const count = tiers[key] || 0
        const pct = Math.round((count / total) * 100)
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-600">{label}</p>
              <p className="text-xs font-bold text-gray-800">{count}</p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${color} transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
      <div className="pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-400">
        <span>Total agents</span>
        <span className="font-semibold text-gray-700">{total}</span>
      </div>
    </div>
  )
}

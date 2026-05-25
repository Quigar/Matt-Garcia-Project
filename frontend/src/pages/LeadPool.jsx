import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Star, CheckCircle, RefreshCw, Search, Filter,
  Phone, Mail, MapPin, Heart, ExternalLink, X, UserCheck,
} from 'lucide-react'
import { leads as leadsApi, prospects } from '../api'
import { formatDistanceToNow, parseISO } from 'date-fns'

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'working', label: 'Working' },
  { key: 'converted', label: 'Converted' },
  { key: 'dead', label: 'Dead' },
]

const SCORE_CONFIG = {
  high:   { min: 75, bg: 'bg-green-100', text: 'text-green-700', label: 'High' },
  medium: { min: 50, bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Med' },
  low:    { min: 0,  bg: 'bg-gray-100', text: 'text-gray-600', label: 'Low' },
}

const STATUS_COLORS = {
  new:       'bg-blue-100 text-blue-700',
  assigned:  'bg-purple-100 text-purple-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  working:   'bg-orange-100 text-orange-700',
  converted: 'bg-green-100 text-green-700',
  dead:      'bg-gray-100 text-gray-500',
}

const PRODUCT_COLORS = {
  term:          'bg-blue-50 text-blue-600',
  whole_life:    'bg-indigo-50 text-indigo-600',
  final_expense: 'bg-orange-50 text-orange-600',
  iul:           'bg-purple-50 text-purple-600',
  annuity:       'bg-teal-50 text-teal-600',
}

function scoreConfig(score) {
  if (score >= 75) return SCORE_CONFIG.high
  if (score >= 50) return SCORE_CONFIG.medium
  return SCORE_CONFIG.low
}

function fmt(n) {
  if (!n) return null
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

export default function LeadPool() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('')
  const [search, setSearch] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [assignOpen, setAssignOpen] = useState(false)

  const { data: leadsData = { items: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['leads', activeTab, search, productFilter],
    queryFn: () => leadsApi.list({
      status: activeTab || undefined,
      search: search || undefined,
      product_type: productFilter || undefined,
    }),
    refetchInterval: 60_000,
  })

  const { data: metrics } = useQuery({
    queryKey: ['lead-metrics'],
    queryFn: leadsApi.metrics,
    refetchInterval: 60_000,
  })

  const { data: agentsData } = useQuery({
    queryKey: ['agents-brief'],
    queryFn: () => prospects.list({ limit: 200 }),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['leads'] })
    qc.invalidateQueries({ queryKey: ['lead-metrics'] })
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => leadsApi.update(id, data),
    onSuccess: (updated) => {
      invalidate()
      if (selected?.id === updated.id) setSelected(updated)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => leadsApi.delete(id),
    onSuccess: () => { invalidate(); setSelected(null) },
  })

  const items = leadsData.items || []
  const m = metrics || {}
  const agents = agentsData?.items || []

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main list */}
      <div className={`flex flex-col ${selected ? 'w-[55%]' : 'w-full'} overflow-hidden`}>
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Heart size={22} className="text-red-500" />
                Consumer Lead Pool
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Inbound quote requests — assign to agents for follow-up
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href="/quote"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-1.5 text-sm"
              >
                <ExternalLink size={14} /> Quote Form
              </a>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            <MCard label="New" value={m.new ?? 0} color="blue" urgent={(m.new ?? 0) > 0} />
            <MCard label="Assigned" value={m.assigned ?? 0} color="purple" />
            <MCard label="Today" value={m.today_new ?? 0} color="green" />
            <MCard label="Converted" value={m.converted ?? 0} color="teal" />
            <MCard label="Conv. Rate" value={`${m.conversion_rate ?? 0}%`} color="gray" />
          </div>

          {/* Tabs + filters */}
          <div className="flex items-center justify-between border-b border-gray-200 mb-0">
            <div className="flex gap-0.5">
              {STATUS_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.key === 'new' && (m.new ?? 0) > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {m.new}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pb-1">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
                  placeholder="Search leads..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={productFilter}
                onChange={e => setProductFilter(e.target.value)}
              >
                <option value="">All Products</option>
                <option value="term">Term Life</option>
                <option value="whole_life">Whole Life</option>
                <option value="final_expense">Final Expense</option>
                <option value="iul">IUL / VUL</option>
                <option value="annuity">Annuity</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-3">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <Heart size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 font-medium">No leads found</p>
              <a
                href="/quote"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 btn-secondary text-sm"
              >
                <ExternalLink size={13} /> Share the quote form
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(lead => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  isSelected={selected?.id === lead.id}
                  onClick={() => setSelected(s => s?.id === lead.id ? null : lead)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-[45%] border-l border-gray-200 flex flex-col overflow-hidden bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                {selected.first_name[0]}{selected.last_name[0]}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{selected.full_name}</p>
                <p className="text-xs text-gray-500">Ref: CLT-{String(selected.id).padStart(4, '0')}</p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-5 space-y-4">
            {/* Status + score */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[selected.status]}`}>
                {selected.status}
              </span>
              {selected.quality_score != null && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${scoreConfig(selected.quality_score).bg} ${scoreConfig(selected.quality_score).text}`}>
                  <Star size={10} />
                  {selected.quality_score} · {scoreConfig(selected.quality_score).label} Quality
                </span>
              )}
              {selected.product_type && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PRODUCT_COLORS[selected.product_type] || 'bg-gray-100 text-gray-600'}`}>
                  {selected.product_type_label}
                </span>
              )}
            </div>

            {/* Contact info */}
            <div className="space-y-2">
              {selected.email && (
                <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <Mail size={14} /> {selected.email}
                </a>
              )}
              {selected.phone && (
                <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <Phone size={14} /> {selected.phone}
                </a>
              )}
              {(selected.state || selected.zip_code) && (
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={14} /> {[selected.state, selected.zip_code].filter(Boolean).join(' ')}
                  {selected.age && ` · Age ${selected.age}`}
                </p>
              )}
            </div>

            {/* Coverage details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Coverage Request</p>
              {selected.coverage_amount && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Coverage</span>
                  <span className="font-medium">{fmt(selected.coverage_amount)}</span>
                </div>
              )}
              {selected.monthly_budget && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Monthly Budget</span>
                  <span className="font-medium">${selected.monthly_budget}/mo</span>
                </div>
              )}
              {selected.health_class_label && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Health</span>
                  <span className="font-medium">{selected.health_class_label}</span>
                </div>
              )}
              {selected.tobacco_user && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tobacco</span>
                  <span className="font-medium text-orange-600">Yes</span>
                </div>
              )}
            </div>

            {/* Source */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Source</span>
              <span className="font-medium">{selected.source_label || selected.source}</span>
            </div>
            {selected.created_at && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Received</span>
                <span className="text-gray-700">
                  {formatDistanceToNow(parseISO(selected.created_at), { addSuffix: true })}
                </span>
              </div>
            )}

            {/* Assignment */}
            {selected.assigned_agent ? (
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-purple-600 mb-1 flex items-center gap-1">
                  <UserCheck size={12} /> Assigned Agent
                </p>
                <p className="text-sm font-medium text-gray-900">{selected.assigned_agent.full_name}</p>
                {selected.assigned_agent.email && (
                  <p className="text-xs text-gray-500">{selected.assigned_agent.email}</p>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                <p className="text-xs text-yellow-700 font-medium mb-2">Not yet assigned to an agent</p>
              </div>
            )}

            {/* Status update */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Update Status
              </label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selected.status}
                onChange={e => {
                  updateMutation.mutate({ id: selected.id, data: { status: e.target.value } })
                  setSelected(s => ({ ...s, status: e.target.value }))
                }}
              >
                {STATUS_TABS.filter(t => t.key).map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <NotesEditor
              value={selected.notes || ''}
              onSave={(notes) => updateMutation.mutate({ id: selected.id, data: { notes } })}
            />
          </div>

          {/* Assign + delete footer */}
          <div className="border-t border-gray-100 px-5 py-3 flex gap-2">
            <button
              onClick={() => setAssignOpen(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-1.5"
            >
              <UserCheck size={14} />
              {selected.assigned_agent ? 'Reassign' : 'Assign to Agent'}
            </button>
            <button
              onClick={() => {
                if (confirm('Delete this lead?')) deleteMutation.mutate(selected.id)
              }}
              className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assignOpen && selected && (
        <AssignModal
          lead={selected}
          agents={agents}
          onAssign={(agentId) => {
            updateMutation.mutate({ id: selected.id, data: { assigned_to_prospect_id: agentId } })
            setAssignOpen(false)
          }}
          onClose={() => setAssignOpen(false)}
        />
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MCard({ label, value, color, urgent }) {
  const colors = {
    blue: 'text-blue-600', purple: 'text-purple-600', green: 'text-green-600',
    teal: 'text-teal-600', gray: 'text-gray-600',
  }
  return (
    <div className="card p-3">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]} ${urgent ? 'animate-pulse' : ''}`}>{value}</p>
    </div>
  )
}

function LeadRow({ lead, isSelected, onClick }) {
  const sc = scoreConfig(lead.quality_score)
  return (
    <div
      onClick={onClick}
      className={`card p-3.5 cursor-pointer hover:shadow-md transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {lead.first_name[0]}{lead.last_name[0]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-gray-900 text-sm">{lead.full_name}</p>
            {lead.state && <span className="text-xs text-gray-400">{lead.state}</span>}
            {lead.age && <span className="text-xs text-gray-400">· {lead.age}y</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${STATUS_COLORS[lead.status]}`}>
              {lead.status}
            </span>
            {lead.product_type && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${PRODUCT_COLORS[lead.product_type] || 'bg-gray-100 text-gray-500'}`}>
                {lead.product_type_label}
              </span>
            )}
            {lead.coverage_amount && (
              <span className="text-xs text-gray-500">{fmt(lead.coverage_amount)} coverage</span>
            )}
            {lead.monthly_budget && (
              <span className="text-xs text-gray-500">${lead.monthly_budget}/mo</span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
            {lead.quality_score}
          </span>
          {lead.assigned_agent && (
            <p className="text-xs text-purple-600 mt-1">{lead.assigned_agent.full_name.split(' ')[0]}</p>
          )}
          {!lead.assigned_agent && (
            <p className="text-xs text-gray-400 mt-1">Unassigned</p>
          )}
        </div>
      </div>
    </div>
  )
}

function NotesEditor({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</label>
        {!editing && (
          <button onClick={() => { setEditing(true); setDraft(value) }} className="text-xs text-blue-500 hover:text-blue-700">
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div>
          <textarea
            className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={() => { onSave(draft); setEditing(false) }}
              className="btn-primary text-xs px-3 py-1.5"
            >
              Save
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary text-xs px-3 py-1.5">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 min-h-[52px]">
          {value || <span className="text-gray-400">No notes</span>}
        </p>
      )}
    </div>
  )
}

function AssignModal({ lead, agents, onAssign, onClose }) {
  const [query, setQuery] = useState('')
  const filtered = agents.filter(a =>
    `${a.first_name} ${a.last_name} ${a.company || ''} ${a.product_focus || ''}`.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Assign Lead to Agent</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm text-gray-600 mb-2">
            Assigning <strong>{lead.full_name}</strong> · {lead.product_type_label || 'Life Insurance'}
          </p>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search agents..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-72 overflow-auto px-3 py-2">
          {filtered.slice(0, 20).map(agent => (
            <button
              key={agent.id}
              onClick={() => onAssign(agent.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {agent.first_name[0]}{agent.last_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{agent.first_name} {agent.last_name}</p>
                <p className="text-xs text-gray-500">{agent.company || agent.title || '—'}</p>
              </div>
              {agent.product_focus_label && (
                <span className="text-xs text-gray-400 shrink-0">{agent.product_focus_label}</span>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">No agents match</p>
          )}
        </div>
      </div>
    </div>
  )
}

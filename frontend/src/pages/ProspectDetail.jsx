import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, DollarSign, Users, Briefcase, Star } from 'lucide-react'
import { prospects } from '../api'
import QualificationChat from '../components/QualificationChat'
import OutreachPanel from '../components/OutreachPanel'

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'qualify', label: 'AI Qualify' },
  { id: 'outreach', label: 'Outreach' },
]

const PRODUCT_LABELS = {
  final_expense: 'Final Expense',
  term: 'Term Life',
  whole_life: 'Whole Life',
  iul_vul: 'IUL / VUL',
  annuities: 'Annuities',
  mixed: 'Mixed',
}

const PRODUCT_COLORS = {
  iul_vul: 'bg-purple-100 text-purple-700',
  annuities: 'bg-blue-100 text-blue-700',
  whole_life: 'bg-green-100 text-green-700',
  term: 'bg-sky-100 text-sky-700',
  final_expense: 'bg-orange-100 text-orange-700',
  mixed: 'bg-gray-100 text-gray-600',
}

const TIER_LABELS = {
  emerging: 'Emerging (<$100K)',
  growing: 'Growing ($100K–$500K)',
  established: 'Established ($500K–$1M)',
  top_producer: 'Top Producer ($1M+)',
}

export default function ProspectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  const { data: prospect, isLoading } = useQuery({
    queryKey: ['prospect', id],
    queryFn: () => prospects.get(id),
  })

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>
  )
  if (!prospect) return <div className="p-8 text-gray-500">Agent not found.</div>

  const score = prospect.lead_score ?? 0
  const scoreColor = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-500'

  return (
    <div className="p-8">
      <button onClick={() => navigate('/app/prospects')} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm mb-6">
        <ArrowLeft size={16} /> Back to Agents
      </button>

      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{prospect.full_name}</h1>
            {prospect.product_focus && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PRODUCT_COLORS[prospect.product_focus] || 'bg-gray-100 text-gray-600'}`}>
                {PRODUCT_LABELS[prospect.product_focus] || prospect.product_focus}
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-1">{prospect.title} · {prospect.company}</p>
          {prospect.imo_fmo_affiliation && (
            <p className="text-sm text-blue-600 mt-0.5">{prospect.imo_fmo_affiliation}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Lead Score</p>
          <p className={`text-4xl font-bold ${scoreColor}`}>{score}</p>
          {prospect.production_tier && (
            <p className="text-xs text-gray-400 mt-1">{TIER_LABELS[prospect.production_tier]}</p>
          )}
        </div>
      </div>

      {prospect.pain_points && (
        <div className="mb-5 flex flex-wrap gap-2">
          {prospect.pain_points.split(',').map((p, i) => (
            <span key={i} className="text-xs bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full">
              {p.trim()}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab prospect={prospect} />}
      {activeTab === 'qualify' && <QualificationChat prospect={prospect} />}
      {activeTab === 'outreach' && <OutreachPanel prospect={prospect} />}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-900 font-medium">{value || '—'}</p>
    </div>
  )
}

function OverviewTab({ prospect: p }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Contact Info</h3>
        <div className="space-y-3">
          <Field label="Email" value={p.email} />
          <Field label="Phone" value={p.phone} />
          <Field label="Company / DBA" value={p.company} />
          <Field label="Title" value={p.title} />
          <Field label="Lead Source" value={p.source} />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Practice Profile</h3>
        <div className="space-y-3">
          <Field label="Product Focus" value={PRODUCT_LABELS[p.product_focus] || p.product_focus} />
          <Field label="Agent Type" value={
            p.captive_or_independent === 'captive' ? 'Captive' :
            p.captive_or_independent === 'independent' ? 'Independent' :
            p.captive_or_independent === 'broker_dealer' ? 'Broker-Dealer Affiliated' : null
          } />
          <Field label="IMO / FMO / BGA" value={p.imo_fmo_affiliation} />
          <Field label="Carrier Appointments" value={p.carrier_appointments != null ? `${p.carrier_appointments} carriers` : null} />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Production Metrics</h3>
        <div className="space-y-3">
          <Field label="Annual Life Premium" value={p.annual_life_premium ? `$${p.annual_life_premium.toLocaleString()}` : null} />
          <Field label="Avg Case Size" value={p.avg_case_size ? `$${p.avg_case_size.toLocaleString()}` : null} />
          <Field label="Production Tier" value={TIER_LABELS[p.production_tier] || p.production_tier} />
          <Field label="Admin Support" value={p.has_admin_support === true ? 'Yes' : p.has_admin_support === false ? 'No (solo)' : null} />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Tech & Pain Points</h3>
        <div className="space-y-3">
          <Field label="Current Tech Stack" value={p.current_tech_stack} />
        </div>
        {p.pain_points && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Pain Points</p>
            <div className="flex flex-wrap gap-1.5">
              {p.pain_points.split(',').map((pain, i) => (
                <span key={i} className="text-xs bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full">
                  {pain.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {p.notes && (
        <div className="card p-5 col-span-2">
          <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{p.notes}</p>
        </div>
      )}
    </div>
  )
}

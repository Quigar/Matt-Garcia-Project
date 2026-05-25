import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Bot, Mail, Phone, Building, Calendar, TrendingUp } from 'lucide-react'
import { prospects, ai } from '../api'
import QualificationChat from '../components/QualificationChat'
import OutreachPanel from '../components/OutreachPanel'

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'qualify', label: 'AI Qualify' },
  { id: 'outreach', label: 'Outreach' },
]

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
  if (!prospect) return <div className="p-8 text-gray-500">Prospect not found.</div>

  const score = prospect.lead_score ?? 0
  const scoreColor = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-500'

  return (
    <div className="p-8">
      <button onClick={() => navigate('/prospects')} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm mb-6">
        <ArrowLeft size={16} /> Back to Prospects
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{prospect.full_name}</h1>
          <p className="text-gray-500 mt-1">{prospect.title} · {prospect.company}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Lead Score</p>
          <p className={`text-4xl font-bold ${scoreColor}`}>{score}</p>
        </div>
      </div>

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
      <p className="text-sm text-gray-900">{value || '—'}</p>
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
          <Field label="Company" value={p.company} />
          <Field label="Title" value={p.title} />
          <Field label="Source" value={p.source} />
        </div>
      </div>
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Agency Profile</h3>
        <div className="space-y-3">
          <Field label="Agency Size" value={p.agency_size} />
          <Field label="Lines of Business" value={p.lines_of_business} />
          <Field label="Tech Stack" value={p.current_tech_stack} />
          <Field label="Annual Premium Volume" value={p.annual_premium_volume ? `$${p.annual_premium_volume.toLocaleString()}` : null} />
          <Field label="# of Producers" value={p.num_producers} />
          <Field label="Has Ops Team" value={p.has_ops_team === true ? 'Yes' : p.has_ops_team === false ? 'No' : null} />
        </div>
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

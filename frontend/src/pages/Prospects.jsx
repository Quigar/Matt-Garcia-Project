import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { prospects } from '../api'
import AddProspectModal from '../components/AddProspectModal'

const STATUS_CONFIG = {
  lead: { label: 'Lead', color: 'bg-gray-100 text-gray-600' },
  contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-700' },
  qualified: { label: 'Qualified', color: 'bg-green-100 text-green-700' },
  unqualified: { label: 'Unqualified', color: 'bg-red-100 text-red-700' },
  appointment_set: { label: 'Appt Set', color: 'bg-purple-100 text-purple-700' },
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
  emerging: 'Emerging',
  growing: 'Growing',
  established: 'Established',
  top_producer: 'Top Producer',
}

const TIER_COLORS = {
  emerging: 'text-gray-400',
  growing: 'text-blue-500',
  established: 'text-green-500',
  top_producer: 'text-yellow-500 font-bold',
}

function ScoreBadge({ score }) {
  if (score >= 70) return <span className="badge-score-high">{score}</span>
  if (score >= 40) return <span className="badge-score-mid">{score}</span>
  return <span className="badge-score-low">{score}</span>
}

export default function Prospects() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['prospects', search, statusFilter, productFilter],
    queryFn: () => prospects.list({
      search: search || undefined,
      status: statusFilter || undefined,
      product_focus: productFilter || undefined,
    }),
  })

  const items = data?.items || []

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Life Agents</h1>
          <p className="text-gray-500 mt-1">{data?.total ?? 0} agents in your prospecting list</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Add Agent
        </button>
      </div>

      <div className="card mb-6 p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, company, IMO..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={productFilter}
          onChange={e => setProductFilter(e.target.value)}
        >
          <option value="">All products</option>
          <option value="iul_vul">IUL / VUL</option>
          <option value="annuities">Annuities</option>
          <option value="whole_life">Whole Life</option>
          <option value="term">Term Life</option>
          <option value="final_expense">Final Expense</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Agent</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Product Focus</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Production</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">IMO / FMO</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tech Stack</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Score</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No agents found. Add your first prospect to get started.
                  </td>
                </tr>
              ) : items.map(p => (
                <tr
                  key={p.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/prospects/${p.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.full_name}</p>
                    <p className="text-gray-400 text-xs">{p.company || p.title || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    {p.product_focus ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRODUCT_COLORS[p.product_focus] || 'bg-gray-100 text-gray-600'}`}>
                        {p.product_focus_label}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <p className={`text-xs font-medium ${TIER_COLORS[p.production_tier] || 'text-gray-500'}`}>
                      {TIER_LABELS[p.production_tier] || '—'}
                    </p>
                    {p.annual_life_premium ? (
                      <p className="text-xs text-gray-400">${(p.annual_life_premium / 1000).toFixed(0)}K/yr</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.imo_fmo_affiliation || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.current_tech_stack || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={p.lead_score ?? 0} />
                  </td>
                  <td className="px-4 py-3">
                    {STATUS_CONFIG[p.status] ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CONFIG[p.status].color}`}>
                        {STATUS_CONFIG[p.status].label}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddProspectModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

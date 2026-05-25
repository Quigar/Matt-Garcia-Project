import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, UserCheck, UserX, Clock, Star } from 'lucide-react'
import { prospects } from '../api'
import AddProspectModal from '../components/AddProspectModal'

const STATUS_CONFIG = {
  lead: { label: 'Lead', color: 'bg-gray-100 text-gray-600' },
  contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-700' },
  qualified: { label: 'Qualified', color: 'bg-green-100 text-green-700' },
  unqualified: { label: 'Unqualified', color: 'bg-red-100 text-red-700' },
  appointment_set: { label: 'Appt Set', color: 'bg-purple-100 text-purple-700' },
}

function ScoreBadge({ score }) {
  if (score >= 70) return <span className="badge-score-high">{score}</span>
  if (score >= 40) return <span className="badge-score-mid">{score}</span>
  return <span className="badge-score-low">{score}</span>
}

export default function Prospects() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['prospects', search, statusFilter],
    queryFn: () => prospects.list({ search: search || undefined, status: statusFilter || undefined }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => prospects.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prospects'] }),
  })

  const items = data?.items || []

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prospects</h1>
          <p className="text-gray-500 mt-1">{data?.total ?? 0} total prospects</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Add Prospect
        </button>
      </div>

      <div className="card mb-6 p-4 flex gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, company, email..."
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Prospect</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Company</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Lines of Business</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tech Stack</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Score</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Source</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No prospects found. Add your first prospect to get started.
                  </td>
                </tr>
              ) : (
                items.map(p => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/prospects/${p.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{p.full_name}</p>
                        <p className="text-gray-400 text-xs">{p.title}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.company || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.lines_of_business || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.current_tech_stack || '—'}</td>
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
                    <td className="px-4 py-3 text-gray-500 capitalize">{p.source || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddProspectModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

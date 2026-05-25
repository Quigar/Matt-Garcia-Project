import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, DollarSign, Lightbulb, ChevronRight } from 'lucide-react'
import { pipeline } from '../api'

const STAGE_CONFIG = {
  lead: { label: 'Lead', color: 'bg-gray-100 border-gray-300' },
  qualified: { label: 'Qualified', color: 'bg-blue-50 border-blue-200' },
  discovery_call: { label: 'Discovery', color: 'bg-indigo-50 border-indigo-200' },
  demo: { label: 'Demo', color: 'bg-purple-50 border-purple-200' },
  proposal: { label: 'Proposal', color: 'bg-orange-50 border-orange-200' },
  contracting: { label: 'Contracting', color: 'bg-yellow-50 border-yellow-200' },
  closed_won: { label: 'Onboarded', color: 'bg-green-50 border-green-200' },
  closed_lost: { label: 'Lost', color: 'bg-red-50 border-red-200' },
}

const PRODUCT_LABELS = {
  iul_vul: 'IUL/VUL', annuities: 'Annuities', whole_life: 'Whole Life',
  term: 'Term', final_expense: 'FE', mixed: 'Mixed',
}

function fmt(n) {
  if (!n) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export default function Pipeline() {
  const qc = useQueryClient()
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [loadingRecs, setLoadingRecs] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: pipeline.get,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => pipeline.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline'] }),
  })

  const handleGetRecommendations = async (entryId) => {
    setLoadingRecs(true)
    try {
      const result = await pipeline.recommendations(entryId)
      setRecommendations(result.recommendations)
    } finally {
      setLoadingRecs(false)
    }
  }

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>
  )

  const stages = data?.stages || []
  const summary = data?.summary || {}

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <p className="text-gray-500 mt-1">Track deals through the insurance sales cycle</p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Pipeline</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(summary.total_pipeline_value)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Weighted Value</p>
          <p className="text-2xl font-bold text-blue-600">{fmt(summary.weighted_pipeline_value)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Active Deals</p>
          <p className="text-2xl font-bold text-gray-900">{summary.active_deals ?? 0}</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.filter(s => s.stage !== 'closed_lost').map(stageData => {
          const config = STAGE_CONFIG[stageData.stage] || {}
          return (
            <div key={stageData.stage} className={`min-w-[220px] rounded-xl border-2 ${config.color} p-3`}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-700 text-sm">{config.label}</p>
                <span className="bg-white text-gray-500 text-xs font-bold px-1.5 py-0.5 rounded-full border">
                  {stageData.count}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">{fmt(stageData.total_value)}</p>
              <div className="space-y-2">
                {stageData.deals.map(deal => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onSelect={() => {
                      setSelectedEntry(deal)
                      setRecommendations(null)
                    }}
                    selected={selectedEntry?.id === deal.id}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {selectedEntry && (
        <div className="mt-8 card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900">{selectedEntry.prospect_name}</h3>
              <p className="text-gray-500 text-sm">{selectedEntry.company}</p>
            </div>
            <button
              onClick={() => handleGetRecommendations(selectedEntry.id)}
              disabled={loadingRecs}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Lightbulb size={15} />
              {loadingRecs ? 'Analyzing...' : 'AI Recommendations'}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs uppercase">Deal Value</p>
              <p className="font-semibold">{fmt(selectedEntry.deal_value)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase">Probability</p>
              <p className="font-semibold">{((selectedEntry.probability || 0) * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase">Lead Score</p>
              <p className="font-semibold">{selectedEntry.lead_score}/100</p>
            </div>
          </div>
          {recommendations && (
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-line">
              <p className="font-semibold text-blue-700 mb-2 flex items-center gap-1">
                <Lightbulb size={14} /> AI Recommendations
              </p>
              {recommendations}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DealCard({ deal, onSelect, selected }) {
  const score = deal.lead_score ?? 0
  const scoreColor = score >= 70 ? 'text-green-500' : score >= 40 ? 'text-yellow-500' : 'text-red-400'

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-lg p-3 cursor-pointer border transition-all ${
        selected ? 'border-blue-400 shadow-md' : 'border-gray-100 hover:border-gray-300'
      }`}
    >
      <p className="font-medium text-gray-900 text-xs truncate">{deal.prospect_name}</p>
      <div className="flex items-center gap-1 mt-0.5">
        {deal.product_focus && (
          <span className="text-xs text-gray-400">{PRODUCT_LABELS[deal.product_focus] || deal.product_focus}</span>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs font-semibold text-gray-700">
          {deal.deal_value ? `$${(deal.deal_value / 1000).toFixed(0)}K/yr` : '—'}
        </p>
        <span className={`text-xs font-bold ${scoreColor}`}>{score}</span>
      </div>
    </div>
  )
}

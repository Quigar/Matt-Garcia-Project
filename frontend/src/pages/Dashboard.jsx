import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Calendar, TrendingUp, DollarSign, Award, AlertTriangle } from 'lucide-react'
import { pipeline, appointments } from '../api'
import { format, parseISO } from 'date-fns'

function MetricCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

function fmt(n) {
  if (!n) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export default function Dashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['pipeline-metrics'],
    queryFn: pipeline.metrics,
  })
  const { data: upcomingAppointments } = useQuery({
    queryKey: ['appointments', { status: 'scheduled' }],
    queryFn: () => appointments.list({ status: 'scheduled' }),
  })

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const m = metrics || {}
  const upcoming = (upcomingAppointments || []).slice(0, 5)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Insurance AI consulting pipeline overview</p>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-8">
        <MetricCard icon={Users} label="Total Prospects" value={m.total_prospects ?? 0} color="blue" />
        <MetricCard icon={Award} label="Qualified" value={m.qualified_prospects ?? 0} sub={`${m.avg_lead_score ?? 0} avg score`} color="green" />
        <MetricCard icon={Calendar} label="Appointments" value={m.appointments_scheduled ?? 0} sub="upcoming" color="purple" />
        <MetricCard icon={TrendingUp} label="Win Rate" value={`${m.win_rate ?? 0}%`} sub={`${m.closed_won ?? 0} won`} color="orange" />
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        <div className="card p-5 col-span-1">
          <p className="text-sm text-gray-500 font-medium mb-1">Active Pipeline</p>
          <p className="text-3xl font-bold text-gray-900">{fmt(m.active_pipeline_value)}</p>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-500 font-medium mb-1">Revenue Closed</p>
            <p className="text-2xl font-bold text-green-600">{fmt(m.won_revenue)}</p>
          </div>
        </div>

        <div className="card p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Upcoming Appointments</h2>
            <a href="/appointments" className="text-blue-600 text-sm hover:underline">View all</a>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-gray-400 text-sm">No upcoming appointments</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((appt) => (
                <div key={appt.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appt.prospect_name}</p>
                    <p className="text-xs text-gray-400">{appt.prospect_company} · {appt.appointment_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-700">
                      {appt.scheduled_at ? format(parseISO(appt.scheduled_at), 'MMM d, h:mm a') : '—'}
                    </p>
                    <p className="text-xs text-blue-500">{appt.employee_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Pipeline by Stage</h2>
        <PipelineBar />
      </div>
    </div>
  )
}

function PipelineBar() {
  const { data } = useQuery({ queryKey: ['pipeline'], queryFn: pipeline.get })
  if (!data) return null

  const stages = (data.stages || []).filter(s =>
    !['closed_won', 'closed_lost'].includes(s.stage) && s.count > 0
  )
  const maxVal = Math.max(...stages.map(s => s.total_value), 1)

  const STAGE_LABELS = {
    lead: 'Lead',
    qualified: 'Qualified',
    discovery_call: 'Discovery',
    demo: 'Demo',
    proposal: 'Proposal',
    compliance_review: 'Compliance',
  }

  return (
    <div className="flex gap-4 items-end h-32">
      {stages.map(s => (
        <div key={s.stage} className="flex-1 flex flex-col items-center gap-1">
          <p className="text-xs text-gray-500 font-medium">{s.count}</p>
          <div
            className="w-full bg-blue-500 rounded-t-md opacity-80 hover:opacity-100 transition-opacity"
            style={{ height: `${Math.max((s.total_value / maxVal) * 80, 4)}px` }}
            title={`$${(s.total_value / 1000).toFixed(0)}K`}
          />
          <p className="text-xs text-gray-500">{STAGE_LABELS[s.stage] || s.stage}</p>
        </div>
      ))}
    </div>
  )
}

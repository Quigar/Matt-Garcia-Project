import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Calendar, Clock, User, Video } from 'lucide-react'
import { appointments } from '../api'
import { format, parseISO } from 'date-fns'
import ScheduleModal from '../components/ScheduleModal'

const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-orange-100 text-orange-700',
}

const TYPE_LABELS = {
  discovery: 'Discovery Call',
  demo: 'Demo',
  proposal_review: 'Proposal Review',
}

export default function Appointments() {
  const qc = useQueryClient()
  const [showSchedule, setShowSchedule] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const { data: apptList, isLoading } = useQuery({
    queryKey: ['appointments', statusFilter],
    queryFn: () => appointments.list({ status: statusFilter || undefined }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => appointments.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })

  const grouped = groupByDate(apptList || [])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 mt-1">Scheduled meetings and follow-ups</p>
        </div>
        <button onClick={() => setShowSchedule(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Schedule Appointment
        </button>
      </div>

      <div className="card mb-6 p-4">
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {Object.keys(STATUS_COLORS).map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">No appointments found. Schedule one to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, appts]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{date}</h3>
              <div className="space-y-3">
                {appts.map(appt => (
                  <div key={appt.id} className="card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-50 flex flex-col items-center justify-center text-blue-600">
                        <Clock size={14} />
                        <p className="text-xs font-bold mt-0.5">
                          {appt.scheduled_at ? format(parseISO(appt.scheduled_at), 'h:mm') : '--'}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{appt.title}</p>
                        <p className="text-sm text-gray-500">
                          {appt.prospect_name} · {appt.prospect_company}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <User size={12} /> {appt.employee_name}
                          </span>
                          <span className="text-xs text-gray-400">{appt.duration_minutes} min</span>
                          {appt.meeting_link && (
                            <a href={appt.meeting_link} target="_blank" rel="noreferrer"
                              className="text-xs text-blue-500 flex items-center gap-1 hover:underline"
                              onClick={e => e.stopPropagation()}>
                              <Video size={12} /> Join
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[appt.status] || ''}`}>
                        {appt.status?.replace('_', ' ')}
                      </span>
                      <select
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                        value={appt.status}
                        onChange={e => updateMutation.mutate({ id: appt.id, data: { status: e.target.value } })}
                        onClick={e => e.stopPropagation()}
                      >
                        {Object.keys(STATUS_COLORS).map(s => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} />}
    </div>
  )
}

function groupByDate(appts) {
  const groups = {}
  for (const appt of appts) {
    const label = appt.scheduled_at
      ? format(parseISO(appt.scheduled_at), 'EEEE, MMMM d, yyyy')
      : 'Unknown Date'
    if (!groups[label]) groups[label] = []
    groups[label].push(appt)
  }
  return groups
}

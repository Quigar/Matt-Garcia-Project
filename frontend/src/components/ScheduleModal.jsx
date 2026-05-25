import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { appointments, prospects } from '../api'
import { format } from 'date-fns'

export default function ScheduleModal({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    prospect_id: '', employee_id: '', title: '', date: '',
    time: '', duration_minutes: 30, appointment_type: 'discovery',
    meeting_link: '', notes: '',
  })
  const [error, setError] = useState(null)

  const { data: employeeList } = useQuery({
    queryKey: ['employees'],
    queryFn: appointments.employees.list,
  })

  const { data: prospectData } = useQuery({
    queryKey: ['prospects'],
    queryFn: () => prospects.list({ limit: 200 }),
  })

  const { data: slots } = useQuery({
    queryKey: ['slots', form.employee_id, form.date],
    queryFn: () => appointments.availableSlots(form.employee_id, form.date),
    enabled: !!(form.employee_id && form.date),
  })

  const mutation = useMutation({
    mutationFn: (data) => appointments.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['pipeline-metrics'] })
      onClose()
    },
    onError: (err) => setError(err.response?.data?.detail || 'Failed to schedule appointment'),
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    if (!form.date || !form.time) {
      setError('Please select a date and time')
      return
    }
    const scheduled_at = new Date(`${form.date}T${form.time}:00`)
    mutation.mutate({
      prospect_id: parseInt(form.prospect_id),
      employee_id: parseInt(form.employee_id),
      title: form.title,
      scheduled_at: scheduled_at.toISOString(),
      duration_minutes: parseInt(form.duration_minutes),
      appointment_type: form.appointment_type,
      meeting_link: form.meeting_link || null,
      notes: form.notes || null,
    })
  }

  const availableSlots = slots?.slots?.filter(s => s.available) || []

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Schedule Appointment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
          )}

          <div>
            <label className="text-xs text-gray-500 block mb-1">Prospect *</label>
            <select required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.prospect_id} onChange={set('prospect_id')}>
              <option value="">Select prospect</option>
              {(prospectData?.items || []).map(p => (
                <option key={p.id} value={p.id}>{p.full_name} — {p.company}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Assigned To *</label>
            <select required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.employee_id} onChange={set('employee_id')}>
              <option value="">Select employee</option>
              {(employeeList || []).map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Title *</label>
            <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Discovery Call" value={form.title} onChange={set('title')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Type</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.appointment_type} onChange={set('appointment_type')}>
                <option value="discovery">Discovery Call</option>
                <option value="demo">Demo</option>
                <option value="proposal_review">Proposal Review</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Duration</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.duration_minutes} onChange={set('duration_minutes')}>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Date *</label>
              <input required type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.date} onChange={set('date')} min={format(new Date(), 'yyyy-MM-dd')} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Time *</label>
              {availableSlots.length > 0 ? (
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.time} onChange={set('time')}>
                  <option value="">Pick a slot</option>
                  {availableSlots.map(s => (
                    <option key={s.time} value={s.time}>{s.time}</option>
                  ))}
                </select>
              ) : (
                <input type="time" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.time} onChange={set('time')} />
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Meeting Link</label>
            <input type="url" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://meet.google.com/..." value={form.meeting_link} onChange={set('meeting_link')} />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

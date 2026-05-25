import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { cases, prospects } from '../api'

const INITIAL = {
  prospect_id: '',
  client_name: '',
  client_age: '',
  carrier: '',
  product_type: '',
  face_amount: '',
  annual_premium: '',
  carrier_case_number: '',
  submitted_at: '',
  next_followup_date: '',
  requirements_outstanding: '',
  notes: '',
}

const CARRIERS = [
  'Pacific Life', 'North American', 'Nationwide', 'Lincoln Financial',
  'Protective Life', 'Allianz', 'Global Atlantic', 'Mutual of Omaha',
  'American Amicable', 'Foresters Financial', 'Transamerica', 'Prudential',
  'John Hancock', 'MetLife', 'AIG', 'Banner Life', 'William Penn',
  'Ohio National', 'Minnesota Life', 'Principal Financial', 'Other',
]

const PRODUCTS = [
  'Term (10-yr)', 'Term (15-yr)', 'Term (20-yr)', 'Term (30-yr)',
  'Whole Life', 'Final Expense WL', 'IUL', 'VUL', 'GUL',
  'FIA (Annuity)', 'MYGA (Annuity)', 'SPIA', 'Other',
]

export default function AddCaseModal({ onClose, defaultProspectId }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ ...INITIAL, prospect_id: defaultProspectId || '' })
  const [error, setError] = useState(null)

  const { data: agentData } = useQuery({
    queryKey: ['prospects'],
    queryFn: () => prospects.list({ limit: 200 }),
  })

  const mutation = useMutation({
    mutationFn: (data) => cases.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cases'] })
      qc.invalidateQueries({ queryKey: ['case-metrics'] })
      onClose()
    },
    onError: (err) => setError(err.response?.data?.detail || 'Failed to add case'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    mutation.mutate({
      ...form,
      prospect_id: parseInt(form.prospect_id),
      client_age: form.client_age ? parseInt(form.client_age) : null,
      face_amount: form.face_amount ? parseFloat(form.face_amount) : null,
      annual_premium: form.annual_premium ? parseFloat(form.annual_premium) : null,
      submitted_at: form.submitted_at ? new Date(form.submitted_at).toISOString() : null,
      next_followup_date: form.next_followup_date ? new Date(form.next_followup_date).toISOString() : null,
    })
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add Pending Case</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
          )}

          {/* Agent */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Agent *</label>
            <select
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.prospect_id}
              onChange={set('prospect_id')}
            >
              <option value="">Select agent</option>
              {(agentData?.items || []).map(p => (
                <option key={p.id} value={p.id}>{p.full_name} — {p.company || p.product_focus_label}</option>
              ))}
            </select>
          </div>

          <hr className="border-gray-100" />
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Client / Policy</p>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Client / Insured Name *" required value={form.client_name} onChange={set('client_name')} placeholder="e.g. John Smith" />
            <Field label="Insured Age" type="number" value={form.client_age} onChange={set('client_age')} />

            <div>
              <label className="text-xs text-gray-500 block mb-1">Carrier *</label>
              <select
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.carrier}
                onChange={set('carrier')}
              >
                <option value="">Select carrier</option>
                {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Product</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.product_type}
                onChange={set('product_type')}
              >
                <option value="">Select product</option>
                {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <Field label="Face Amount ($)" type="number" value={form.face_amount} onChange={set('face_amount')} placeholder="e.g. 500000" />
            <Field label="Annual Premium ($)" type="number" value={form.annual_premium} onChange={set('annual_premium')} placeholder="e.g. 8400" />
            <Field label="Carrier Case Number" value={form.carrier_case_number} onChange={set('carrier_case_number')} placeholder="e.g. PL-2024-00841" />
          </div>

          <hr className="border-gray-100" />
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Dates</p>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Submitted Date" type="date" value={form.submitted_at} onChange={set('submitted_at')} />
            <Field label="Next Follow-up Date" type="date" value={form.next_followup_date} onChange={set('next_followup_date')} />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Requirements Outstanding</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              placeholder="List what the carrier is still waiting for..."
              value={form.requirements_outstanding}
              onChange={set('requirements_outstanding')}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Notes</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              value={form.notes}
              onChange={set('notes')}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Adding...' : 'Add Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, required, ...props }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input
        required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...props}
      />
    </div>
  )
}

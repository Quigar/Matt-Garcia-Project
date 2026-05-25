import React, { useState } from 'react'
import { Shield, CheckCircle, ChevronRight, Heart } from 'lucide-react'
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

const PRODUCT_OPTIONS = [
  { value: 'term', label: 'Term Life', desc: '10–30 year coverage' },
  { value: 'whole_life', label: 'Whole Life', desc: 'Permanent + cash value' },
  { value: 'final_expense', label: 'Final Expense', desc: 'Burial & end-of-life costs' },
  { value: 'iul', label: 'IUL / VUL', desc: 'Index-linked growth' },
  { value: 'annuity', label: 'Annuity', desc: 'Retirement income stream' },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

export default function ConsumerLeadForm() {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    age: '', state: '', zip_code: '',
    product_type: '',
    coverage_amount: '', monthly_budget: '',
    health_class: '', tobacco_user: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        ...form,
        age: form.age ? parseInt(form.age) : null,
        coverage_amount: form.coverage_amount ? parseFloat(form.coverage_amount) : null,
        monthly_budget: form.monthly_budget ? parseFloat(form.monthly_budget) : null,
      }
      const { data } = await api.post('/leads/intake', payload)
      setSubmitted(data)
    } catch {
      setError('Something went wrong. Please try again or call us directly.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're All Set!</h2>
          <p className="text-gray-500 mb-4">
            Thank you for your request. A licensed life insurance agent will contact you within 24 hours to discuss your coverage options.
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 inline-block">
            <p className="text-sm text-blue-600 font-medium">Reference: <span className="font-bold">{submitted.reference}</span></p>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            No obligation. Licensed agents in your state only.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold leading-none">InsureFlow AI</p>
            <p className="text-blue-300 text-xs mt-0.5">Licensed Life Insurance Professionals</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart size={26} className="text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Get Your Free Life Insurance Quote</h1>
          <p className="text-blue-200">
            Answer a few quick questions and a licensed agent in your state will reach out with personalized options.
          </p>
          <div className="flex items-center justify-center gap-5 mt-4">
            {['No obligation', 'No spam', 'Local licensed agents'].map(t => (
              <span key={t} className="flex items-center gap-1.5 text-xs text-blue-300">
                <CheckCircle size={12} className="text-blue-400" /> {t}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Contact */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4">Your Information</h2>
            <div className="grid grid-cols-2 gap-3">
              <CField label="First Name *" value={form.first_name} onChange={v => set('first_name', v)} required />
              <CField label="Last Name *" value={form.last_name} onChange={v => set('last_name', v)} required />
              <CField label="Email Address *" type="email" value={form.email} onChange={v => set('email', v)} required />
              <CField label="Phone Number *" type="tel" value={form.phone} onChange={v => set('phone', v)} required />
              <CField label="Age" type="number" placeholder="e.g. 42" value={form.age} onChange={v => set('age', v)} />
              <div>
                <label className="block text-sm text-blue-200 font-medium mb-1.5">State</label>
                <select
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.state}
                  onChange={e => set('state', e.target.value)}
                >
                  <option value="" className="text-gray-900">Select state...</option>
                  {US_STATES.map(s => (
                    <option key={s} value={s} className="text-gray-900">{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Coverage needs */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4">Coverage Needs</h2>
            <div className="mb-4">
              <label className="block text-sm text-blue-200 font-medium mb-3">
                What type of coverage are you interested in?
              </label>
              <div className="grid grid-cols-1 gap-2">
                {PRODUCT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('product_type', form.product_type === opt.value ? '' : opt.value)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                      form.product_type === opt.value
                        ? 'bg-blue-600/50 border-blue-500 text-white'
                        : 'bg-white/5 border-white/10 text-blue-200 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-blue-200 font-medium mb-1.5">Coverage Amount ($)</label>
                <select
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.coverage_amount}
                  onChange={e => set('coverage_amount', e.target.value)}
                >
                  <option value="" className="text-gray-900">Select amount...</option>
                  <option value="50000" className="text-gray-900">$50,000</option>
                  <option value="100000" className="text-gray-900">$100,000</option>
                  <option value="250000" className="text-gray-900">$250,000</option>
                  <option value="500000" className="text-gray-900">$500,000</option>
                  <option value="1000000" className="text-gray-900">$1,000,000</option>
                  <option value="2000000" className="text-gray-900">$2,000,000+</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-blue-200 font-medium mb-1.5">Monthly Budget</label>
                <select
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.monthly_budget}
                  onChange={e => set('monthly_budget', e.target.value)}
                >
                  <option value="" className="text-gray-900">Select range...</option>
                  <option value="50" className="text-gray-900">Under $100/mo</option>
                  <option value="150" className="text-gray-900">$100–$200/mo</option>
                  <option value="250" className="text-gray-900">$200–$300/mo</option>
                  <option value="400" className="text-gray-900">$300–$500/mo</option>
                  <option value="600" className="text-gray-900">$500+/mo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Health */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4">Health Profile</h2>
            <div className="mb-4">
              <label className="block text-sm text-blue-200 font-medium mb-3">How would you rate your overall health?</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'excellent', label: 'Excellent', emoji: '💪' },
                  { value: 'good', label: 'Good', emoji: '😊' },
                  { value: 'fair', label: 'Fair', emoji: '🙂' },
                  { value: 'poor', label: 'Poor', emoji: '😔' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('health_class', form.health_class === opt.value ? '' : opt.value)}
                    className={`flex flex-col items-center py-3 rounded-xl border transition-colors ${
                      form.health_class === opt.value
                        ? 'bg-blue-600/50 border-blue-500 text-white'
                        : 'bg-white/5 border-white/10 text-blue-200 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xl mb-1">{opt.emoji}</span>
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.tobacco_user}
                onChange={e => set('tobacco_user', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-blue-200">I use tobacco products (cigarettes, cigars, vaping, etc.)</span>
            </label>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/40 rounded-lg px-4 py-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !form.first_name || !form.last_name || !form.email || !form.phone}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 text-base transition-colors"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Request My Free Quote <ChevronRight size={18} /></>
            )}
          </button>

          <p className="text-center text-blue-400 text-xs">
            Your information is secure and will only be shared with licensed agents in your state.
          </p>
        </form>
      </div>
    </div>
  )
}

function CField({ label, value, onChange, type = 'text', placeholder, required }) {
  return (
    <div>
      <label className="block text-sm text-blue-200 font-medium mb-1.5">{label}</label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

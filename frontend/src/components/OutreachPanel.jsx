import React, { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Mail, Sparkles, Copy, Check, AlertTriangle } from 'lucide-react'
import { ai } from '../api'
import { format, parseISO } from 'date-fns'

export default function OutreachPanel({ prospect }) {
  const [tone, setTone] = useState('consultative')
  const [generated, setGenerated] = useState(null)
  const [copied, setCopied] = useState(false)

  const { data: logs } = useQuery({
    queryKey: ['outreach-logs', prospect.id],
    queryFn: () => ai.outreachLogs(prospect.id),
  })

  const mutation = useMutation({
    mutationFn: () => ai.outreach({ prospect_id: prospect.id, tone }),
    onSuccess: (data) => setGenerated(data),
  })

  const copyToClipboard = () => {
    const text = `Subject: ${generated.subject}\n\n${generated.body}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (prospect.opt_out) {
    return (
      <div className="card p-6 flex items-start gap-3">
        <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-700">Prospect Opted Out</p>
          <p className="text-sm text-gray-500 mt-1">
            This prospect has opted out of communications. No outreach can be sent.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles size={16} className="text-blue-500" />
          Generate Outreach Email
        </h3>
        <div className="flex gap-3 mb-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Tone</label>
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={tone}
              onChange={e => setTone(e.target.value)}
            >
              <option value="consultative">Consultative</option>
              <option value="direct">Direct</option>
              <option value="educational">Educational</option>
              <option value="casual">Casual</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              <Sparkles size={15} />
              {mutation.isPending ? 'Generating...' : 'Generate Email'}
            </button>
          </div>
        </div>

        {generated && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between border-b border-gray-200">
              <p className="text-sm font-medium text-gray-700">Subject: {generated.subject}</p>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
              >
                {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700 whitespace-pre-line">{generated.body}</p>
            </div>
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Mail size={16} className="text-gray-500" />
          Outreach History
        </h3>
        {!logs || logs.length === 0 ? (
          <p className="text-gray-400 text-sm">No outreach logged yet.</p>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900">{log.subject || '(No subject)'}</p>
                  <div className="flex items-center gap-2">
                    {log.ai_generated && (
                      <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">AI</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {log.sent_at ? format(parseISO(log.sent_at), 'MMM d, h:mm a') : ''}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{log.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

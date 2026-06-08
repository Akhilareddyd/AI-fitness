'use client'

import { useState, useEffect } from 'react'
import { Activity, Plus, Loader2, TrendingDown } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { supabase, type Measurement } from '@/lib/supabase'

export default function MeasurementsPage() {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], weight_kg: '', notes: '' })

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('measurements')
      .select('*')
      .order('date', { ascending: false })
      .limit(60)
    setMeasurements((data as Measurement[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    setAdding(true)
    await supabase.from('measurements').insert({
      date: form.date,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      notes: form.notes || null,
    })
    setForm({ date: new Date().toISOString().split('T')[0], weight_kg: '', notes: '' })
    setAdding(false)
    load()
  }

  const chartData = [...measurements]
    .filter((m) => m.weight_kg)
    .reverse()
    .map((m) => ({
      date: m.date.slice(5),
      weight: m.weight_kg,
    }))

  const latest = measurements.find((m) => m.weight_kg)
  const oldest = [...measurements].reverse().find((m) => m.weight_kg)
  const change = latest && oldest && latest.id !== oldest.id
    ? Number((latest.weight_kg! - oldest.weight_kg!).toFixed(1))
    : null

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-zinc-100 mb-5 flex items-center gap-2">
        <Activity className="w-5 h-5 text-orange-400" />
        Progress
      </h1>

      {/* Summary cards */}
      {latest?.weight_kg && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="text-xs text-zinc-400 mb-1">Current weight</div>
            <div className="text-2xl font-bold text-zinc-100">{latest.weight_kg}<span className="text-sm font-normal text-zinc-400 ml-1">kg</span></div>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="text-xs text-zinc-400 mb-1">Goal</div>
            <div className="text-2xl font-bold text-emerald-400">54<span className="text-sm font-normal text-emerald-600 ml-1">kg</span></div>
            {change !== null && (
              <div className={`text-xs mt-1 flex items-center gap-1 ${change < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                <TrendingDown className="w-3 h-3" />
                {change < 0 ? `${Math.abs(change)}kg lost` : `${change}kg gained`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 mb-5">
          <h3 className="text-sm font-medium text-zinc-100 mb-4">Weight trend</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                labelStyle={{ color: '#64748B' }}
                itemStyle={{ color: '#DC2626' }}
                formatter={(v: number) => [`${v} kg`, 'Weight']}
              />
              <ReferenceLine y={54} stroke="#10b981" strokeDasharray="4 2" strokeOpacity={0.5} />
              <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add form */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 mb-5 space-y-3">
        <h2 className="text-sm font-medium text-zinc-100">Log measurement</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
              placeholder="68.5"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Notes (optional)</label>
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="e.g. Morning, post-workout"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={adding || !form.weight_kg}
          className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Log weight
        </button>
      </div>

      {/* History */}
      {loading ? (
        <div className="flex justify-center py-10 text-zinc-500"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : measurements.length === 0 ? (
        <p className="text-center text-zinc-500 text-sm py-10">No measurements yet.</p>
      ) : (
        <div className="space-y-2">
          {measurements.map((m) => (
            <div key={m.id} className="flex items-center justify-between bg-zinc-900 rounded-xl border border-zinc-800 px-4 py-3">
              <span className="text-xs text-zinc-400">{m.date}</span>
              <span className="text-sm font-semibold text-zinc-100">{m.weight_kg ?? '—'} kg</span>
              {m.notes && <span className="text-xs text-zinc-500 max-w-[120px] truncate">{m.notes}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

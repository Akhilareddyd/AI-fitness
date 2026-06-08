'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Dumbbell,
  UtensilsCrossed,
  Activity,
  Sparkles,
  Settings,
  Flame,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const links = [
  { href: '/',             label: 'Dashboard', icon: LayoutDashboard, color: '#6D28D9' },
  { href: '/workouts',     label: 'Workouts',  icon: Dumbbell,         color: '#DC2626' },
  { href: '/nutrition',    label: 'Nutrition', icon: UtensilsCrossed,  color: '#B45309' },
  { href: '/measurements', label: 'Progress',  icon: Activity,         color: '#2563EB' },
  { href: '/coach',        label: 'AI Coach',  icon: Sparkles,         color: '#6D28D9' },
]

function calcStreak(dates: string[]): number {
  const s = new Set(dates)
  let count = 0
  const d = new Date()
  d.setDate(d.getDate() - 1)
  for (let i = 0; i < 30; i++) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) {
      if (!s.has(d.toISOString().split('T')[0])) break
      count++
    }
    d.setDate(d.getDate() - 1)
  }
  return count
}

export default function Nav() {
  const pathname = usePathname()
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    const ago = new Date()
    ago.setDate(ago.getDate() - 30)
    supabase
      .from('exercise_logs')
      .select('date')
      .gte('date', ago.toISOString().split('T')[0])
      .then(({ data }) => {
        if (data) setStreak(calcStreak(Array.from(new Set(data.map((l: { date: string }) => l.date)))))
      })
  }, [])

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 z-40"
        style={{
          background: '#FFFFFF',
          borderRight: '1px solid #F3F4F6',
          boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
        }}
      >
        {/* Brand */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base select-none"
              style={{ background: 'rgba(109,40,217,0.08)' }}
            >
              ✦
            </div>
            <div>
              <div className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: '#6D28D9' }}>
                Akhila&apos;s
              </div>
              <div className="text-sm font-bold leading-tight" style={{ color: '#0F172A' }}>
                Wellness
              </div>
            </div>
          </div>
        </div>

        <div className="mx-4 mb-3" style={{ height: 1, background: '#F3F4F6' }} />

        {/* Nav links */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {links.map(({ href, label, icon: Icon, color }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                style={active ? { background: `${color}10` } : {}}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                  style={{ background: active ? `${color}18` : 'transparent' }}
                >
                  <Icon
                    className="w-4 h-4 transition-colors"
                    style={{ color: active ? color : '#94A3B8' }}
                  />
                </div>
                <span
                  className="text-sm font-medium transition-colors"
                  style={{ color: active ? color : '#64748B' }}
                >
                  {label}
                </span>
                {active && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: color }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 space-y-1.5">
          {streak > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(180,83,9,0.06)' }}
            >
              <Flame className="w-3.5 h-3.5 shrink-0" style={{ color: '#B45309' }} />
              <span className="text-xs font-medium" style={{ color: '#B45309' }}>
                {streak} day streak
              </span>
              <span className="ml-auto text-sm">🔥</span>
            </div>
          )}

          <div style={{ height: 1, background: '#F3F4F6' }} />

          {/* Profile */}
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: 'rgba(109,40,217,0.08)', color: '#6D28D9' }}
            >
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate" style={{ color: '#0F172A' }}>
                Akhila Reddy
              </div>
              <div className="text-xs truncate" style={{ color: '#94A3B8' }}>
                Goal: 54 kg
              </div>
            </div>
          </div>

          {/* Settings */}
          <button
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-gray-50"
            style={{ color: '#94A3B8' }}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
        style={{
          background: '#FFFFFF',
          borderTop: '1px solid #F3F4F6',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.04)',
        }}
      >
        {links.map(({ href, label, icon: Icon, color }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-all"
              style={{ color: active ? color : '#94A3B8' }}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}

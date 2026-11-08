import { useCallback, useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowUpRight, Eye, Lightbulb, MousePointerClick, RefreshCw, Users, MessageSquare } from 'lucide-react'
import LandlordSidebar from '../../components/layout/LandlordSidebar'
import AuthGuard from '../../components/auth/AuthGuard'
import { getLandlordAnalytics, type LandlordAnalytics } from '../../lib/property-analytics'

type Range = 7 | 30 | 90 | 'all'
const ranges: { label: string; value: Range }[] = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: 'All time', value: 'all' },
]

function number(value: number) {
  return value.toLocaleString()
}

function percent(value: number | undefined) {
  return `${(value ?? 0).toFixed(1)}%`
}

function getRecommendations(data: LandlordAnalytics | null) {
  if (!data) return []

  const { metrics, properties } = data
  const recommendations: { title: string; detail: string }[] = []

  if (metrics.impressions === 0 && metrics.views === 0) {
    return [{
      title: 'Collecting property activity',
      detail: 'No property impressions or detail views were recorded in this date range. Try a longer range, or check again after visitors browse your listings.',
    }]
  }

  if (metrics.impressions >= 20 && (metrics.clickThroughRate ?? 0) < 5) {
    recommendations.push({
      title: 'Improve listing-card engagement',
      detail: `Your properties received ${number(metrics.impressions)} impressions and ${number(metrics.views)} detail views (${percent(metrics.clickThroughRate)} click-through). Consider testing a clearer title or stronger cover photo, then compare the same date range.`,
    })
  }

  if (metrics.views >= 10 && metrics.enquiries === 0) {
    recommendations.push({
      title: 'Make the next step clearer',
      detail: `${number(metrics.views)} detail views have not led to a recorded enquiry. Review the listing description, key property details, and enquiry instructions.`,
    })
  }

  const comparable = properties
    .filter(property => property.impressions >= 10)
    .map(property => ({
      ...property,
      clickThroughRate: property.impressions ? property.views / property.impressions * 100 : 0,
    }))
    .sort((a, b) => b.clickThroughRate - a.clickThroughRate)
  const best = comparable[0]
  const lower = comparable[comparable.length - 1]
  if (best && lower && best.id !== lower.id && best.clickThroughRate - lower.clickThroughRate >= 5) {
    recommendations.push({
      title: 'Use your stronger listing as a reference',
      detail: `${best.title} has a ${percent(best.clickThroughRate)} click-through rate, compared with ${percent(lower.clickThroughRate)} for ${lower.title}. Compare how the listings present their titles and cover photos; the difference is a useful signal, not proof of cause.`,
    })
  }

  if (metrics.enquiries > 0 && recommendations.length < 3) {
    recommendations.push({
      title: 'Keep enquiry-ready listings current',
      detail: `${number(metrics.enquiries)} enquiries were started in this period. Keep availability and property details up to date, and follow up through your usual support process.`,
    })
  }

  return recommendations.slice(0, 3)
}

export default function LandlordInsights() {
  const [range, setRange] = useState<Range>(30)
  const [propertyId, setPropertyId] = useState('')
  const [data, setData] = useState<LandlordAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await getLandlordAnalytics(range, propertyId || undefined))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load property insights.')
    } finally {
      setLoading(false)
    }
  }, [range, propertyId])

  useEffect(() => { void load() }, [load])

  const metrics = data?.metrics
  const summary = [
    { label: 'Impressions', value: metrics?.impressions ?? 0, icon: Eye },
    { label: 'Property views', value: metrics?.views ?? 0, icon: ArrowUpRight },
    { label: 'Unique visitors', value: metrics?.uniqueVisitors ?? 0, icon: Users },
    { label: 'Enquiries', value: metrics?.enquiries ?? 0, icon: MessageSquare },
  ]
  const recommendations = getRecommendations(data)

  return (
    <AuthGuard require="landlord">
      <div className="flex h-dvh overflow-hidden bg-[#f7f8fa]">
        <LandlordSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white py-3 pl-14 pr-4 md:px-8">
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight text-slate-900">Property Insights</h1>
              <p className="mt-0.5 text-[11px] text-slate-500">Aggregate performance for your listings.</p>
            </div>
            <button type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh insights"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </header>

          <main className="flex-1 overflow-y-auto px-4 pb-24 pt-5 sm:px-6 md:px-8 md:pb-8">
            <div className="mx-auto max-w-[1440px] space-y-5">
              <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500">
                  Property
                  <select value={propertyId} onChange={event => setPropertyId(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 sm:w-72 sm:flex-none">
                    <option value="">All properties</option>
                    {(data?.propertyOptions ?? []).map(property => (
                      <option key={property.id} value={property.id}>{property.title}</option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-1.5" aria-label="Date range">
                  {ranges.map(option => (
                    <button key={option.value} type="button" onClick={() => setRange(option.value)}
                      aria-pressed={range === option.value}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${range === option.value ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>

              {error && (
                <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <span>{error}</span>
                  <button type="button" onClick={() => void load()} className="shrink-0 font-semibold underline">Try again</button>
                </div>
              )}

              <section aria-label="Property performance metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {summary.map(item => {
                  const Icon = item.icon
                  return (
                    <article key={item.label} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-500">{item.label}</p>
                        <Icon className="h-4 w-4 text-slate-400" />
                      </div>
                      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{loading ? '—' : number(item.value)}</p>
                    </article>
                  )
                })}
              </section>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,.7fr)]">
                <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Views over time</h2>
                      <p className="mt-1 text-xs text-slate-500">Daily property detail views</p>
                    </div>
                    <Eye className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="mt-4 h-56 w-full">
                    {!loading && data?.timeseries.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.timeseries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="propertyViewsFill" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#eef2f7" vertical={false} />
                          <XAxis dataKey="date" tickFormatter={value => new Date(`${value}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                          <Tooltip labelFormatter={value => new Date(`${value}T00:00:00`).toLocaleDateString()} />
                          <Area type="monotone" dataKey="views" stroke="#2563eb" strokeWidth={2} fill="url(#propertyViewsFill)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
                        {loading ? 'Loading activity…' : 'No property views in this period.'}
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <h2 className="text-sm font-semibold text-slate-900">Conversion</h2>
                  <p className="mt-1 text-xs text-slate-500">Engagement across the selected listings</p>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <span className="flex items-center gap-2 text-sm text-slate-600"><MousePointerClick className="h-4 w-4 text-blue-600" /> Click-through rate</span>
                      <strong className="text-lg tabular-nums text-slate-900">{loading ? '—' : percent(metrics?.clickThroughRate)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2 text-sm text-slate-600"><MessageSquare className="h-4 w-4 text-blue-600" /> Enquiry conversion</span>
                      <strong className="text-lg tabular-nums text-slate-900">{loading ? '—' : percent(metrics?.enquiryConversionRate)}</strong>
                    </div>
                  </div>
                  <div className="mt-5 rounded-lg bg-blue-50 px-3 py-2.5 text-xs leading-relaxed text-blue-800">
                    Click-through rate is views ÷ impressions. Enquiry conversion is enquiries started ÷ views.
                  </div>
                </section>
              </div>

              <section aria-label="Recommendations based on recorded activity" className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700">
                    <Lightbulb className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-slate-900">Recommendations</h2>
                    <p className="mt-1 text-xs text-slate-600">Practical signals from the selected date range. These are directional, not guarantees.</p>
                    {loading ? (
                      <p className="mt-3 text-sm text-slate-500">Analyzing recorded activity…</p>
                    ) : recommendations.length ? (
                      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                        {recommendations.map(recommendation => (
                          <li key={recommendation.title} className="rounded-lg border border-blue-100 bg-white p-3">
                            <h3 className="text-xs font-semibold text-slate-800">{recommendation.title}</h3>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">{recommendation.detail}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-slate-600">No clear follow-up signal in this period. Continue monitoring as more activity is recorded.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Performance by property</h2>
                    <p className="mt-1 text-xs text-slate-500">Only aggregate totals are shown.</p>
                  </div>
                  {data?.topProperty && (
                    <p className="max-w-full truncate rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      Top performer: {data.topProperty.title}
                    </p>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Property</th>
                        <th className="px-4 py-3 text-right">Impressions</th>
                        <th className="px-4 py-3 text-right">Views</th>
                        <th className="px-4 py-3 text-right">Unique</th>
                        <th className="px-4 py-3 text-right">Enquiries</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.properties ?? []).map(property => (
                        <tr key={property.id} className="hover:bg-slate-50/70">
                          <td className="max-w-sm px-5 py-3">
                            <button type="button" onClick={() => setPropertyId(property.id)} className="block truncate text-left font-medium text-slate-800 hover:text-blue-700">
                              {property.title}
                            </button>
                            <span className="text-xs text-slate-400">{property.status.replaceAll('_', ' ')}</span>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-600">{number(property.impressions)}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">{number(property.views)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-600">{number(property.uniqueVisitors)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-600">{number(property.enquiries)}</td>
                        </tr>
                      ))}
                      {!loading && !data?.properties.length && (
                        <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">No properties are available for this account.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

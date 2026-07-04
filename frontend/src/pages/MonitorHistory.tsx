import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ErrorAlert } from '../components/ErrorAlert'
import { StatusIndicator } from '../components/StatusIndicator'
import { formatDateTime, getHostname } from '../lib/utils'

const LIMIT = 20

interface Monitor {
  id: number
  url: string
}

interface HistoryEntry {
  id: number
  status_code: number | null
  response_time_ms: number
  status: 'up' | 'down'
  checked_at: string
}

interface HistoryResponse {
  page: number
  limit: number
  total: number
  total_pages: number
  status?: string
  data: HistoryEntry[]
}

type StatusFilter = 'all' | 'up' | 'down'

function HistorySkeleton() {
  return (
    <tbody>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-zinc-100">
          <td className="px-5 py-4"><div className="shimmer h-6 w-20 rounded-full" /></td>
          <td className="px-5 py-4"><div className="shimmer h-4 w-12 rounded" /></td>
          <td className="px-5 py-4"><div className="shimmer h-4 w-14 rounded" /></td>
          <td className="px-5 py-4"><div className="shimmer h-4 w-36 rounded" /></td>
        </tr>
      ))}
    </tbody>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition duration-200 ${
        active
          ? 'bg-zinc-900 text-white shadow-sm'
          : 'text-zinc-600 hover:bg-zinc-100'
      }`}
    >
      {children}
    </button>
  )
}

function MonitorHistory() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const statusParam = searchParams.get('status')
  const statusFilter: StatusFilter =
    statusParam === 'up' || statusParam === 'down' ? statusParam : 'all'

  const [monitor, setMonitor] = useState<Monitor | null>(null)
  const [history, setHistory] = useState<HistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      })
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const [monitorsRes, historyRes] = await Promise.all([
        fetch(`${baseUrl}/monitors`),
        fetch(`${baseUrl}/monitors/${id}/history?${params}`),
      ])

      if (!monitorsRes.ok) {
        throw new Error(`Failed to fetch monitor (${monitorsRes.status})`)
      }
      if (!historyRes.ok) {
        if (historyRes.status === 404) {
          throw new Error('Monitor not found')
        }
        throw new Error(`Failed to fetch history (${historyRes.status})`)
      }

      const monitors: Monitor[] = await monitorsRes.json()
      const historyData: HistoryResponse = await historyRes.json()
      const found = monitors.find((m) => m.id === Number(id))

      setMonitor(found ?? null)
      setHistory(historyData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [id, page, statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function setFilter(filter: StatusFilter) {
    const next = new URLSearchParams(searchParams)
    next.delete('page')
    if (filter === 'all') {
      next.delete('status')
    } else {
      next.set('status', filter)
    }
    setSearchParams(next)
  }

  function setPage(nextPage: number) {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(nextPage))
    setSearchParams(next)
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-100 via-zinc-50 to-zinc-100" />
      <div className="bg-grid pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-5xl px-6 py-12 sm:px-8">
        <Link
          to="/"
          className="animate-fade-in mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 0 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Back to monitors
        </Link>

        <header className="animate-fade-in-up mb-8">
          <p className="mb-2 text-sm font-medium text-zinc-500">Check history</p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            {monitor ? getHostname(monitor.url) : `Monitor #${id}`}
          </h1>
          {monitor && (
            <p className="mt-2 truncate text-sm text-zinc-500">{monitor.url}</p>
          )}
        </header>

        {error && (
          <div className="mb-6">
            <ErrorAlert message={error} />
          </div>
        )}

        <div className="animate-fade-in-up mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
            <FilterButton active={statusFilter === 'all'} onClick={() => setFilter('all')}>
              All
            </FilterButton>
            <FilterButton active={statusFilter === 'up'} onClick={() => setFilter('up')}>
              Up
            </FilterButton>
            <FilterButton active={statusFilter === 'down'} onClick={() => setFilter('down')}>
              Down
            </FilterButton>
          </div>

          {history && !loading && (
            <p className="text-sm text-zinc-500">
              {history.total} record{history.total === 1 ? '' : 's'}
            </p>
          )}
        </div>

        <div className="animate-fade-in-up overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-md shadow-zinc-900/[0.06]">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Status code</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Response</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Checked at</th>
              </tr>
            </thead>

            {loading ? (
              <HistorySkeleton />
            ) : history && history.data.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center">
                    <p className="text-sm font-medium text-zinc-900">No history found</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {statusFilter === 'all'
                        ? 'Health checks will appear here once monitoring starts.'
                        : `No ${statusFilter} checks recorded yet.`}
                    </p>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-zinc-100">
                {history?.data.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className="animate-fade-in-up transition-colors hover:bg-zinc-50/80"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <td className="px-5 py-4">
                      <StatusIndicator status={entry.status} />
                    </td>
                    <td className="px-5 py-4 text-sm font-medium tabular-nums text-zinc-700">
                      {entry.status_code ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium tabular-nums text-zinc-700">
                      {entry.response_time_ms}ms
                    </td>
                    <td className="px-5 py-4 text-sm text-zinc-500">
                      {formatDateTime(entry.checked_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>

          {history && history.total_pages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 px-5 py-3">
              <p className="text-sm text-zinc-500">
                Page {history.page} of {history.total_pages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= history.total_pages}
                  onClick={() => setPage(page + 1)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MonitorHistory

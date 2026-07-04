import { useCallback, useEffect, useState } from 'react'
import { IoAdd, IoGlobeOutline, IoRefresh } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'
import { ChevronRightIcon } from '../components/ChevronRightIcon'
import { ErrorAlert } from '../components/ErrorAlert'
import { StatusIndicator } from '../components/StatusIndicator'
import { formatLastChecked, getHostname } from '../lib/utils'

interface Monitor {
  id: number
  url: string
  status: 'up' | 'down' | null
  response_time_ms: number | null
  last_checked: string | null
}

interface CreateMonitorResponse {
  created: Monitor[]
  duplicates?: string[]
}

interface CreateMonitorError {
  error: string
  duplicates?: string[]
  invalid_urls?: string[]
}

function isValidHttpsUrl(value: string) {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

function StatCard({
  label,
  value,
  accent,
  delay,
}: {
  label: string
  value: number
  accent: 'default' | 'up' | 'down'
  delay: string
}) {
  const styles = {
    default: {
      card: 'border-zinc-200 bg-white',
      bar: 'bg-zinc-900',
      label: 'text-zinc-500',
      value: 'text-zinc-900',
    },
    up: {
      card: 'border-emerald-200 bg-emerald-50',
      bar: 'bg-emerald-500',
      label: 'text-emerald-700/70',
      value: 'text-emerald-700',
    },
    down: {
      card: 'border-red-200 bg-red-50',
      bar: 'bg-red-500',
      label: 'text-red-700/70',
      value: 'text-red-700',
    },
  }[accent]

  return (
    <div
      className={`animate-fade-in-up relative overflow-hidden rounded-xl border p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${styles.card}`}
      style={{ animationDelay: delay }}
    >
      <div className={`absolute top-0 left-0 h-full w-1 ${styles.bar}`} />
      <p className={`pl-3 text-xs font-semibold uppercase tracking-wider ${styles.label}`}>
        {label}
      </p>
      <p className={`mt-1 pl-3 text-3xl font-semibold tracking-tight ${styles.value}`}>
        {value}
      </p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="border-b border-zinc-100">
          <td className="px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="shimmer h-9 w-9 rounded-lg" />
              <div className="space-y-2">
                <div className="shimmer h-3.5 w-36 rounded" />
                <div className="shimmer h-3 w-52 rounded" />
              </div>
            </div>
          </td>
          <td className="px-5 py-4"><div className="shimmer h-6 w-24 rounded-full" /></td>
          <td className="px-5 py-4"><div className="shimmer h-4 w-14 rounded" /></td>
          <td className="px-5 py-4"><div className="shimmer h-4 w-20 rounded" /></td>
          <td className="px-5 py-4"><div className="shimmer h-4 w-4 rounded" /></td>
        </tr>
      ))}
    </tbody>
  )
}

function Monitor() {
  const navigate = useNavigate()
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalClosing, setIsModalClosing] = useState(false)
  const [urlInputs, setUrlInputs] = useState<string[]>([''])
  const [modalError, setModalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const upCount = monitors.filter((m) => m.status === 'up').length
  const downCount = monitors.filter((m) => m.status === 'down').length

  const fetchMonitors = useCallback((options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false

    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    return fetch(`${import.meta.env.VITE_API_BASE_URL}/monitors`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch monitors (${res.status})`)
        }
        return res.json()
      })
      .then(setMonitors)
      .catch((err: Error) => setError(err.message))
      .finally(() => {
        if (silent) {
          setRefreshing(false)
        } else {
          setLoading(false)
        }
      })
  }, [])

  useEffect(() => {
    fetchMonitors()
  }, [fetchMonitors])

  useEffect(() => {
    if (!isModalOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isModalOpen])

  function openModal() {
    setUrlInputs([''])
    setModalError(null)
    setIsModalClosing(false)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalClosing(true)
    setTimeout(() => {
      setIsModalOpen(false)
      setIsModalClosing(false)
      setUrlInputs([''])
      setModalError(null)
    }, 200)
  }

  function updateUrlInput(index: number, value: string) {
    setUrlInputs((prev) => prev.map((url, i) => (i === index ? value : url)))
  }

  function addUrlInput() {
    setUrlInputs((prev) => [...prev, ''])
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setModalError(null)

    const urls = [...new Set(
      urlInputs.map((url) => url.trim()).filter(Boolean),
    )]

    if (urls.length === 0) {
      setModalError('At least one URL is required')
      return
    }

    const invalidUrls = urls.filter((url) => !isValidHttpsUrl(url))
    if (invalidUrls.length > 0) {
      setModalError(
        `Only HTTPS URLs are allowed. Invalid: ${invalidUrls.join(', ')}`,
      )
      return
    }

    const body = urls.length === 1 ? { url: urls[0] } : { urls }

    setSubmitting(true)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/monitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data: CreateMonitorResponse & CreateMonitorError = await res.json()

      if (res.status === 201) {
        closeModal()
        await fetchMonitors()
        return
      }

      if (res.status === 409) {
        const duplicates = data.duplicates?.join(', ') ?? ''
        setModalError(
          duplicates
            ? `${data.error}: ${duplicates}`
            : data.error ?? 'All URLs already exist',
        )
        return
      }

      if (res.status === 400) {
        const invalid = data.invalid_urls?.join(', ') ?? ''
        setModalError(
          invalid
            ? `${data.error}: ${invalid}`
            : data.error ?? 'Invalid URL format',
        )
        return
      }

      setModalError(data.error ?? `Request failed (${res.status})`)
    } catch {
      setModalError('Failed to add monitor. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-100 via-zinc-50 to-zinc-100" />
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-indigo-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-0 h-96 w-96 rounded-full bg-emerald-200/20 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-6 py-12 sm:px-8">
        <header
          className="animate-fade-in-up mb-12 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"
          style={{ animationDelay: '0ms' }}
        >
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-indigo-50/80 px-3 py-1 text-xs font-medium text-indigo-700 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
              </span>
              Live monitoring
            </div>
            <h1 className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-600 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
              Monitors
            </h1>
            <p className="mt-3 max-w-md text-base text-zinc-500">
              Know the moment your endpoints go down. Simple, fast, reliable.
            </p>
          </div>
          <div className="animate-fade-in-up flex items-center gap-3" style={{ animationDelay: '100ms' }}>
            <button
              type="button"
              onClick={() => fetchMonitors({ silent: true })}
              disabled={refreshing || loading}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IoRefresh className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={openModal}
              className="group inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white shadow-lg shadow-zinc-900/20 transition duration-300 hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-xl hover:shadow-zinc-900/25 active:translate-y-0"
            >
              <IoAdd className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              Add URL
            </button>
          </div>
        </header>

        {!loading && monitors.length > 0 && (
          <div className="mb-8 grid grid-cols-3 gap-4">
            <StatCard label="Total" value={monitors.length} accent="default" delay="150ms" />
            <StatCard label="Up" value={upCount} accent="up" delay="200ms" />
            <StatCard label="Down" value={downCount} accent="down" delay="250ms" />
          </div>
        )}

        {error && (
          <div className="animate-fade-in-up mb-8" style={{ animationDelay: '150ms' }}>
            <ErrorAlert message={error} />
          </div>
        )}

        <div
          className="animate-fade-in-up overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-md shadow-zinc-900/[0.06]"
          style={{ animationDelay: '200ms' }}
        >
          <div className="border-b border-zinc-100 bg-zinc-50/80 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">All endpoints</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {loading ? 'Fetching latest status...' : `${monitors.length} monitor${monitors.length === 1 ? '' : 's'} tracked`}
            </p>
          </div>

          <table className="min-w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">URL</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Response</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Last checked</th>
                <th className="w-10 px-5 py-3" aria-hidden="true" />
              </tr>
            </thead>

          {loading ? (
            <LoadingSkeleton />
          ) : monitors.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={5}>
                  <div className="animate-fade-in flex flex-col items-center px-6 py-20 text-center">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100 ring-1 ring-indigo-200/60">
                      <IoGlobeOutline className="h-7 w-7 text-indigo-600" />
                    </div>
                    <p className="text-base font-semibold text-zinc-900">No monitors yet</p>
                    <p className="mt-2 max-w-xs text-sm text-zinc-500">
                      Add your first HTTPS endpoint and we&apos;ll start checking it automatically.
                    </p>
                    <button
                      type="button"
                      onClick={openModal}
                      className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition duration-300 hover:border-zinc-300 hover:shadow"
                    >
                      <IoAdd className="h-4 w-4" />
                      Add your first URL
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="divide-y divide-zinc-100">
              {monitors.map((monitor, index) => (
                <tr
                  key={monitor.id}
                  onClick={() => navigate(`/monitor/${monitor.id}`)}
                  className="animate-fade-in-up group cursor-pointer transition-colors duration-150 hover:bg-zinc-50/80"
                  style={{ animationDelay: `${index * 50 + 250}ms` }}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold uppercase text-zinc-600 ring-1 ring-zinc-200/80">
                        {getHostname(monitor.url).slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {getHostname(monitor.url)}
                        </p>
                        <p className="truncate text-xs text-zinc-400">{monitor.url}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusIndicator status={monitor.status} />
                  </td>
                  <td className="px-5 py-4 text-sm font-medium tabular-nums text-zinc-700">
                    {monitor.response_time_ms != null
                      ? `${monitor.response_time_ms}ms`
                      : '—'}
                  </td>
                  <td className="px-5 py-4 text-sm text-zinc-500">
                    {formatLastChecked(monitor.last_checked)}
                  </td>
                  <td className="px-5 py-4 text-zinc-400">
                    <ChevronRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </td>
                </tr>
              ))}
            </tbody>
          )}
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className={`absolute inset-0 bg-zinc-900/30 backdrop-blur-sm ${
              isModalClosing ? 'animate-backdrop-out' : 'animate-fade-in'
            }`}
            onClick={closeModal}
            aria-label="Close modal"
          />
          <div
            className={`relative w-full max-w-md overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-2xl shadow-zinc-900/20 backdrop-blur-xl ${
              isModalClosing ? 'animate-scale-out' : 'animate-scale-in'
            }`}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/50 to-transparent" />

            <div className="px-6 pt-6 pb-2">
              <h2 className="text-lg font-semibold text-zinc-900">Add URLs</h2>
              <p className="mt-1 text-sm text-zinc-500">HTTPS endpoints to monitor</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-2.5 px-6 py-4">
                {urlInputs.map((url, index) => (
                  <div
                    key={index}
                    className="animate-slide-in-right flex items-center gap-2"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateUrlInput(index, e.target.value)}
                      placeholder="https://example.com"
                      className="h-11 flex-1 rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition duration-200 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                    <button
                      type="button"
                      onClick={addUrlInput}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 transition duration-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95"
                      aria-label="Add another URL"
                    >
                      <IoAdd className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {modalError && <ErrorAlert message={modalError} />}
              </div>

              <div className="flex justify-end border-t border-zinc-100/80 bg-zinc-50/30 px-6 py-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white shadow-lg shadow-zinc-900/20 transition duration-200 hover:bg-zinc-800 hover:shadow-xl disabled:opacity-50 active:scale-[0.98]"
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Adding...
                    </>
                  ) : (
                    'Add monitors'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Monitor

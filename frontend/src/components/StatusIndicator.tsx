type MonitorStatus = 'up' | 'down' | null

export function StatusIndicator({ status }: { status: MonitorStatus }) {
  if (status === 'up') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200/60">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Up
      </span>
    )
  }

  if (status === 'down') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200/60">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Down
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 ring-1 ring-zinc-200/60">
      <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
      Pending
    </span>
  )
}

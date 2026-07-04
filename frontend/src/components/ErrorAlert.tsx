import { IoWarning } from 'react-icons/io5'

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="animate-slide-in-right flex items-start gap-3 rounded-xl border border-red-200/50 bg-gradient-to-br from-red-50 via-rose-50 to-orange-50/50 p-4 shadow-sm shadow-red-100/50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100/80 ring-1 ring-red-200/50">
        <IoWarning className="h-[18px] w-[18px] text-red-600" aria-hidden="true" />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-semibold text-red-900">Something went wrong</p>
        <p className="mt-1 text-sm leading-relaxed text-red-700/80">{message}</p>
      </div>
    </div>
  )
}

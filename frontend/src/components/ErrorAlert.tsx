export function ErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="animate-slide-in-right flex items-start gap-3 rounded-xl border border-red-200/50 bg-gradient-to-br from-red-50 via-rose-50 to-orange-50/50 p-4 shadow-sm shadow-red-100/50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100/80 ring-1 ring-red-200/50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4.5 w-4.5 text-red-600"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-semibold text-red-900">Something went wrong</p>
        <p className="mt-1 text-sm leading-relaxed text-red-700/80">{message}</p>
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted" />
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="h-8 w-12 rounded bg-muted mx-auto mb-1" />
            <div className="h-3 w-16 rounded bg-muted mx-auto" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card px-5 py-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-48 rounded bg-muted" />
            </div>
            <div className="h-5 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

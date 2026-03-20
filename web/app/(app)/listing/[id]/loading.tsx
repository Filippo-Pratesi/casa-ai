export default function ListingDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Back link skeleton */}
      <div className="h-8 w-36 rounded-lg bg-muted" />

      {/* Photo area skeleton */}
      <div className="grid grid-cols-4 gap-1.5 rounded-2xl overflow-hidden h-56">
        <div className="col-span-2 row-span-2 bg-muted" />
        <div className="bg-muted" />
        <div className="bg-muted" />
        <div className="bg-muted" />
        <div className="bg-muted" />
      </div>

      {/* Title + price skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-8 w-2/3 rounded bg-muted" />
              <div className="h-5 w-1/2 rounded bg-muted" />
            </div>
            <div className="h-10 w-28 rounded-xl bg-muted" />
          </div>

          {/* Stat cards skeleton */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-1.5">
                <div className="h-3 w-12 rounded bg-muted" />
                <div className="h-6 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>

          {/* Content tabs skeleton */}
          <div className="space-y-2">
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 w-24 rounded-full bg-muted" />
              ))}
            </div>
            <div className="space-y-2 rounded-xl border border-border p-4">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-5/6 rounded bg-muted" />
              <div className="h-4 w-4/6 rounded bg-muted" />
            </div>
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border p-4 space-y-2">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>
          <div className="rounded-xl border border-border p-4 space-y-2">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

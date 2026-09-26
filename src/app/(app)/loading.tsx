export default function AppLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in" aria-busy="true" aria-label="Loading content">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="skeleton h-7 w-44 mb-2 rounded-md" />
          <div className="skeleton h-4 w-64 rounded-md" />
        </div>
        <div className="skeleton h-9 w-28 rounded-md" />
      </div>

      {/* Overview Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4 flex items-center gap-3">
            <div className="skeleton w-8 h-8 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="skeleton h-3 w-14 mb-1.5 rounded" />
              <div className="skeleton h-4 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="card p-0 overflow-hidden mb-6">
        {/* Card header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--color-border-default)" }}
        >
          <div className="skeleton h-5 w-36 rounded" />
          <div className="skeleton h-4 w-16 rounded" />
        </div>

        {/* Rows */}
        <div className="divide-y" style={{ borderColor: "var(--color-border-default)" }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="skeleton h-4 w-1/3 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
              <div className="skeleton h-6 w-20 rounded-full flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

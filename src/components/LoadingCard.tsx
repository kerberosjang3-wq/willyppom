export default function LoadingCard() {
  return (
    <div className="bg-surface-card rounded-2xl p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-14 bg-surface-border rounded-full" />
        <div className="h-5 w-10 bg-surface-border rounded-full" />
        <div className="h-4 w-16 bg-surface-border rounded ml-auto" />
      </div>
      <div className="flex gap-3">
        <div className="w-16 h-16 bg-surface-border rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-surface-border rounded w-full" />
          <div className="h-4 bg-surface-border rounded w-4/5" />
          <div className="h-4 bg-surface-border rounded w-1/3" />
        </div>
      </div>
      <div className="flex gap-3 mt-3 pt-3 border-t border-surface-border">
        <div className="h-3 w-8 bg-surface-border rounded" />
        <div className="h-3 w-8 bg-surface-border rounded" />
        <div className="h-3 w-14 bg-surface-border rounded ml-auto" />
      </div>
    </div>
  );
}

export default function Skeleton({ className = "h-28 w-full" }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonGrid({ count = 3 }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-36 w-full" />
      ))}
    </div>
  );
}

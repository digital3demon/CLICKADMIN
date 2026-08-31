import { workExampleCardPhotoGridCols } from "@/lib/work-examples/card-photo-grid";

export function WorkExampleCardPhotoGrid({
  urls,
  eagerCount = 0,
}: {
  urls: string[];
  eagerCount?: number;
}) {
  if (!urls.length) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] text-[var(--text-muted)]">
        нет
      </div>
    );
  }
  const cols = workExampleCardPhotoGridCols(urls.length);
  return (
    <div
      className="absolute inset-0 grid gap-px bg-[var(--card-border)]"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridAutoRows: "1fr",
      }}
    >
      {urls.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          loading={i < eagerCount ? "eager" : "lazy"}
          decoding="async"
          className="h-full min-h-0 w-full object-cover"
        />
      ))}
    </div>
  );
}

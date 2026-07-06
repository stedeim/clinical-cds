// 404 — a mistyped or stale case link (stub-store cases vanish on server
// restart, so stale bookmarks are a normal occurrence in demo mode).
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-serif text-[22px] font-semibold text-ink">Page not found</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-[#8b8779]">
        This page doesn&apos;t exist — the link may be stale. In demo mode, cases reset when
        the server restarts.
      </p>
      <div className="mt-6">
        <a
          href="/"
          className="rounded-[10px] bg-clinical px-[18px] py-[10px] text-[13px] font-bold text-white shadow-[0_6px_16px_-8px_rgba(78,107,87,.55)]"
        >
          Your cases
        </a>
      </div>
    </div>
  );
}

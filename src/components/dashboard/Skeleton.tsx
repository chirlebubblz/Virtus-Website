import React from "react";

/**
 * Loading placeholders. They mirror the shape of the real screens so the page does not jump when data arrives.
 * The pulse is skipped for people who ask for reduced motion.
 */

const pulse = "motion-safe:animate-pulse";

export function Skeleton({ className = "", dark = true }: { className?: string; dark?: boolean }) {
  return <div aria-hidden="true" className={`${pulse} ${dark ? "bg-white/10" : "bg-white/5"} ${className}`} />;
}

/** Wraps a skeleton so assistive tech hears one "Loading" message instead of nothing. */
function Live({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Table body rows. Drop inside a <tbody>. */
export function SkeletonRows({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden="true" className="border-b border-[#262626]">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c} className="px-4 py-4">
              <Skeleton className={`h-4 ${c === 0 ? "w-3/4" : c === cols - 1 ? "ml-auto w-16" : "w-1/2"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function PageHeaderSkeleton() {
  return (
    <div className="space-y-3 border-b border-[#262626] pb-5">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-8 w-72 max-w-full" />
      <Skeleton className="h-3 w-96 max-w-full" />
    </div>
  );
}

function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 border border-[#262626] bg-[#111111] p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-28" />
        </div>
      ))}
    </div>
  );
}

/** Generic admin or team page: header, stat cards and a table. Used while the workspace data loads. */
export function PageSkeleton() {
  return (
    <Live label="Loading workspace" className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <PageHeaderSkeleton />
      <StatCardsSkeleton />
      <div className="border border-[#262626] bg-[#111111]">
        <div className="border-b border-[#262626] p-4">
          <Skeleton className="h-4 w-40" />
        </div>
        <table className="w-full">
          <tbody className="divide-y divide-[#262626]">
            <SkeletonRows rows={6} cols={5} />
          </tbody>
        </table>
      </div>
    </Live>
  );
}

/** Six kanban columns with cards, for the leads pipeline. */
export function KanbanSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <Live label="Loading leads" className="grid grid-cols-1 items-start gap-4 pb-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: columns }, (_, c) => (
        <div key={c} className="min-w-[15rem] space-y-3 border border-[#262626] bg-[#111111] p-3">
          <div className="space-y-2 bg-[#161616] p-3">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          {Array.from({ length: c % 3 === 0 ? 3 : 2 }, (_, i) => (
            <div key={i} className="space-y-2 border border-[#262626] bg-[#161616] p-3.5">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ))}
    </Live>
  );
}

/** Whole staff shell (top bar, sidebar, content) shown by the /admin and /team route loading states. */
export function WorkspaceShellSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" className="flex h-dvh flex-col bg-[#0A0A0A] text-white">
      <span className="sr-only">{label}</span>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#262626] bg-[#0D0D0D] px-4 sm:px-6">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 bg-[#FBD227]/30" />
          <Skeleton className="hidden h-9 w-28 sm:block" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 space-y-3 border-r border-[#262626] bg-black p-4 md:block">
          <Skeleton dark className="mb-6 h-6 w-32" />
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} dark className="h-8 w-full" />
          ))}
        </aside>
        <main className="min-w-0 flex-1 overflow-hidden bg-[#0A0A0A]">
          <div aria-hidden="true" className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
            <PageHeaderSkeleton />
            <StatCardsSkeleton />
            <div className="grid gap-6 lg:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="space-y-4 border border-[#262626] bg-[#111111] p-5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/** Client dashboard shell, matching the dark layout: top bar, hero with ring, stat tiles, tabs and two panels. */
export function ClientShellSkeleton() {
  return (
    <div role="status" aria-busy="true" className="min-h-dvh bg-[#0A0A0A]">
      <span className="sr-only">Loading your dashboard</span>
      <div aria-hidden="true">
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5 sm:px-8 lg:px-10">
          <Skeleton dark className="h-7 w-32" />
          <div className="flex gap-2">
            <Skeleton dark className="h-11 w-11 sm:w-36" />
            <Skeleton dark className="h-11 w-11 sm:w-28" />
          </div>
        </div>
        <div className="mx-auto grid max-w-[74rem] items-center gap-10 px-5 pb-10 pt-12 sm:px-8 lg:grid-cols-[1fr_auto] lg:px-10">
          <div className="space-y-5">
            <Skeleton dark className="h-3 w-32" />
            <Skeleton dark className="h-12 w-72 max-w-full sm:h-16" />
            <Skeleton dark className="h-5 w-64 max-w-full" />
            <Skeleton dark className="h-32 w-full max-w-[38rem]" />
          </div>
          <Skeleton dark className="hidden h-40 w-40 rounded-full lg:block" />
        </div>
        <div className="mx-auto grid max-w-[74rem] grid-cols-2 gap-3 px-5 sm:px-8 lg:grid-cols-4 lg:px-10">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} dark className="h-24" />
          ))}
        </div>
        <div className="mx-auto mt-10 flex max-w-[74rem] gap-2 px-5 sm:px-8 lg:px-10">
          {["w-28", "w-24", "w-24", "w-24"].map((w, i) => (
            <Skeleton key={i} dark className={`h-11 ${w}`} />
          ))}
        </div>
        <div className="mx-auto mt-8 grid max-w-[74rem] gap-6 px-5 sm:px-8 lg:grid-cols-[1.5fr_1fr] lg:px-10">
          <div className="space-y-6">
            <Skeleton dark className="h-56" />
            <Skeleton dark className="h-44" />
          </div>
          <Skeleton dark className="h-64" />
        </div>
      </div>
    </div>
  );
}

import { useEffect, useId, useRef, useState } from 'react'
import { toolInfo } from '@/data/tool-info'
import authorAvatar from '@assets/author/author-avatar.jpg'

export function AuthorPopover() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label="作者・ツール情報"
        aria-expanded={open}
        aria-controls={panelId}
        title="作者・ツール情報"
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-100 text-blue-600 shadow-sm transition duration-200 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 aria-expanded:border-blue-300 aria-expanded:shadow-md"
      >
        <img src={authorAvatar} alt="" className="h-full w-full rounded-[inherit] object-contain" />
      </button>
      {open && (
        <section
          id={panelId}
          aria-labelledby={`${panelId}-title`}
          className="absolute right-0 top-full z-20 mt-3 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_48px_-12px_rgba(30,58,138,0.22)]"
        >
          <span
            aria-hidden="true"
            className="absolute -top-[7px] right-5 z-10 h-3 w-3 rotate-45 border-l border-t border-slate-200/80 bg-blue-50"
          />
          <div className="rounded-t-2xl bg-gradient-to-b from-blue-50 to-indigo-50 px-4 pb-5 pt-4">
            <h2 id={`${panelId}-title`} className="text-[10px] font-bold tracking-[0.18em] text-slate-500">
              作者・ツール情報
            </h2>
            <div className="mt-4 flex items-center gap-2.5">
              <div
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white bg-white/80 text-blue-500 shadow-sm"
              >
                <img src={authorAvatar} alt="" className="h-full w-full rounded-[inherit] object-contain" />
              </div>
              <div className="min-w-0 shrink-0">
                <p className="text-[10px] font-medium tracking-widest text-slate-500">作った人</p>
                <p className="mt-0.5 break-all text-xl font-bold tracking-wide text-slate-800">
                  {toolInfo.author}
                </p>
              </div>
              <p className="relative rounded-xl border border-blue-100 bg-white px-2.5 py-2 font-['Zen_Maru_Gothic',sans-serif] text-[11px] font-bold leading-relaxed text-slate-600 shadow-sm">
                <span
                  aria-hidden="true"
                  className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-b border-l border-blue-100 bg-white"
                />
                退勤の王、
                <br />
                タイキング
              </p>
            </div>
          </div>
          <div className="px-4 pb-5 pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="shrink-0 text-xs text-gray-500">バージョン</p>
              <span
                aria-label={`バージョン ${toolInfo.version}`}
                className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[11px] text-blue-600"
              >
                v{toolInfo.version}
              </span>
            </div>
            <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100 text-xs">
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="shrink-0 text-gray-500">GitHub</dt>
                <dd>
                  {toolInfo.repositoryUrl ? (
                    <a
                      href={toolInfo.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-800"
                    >
                      リポジトリ ↗<span className="sr-only">（新しいタブで開く）</span>
                    </a>
                  ) : (
                    <span className="rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-500">未定</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      )}
    </div>
  )
}

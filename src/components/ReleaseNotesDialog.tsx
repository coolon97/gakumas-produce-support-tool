import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IDOLS } from '@/data/idols'
import cardsData from '@data/cards.json'
import type { ReleaseNote } from '@/data/release-notes'
import { getIdolImageUrl } from '@/lib/idol-images'
import { resolveLocalAssetUrl } from '@/lib/local-asset-urls'

function ReleaseCardImage({ src, className }: { src?: string; className: string }) {
  return src ? (
    <img src={src} alt="" className={className} />
  ) : (
    <span
      aria-hidden="true"
      className={`${className} flex items-center justify-center bg-slate-100 text-center text-[9px] text-slate-500`}
    >
      画像準備中
    </span>
  )
}

export function ReleaseNotesDialog({
  releases,
  history,
  onClose,
}: {
  releases: readonly ReleaseNote[]
  history: boolean
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.showModal()
    dialog.focus()
    return () => {
      dialog.close()
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  return createPortal(
    <dialog
      ref={dialogRef}
      data-scroll-lock-overlay
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const buttons = event.currentTarget.querySelectorAll<HTMLElement>('button, [tabindex="0"]')
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === event.currentTarget)
        ) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-xl overflow-hidden rounded-lg border border-slate-200 bg-white p-0 text-slate-800 outline-none backdrop:bg-slate-950/40"
    >
      <div className="flex max-h-[calc(100dvh_-_2rem)] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {history ? '更新履歴' : '今回の更新'}
          </h2>
          <button
            type="button"
            aria-label="更新内容を閉じる"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded text-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            ×
          </button>
        </header>
        <div
          role="region"
          aria-label="更新内容"
          tabIndex={0}
          className="min-h-0 overflow-y-auto overscroll-contain px-5 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500"
        >
          {releases.map((release) => (
            <article key={release.version} className="border-b border-slate-200 py-5 last:border-0">
              <div className="flex items-baseline gap-3 text-xs text-slate-500">
                <span className="font-semibold text-blue-700">v{release.version}</span>
                <time dateTime={release.date}>{release.date.split('-').join('/')}</time>
              </div>
              <h3 className="mt-2 text-base font-semibold leading-relaxed">{release.title}</h3>
              {release.idolVersionIds.length > 0 && (
                <section className="mt-5" aria-label="追加Pアイドル">
                  <h4 className="text-sm font-semibold">
                    Pアイドル{' '}
                    <span className="ml-1 font-normal text-slate-500">
                      {release.idolVersionIds.length}枚追加
                    </span>
                  </h4>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {release.idolVersionIds.map((id) => {
                      const idol = IDOLS.flatMap((entry) => entry.versions).find((entry) => entry.id === id)
                      if (!idol) return null
                      return (
                        <li key={id} className="flex items-center gap-3">
                          <ReleaseCardImage
                            src={getIdolImageUrl(id)}
                            className="h-[72px] w-[54px] shrink-0 rounded object-cover"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-5">{idol.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {idol.rarity} ·{' '}
                              {idol.plan === 'sense'
                                ? 'センス'
                                : idol.plan === 'logic'
                                  ? 'ロジック'
                                  : 'アノマリー'}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
              {release.supportCardIds.length > 0 && (
                <section className="mt-5" aria-label="追加サポートカード">
                  <h4 className="text-sm font-semibold">
                    サポートカード{' '}
                    <span className="ml-1 font-normal text-slate-500">
                      {release.supportCardIds.length}枚追加
                    </span>
                  </h4>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {release.supportCardIds.map((id) => {
                      const card = cardsData.find((entry) => entry.id === id)
                      if (!card) return null
                      return (
                        <li key={id} className="flex items-center gap-3">
                          <ReleaseCardImage
                            src={resolveLocalAssetUrl(card.imageUrl)}
                            className="h-[54px] w-24 shrink-0 rounded object-cover"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-5">{card.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {card.rarity} ·{' '}
                              {card.type === 'vocal' ? 'Vo' : card.type === 'dance' ? 'Da' : 'Vi'}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
              {release.changes.length > 0 && (
                <section className="mt-5 border-t border-slate-100 pt-4" aria-label="機能の更新">
                  <h4 className="text-sm font-semibold">機能の更新</h4>
                  <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">
                    {release.changes.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                </section>
              )}
            </article>
          ))}
        </div>
        <footer className="flex shrink-0 justify-end border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {history ? '閉じる' : '確認しました'}
          </button>
        </footer>
      </div>
    </dialog>,
    document.body,
  )
}

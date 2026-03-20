import RevealOnScroll from '../../components/RevealOnScroll.jsx'
import { useFeaturedAlbum } from '../../lib/useFeaturedAlbum.js'

const DEFAULT_DIARY_ALBUMS = ['Neon Aftertaste', 'Slow Satellites', 'Cinder Letters']
const DEFAULT_DIARY_ALBUMS_NORMALIZED = DEFAULT_DIARY_ALBUMS.map((name) => ({ name, image_url: null }))

function StarRating({ value }) {
  // Match the mobile implementation:
  // for each star, compute fill as 0 | 0.5 | 1 and clip the overlay by width.
  const getFill = (starIndex) => {
    if (value >= starIndex) return 1
    if (value >= starIndex - 0.5) return 0.5
    return 0
  }

  return (
    <div className="flex items-center gap-1" aria-label={`Rating ${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1
        const fill = getFill(idx)
        const showOverlay = fill > 0

        return (
          <span key={i} className="relative inline-flex h-4 w-4">
            <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <path
                d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                fill="rgba(255,255,255,0.12)"
              />
            </svg>
            {showOverlay ? (
              <span
                className="absolute inset-y-0 left-0 h-full overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full" aria-hidden="true">
                  <path
                    d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                    fill="#BF5AF2"
                  />
                </svg>
              </span>
            ) : null}
          </span>
        )
      })}
    </div>
  )
}

function StepPanel({ index, activeIndex, album, albums }) {
  const isActive = index === activeIndex
  const panelClass = [
    // Overlap panels so inactive ones don't contribute to layout height.
    'absolute inset-0 w-full overflow-hidden',
    'transition-all duration-500 ease-out',
    isActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none',
  ].join(' ')

  const diaryAlbums =
    albums && albums.length ? albums.slice(0, 3) : DEFAULT_DIARY_ALBUMS_NORMALIZED

  return (
    <div className={panelClass}>
      {index === 0 ? (
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-300">Sync status</p>
            <p className="text-xs font-semibold text-[#BF5AF2]">In progress</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0B0B0B]/30 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(191,90,242,0.35),transparent_60%)]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">Your Diary</p>
                <p className="mt-0.5 text-xs text-zinc-400">Recent listens imported</p>
              </div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full w-[62%] rounded-full bg-[#BF5AF2]/80" />
            </div>
          </div>
          <div className="space-y-2">
            {diaryAlbums.map((a, i) => (
              <div
                key={a?.name ?? i}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_60%)]">
                    {a?.image_url ? (
                      <img
                        src={a.image_url}
                        alt={a?.name ? `${a.name} cover` : 'Album cover'}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <p className="min-w-0 truncate text-sm font-semibold text-white">
                    {a?.name ?? ''}
                  </p>
                </div>
                <p className="text-xs font-semibold text-zinc-400">+{i + 1}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {index === 1 ? (
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-300">Rating</p>
            <p className="text-xs font-semibold text-[#BF5AF2]">0.5 steps</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0B0B0B]/30 p-4">
            <div className="flex items-center gap-4">
              <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(191,90,242,0.35),transparent_60%)]">
                {album?.image_url ? (
                  <img
                    src={album.image_url}
                    alt={album?.name ? `${album.name} album cover` : 'Album cover'}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">“{album?.name ?? 'Neon Aftertaste'}”</p>
                <p className="mt-0.5 text-xs text-zinc-400">Rated by you</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <StarRating value={5} />
              <p className="text-sm font-semibold text-white">5 / 5</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Half-stars', 'One rating', 'Fast edits'].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {index === 2 ? (
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-300">Review</p>
            <p className="text-xs font-semibold text-[#BF5AF2]">Letterboxd-style</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0B0B0B]/30 p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="text-3xl font-semibold leading-none text-[#BF5AF2]">“</p>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-zinc-300">
                #Diary
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-200">
              A tight rotation of hooks and silence. This is music you feel in your teeth.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-zinc-300">
                #Review
              </span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-zinc-300">
                Useful
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-300">Publish to your diary</p>
              <p className="text-xs font-semibold text-[#BF5AF2]">Ready</p>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full w-[90%] rounded-full bg-[#BF5AF2]/80" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function LandingStepPreviewCard({ activeIndex }) {
  const { album, albums } = useFeaturedAlbum(3)

  return (
    <RevealOnScroll delayMs={120} className="h-full">
      <div className="h-full relative rounded-3xl border border-white/10 bg-[#141414]/60 p-6 overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[#BF5AF2]/15 blur-2xl" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-black/60 to-transparent" />
        </div>

        <div className="relative grid gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-zinc-400">Live preview</p>
              <p className="mt-1 text-sm font-semibold text-white">Your next step</p>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-zinc-300">
              Step {activeIndex + 1}
            </div>
          </div>

          <div className="relative min-h-[340px]">
            {[0, 1, 2].map((idx) => (
              <StepPanel key={idx} index={idx} activeIndex={activeIndex} album={album} albums={albums} />
            ))}
          </div>
        </div>
      </div>
    </RevealOnScroll>
  )
}


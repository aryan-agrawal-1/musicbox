import RevealOnScroll from '../../components/RevealOnScroll.jsx'
import { useFeaturedAlbum } from '../../lib/useFeaturedAlbum.js'

function StarRow({ rating }) {
  // Match the mobile implementation:
  // for each star, compute fill as 0 | 0.5 | 1 and clip the overlay by width.
  const getFill = (starIndex) => {
    if (rating >= starIndex) return 1
    if (rating >= starIndex - 0.5) return 0.5
    return 0
  }

  return (
    <div className="flex items-center gap-1" aria-label={`Rating: ${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const index = i + 1
        const fill = getFill(index)
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

export default function LandingHeroPreview() {
  const { album } = useFeaturedAlbum()

  return (
    <RevealOnScroll className="lg:mt-0" delayMs={140}>
      <div className="relative rounded-3xl border border-white/10 bg-[#141414]/70 p-5 shadow-[0_0_0_1px_rgba(191,90,242,0.10)]">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </div>

        <div className="mt-4 grid gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400">Now rating</p>
              <p className="mt-1 text-sm font-semibold text-white">
                “{album?.name ?? 'Neon Aftertaste'}”
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-300">
              Album
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(191,90,242,0.35),transparent_55%)]">
              {album?.image_url ? (
                <img
                  src={album.image_url}
                  alt={album?.name ? `${album.name} album cover` : 'Album cover'}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_60%)]" />
              <div className="absolute -bottom-6 -right-6 h-16 w-16 rounded-full bg-[#BF5AF2]/30 blur-md" />
            </div>

            <div className="min-w-0 flex-1">
              <StarRow rating={5} />
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-300">
                A tight rotation of hooks and silence. This is music you feel in your teeth.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-[#0B0B0B]/40 px-2.5 py-1 text-[11px] text-zinc-300">
                  #Diary
                </span>
                <span className="rounded-full border border-white/10 bg-[#0B0B0B]/40 px-2.5 py-1 text-[11px] text-zinc-300">
                  #Review
                </span>
              </div>
            </div>
          </div>
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl">
          <div className="absolute -top-px left-1/2 h-px w-[70%] -translate-x-1/2 bg-[#BF5AF2]/30 blur-sm" />
        </div>
      </div>
    </RevealOnScroll>
  )
}


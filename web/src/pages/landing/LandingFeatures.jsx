import RevealOnScroll from '../../components/RevealOnScroll.jsx'

function FeatureIcon({ kind }) {
  const common = 'h-6 w-6'
  if (kind === 'rate') {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden="true" fill="none">
        <path
          d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
          fill="#BF5AF2"
          opacity="0.9"
        />
      </svg>
    )
  }
  if (kind === 'diary') {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden="true" fill="none">
        <path
          d="M6 2h9l3 3v17H6V2Z"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M9 11h6M9 15h6"
          stroke="#BF5AF2"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (kind === 'review') {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden="true" fill="none">
        <path
          d="M4 4h16v14H7l-3 3V4Z"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M7.5 9.5h9M7.5 12.5h6" stroke="#BF5AF2" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg className={common} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M7 10l5-5 5 5v10H7V10Z"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 15v-5" stroke="#BF5AF2" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function LandingFeatures() {
  const features = [
    {
      kind: 'rate',
      title: 'Rate songs and albums',
      body: 'Half-star precision and a layout that makes comparisons effortless.',
    },
    {
      kind: 'review',
      title: 'Write reviews that stick',
      body: 'Short, thoughtful notes that turn “I liked it” into a memory.',
    },
    {
      kind: 'diary',
      title: 'A diary built for scrolling',
      body: 'Timeline, tags, and a clean history of what you heard and how you felt.',
    },
    {
      kind: 'feed',
      title: 'Discovery with social energy',
      body: 'Follow friends, browse their taste, and find your next favorite track.',
    },
  ]

  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
      <RevealOnScroll>
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Everything you need to be the critic</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
          Noted is designed like a modern app, but feels like a letterboxd page: fast, readable, and art-first.
        </p>
      </RevealOnScroll>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <RevealOnScroll key={f.title} delayMs={110 + i * 70}>
            <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-[#141414]/40 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-2.5">
                  <FeatureIcon kind={f.kind} />
                </div>
                <p className="text-sm font-semibold text-white">{f.title}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{f.body}</p>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  )
}


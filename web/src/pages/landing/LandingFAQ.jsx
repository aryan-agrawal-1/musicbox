import RevealOnScroll from '../../components/RevealOnScroll.jsx'

const FAQS = [
  {
    q: 'Can I use Noted without Apple Music?',
    a: 'Yes. You can start rating and writing reviews right away. If you choose to connect Apple Music, it helps import your recent listening history automatically.',
  },
  {
    q: 'Is it really like Letterboxd for music?',
    a: 'Yes: rate songs and albums, then write short reviews that make your listening history feel alive.',
  },
  {
    q: 'How precise are ratings?',
    a: 'Ratings are stored in 0.5 increments (from 0.5 to 5.0). That makes comparisons feel more honest than a simple star bucket.',
  },
  {
    q: 'Will my reviews show up in other places?',
    a: 'Noted is designed for discovery: your diary and your reviews become part of the social feed once you start following people.',
  },
]

export default function LandingFAQ() {
  return (
    <section id="faq" className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
      <RevealOnScroll>
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">FAQ</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
          Quick answers, no fluff. If you have a question that’s not here,{' '}
          <a
            href="#contact"
            className="font-medium text-zinc-200 underline decoration-zinc-600 underline-offset-2 transition-colors hover:text-white"
          >
            contact us
          </a>
          .
        </p>
      </RevealOnScroll>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {FAQS.map((item, i) => (
          <RevealOnScroll key={item.q} delayMs={120 + i * 60}>
            <details className="group rounded-3xl border border-white/10 bg-[#141414]/40 p-6">
              <summary className="cursor-pointer list-none">
                <div className="flex items-start justify-between gap-6">
                  <p className="text-sm font-semibold text-white">{item.q}</p>
                  <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-[#BF5AF2]">
                    +
                  </span>
                </div>
              </summary>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{item.a}</p>
              <div className="mt-4 h-px bg-white/5" />
            </details>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  )
}


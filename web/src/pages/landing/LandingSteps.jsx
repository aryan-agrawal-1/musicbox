import { useState } from 'react'

import RevealOnScroll from '../../components/RevealOnScroll.jsx'
import LandingStepPreviewCard from './LandingStepPreviewCard.jsx'

const STEPS = [
  {
    title: 'Import listening history (optional)',
    description:
      'Optionally connect Apple Music to import your recent listens. You can still start rating right away.',
  },
  {
    title: 'Rate in 0.5 steps',
    description: 'Songs and albums half-star precision, one rating per entry.',
  },
  {
    title: 'Review like Letterboxd',
    description: 'Write short reviews that turn listening into memory.',
  },
]

export default function LandingSteps() {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
      <RevealOnScroll>
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">How it works</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300">
              A clean flow: import, rate, review. The result is a diary that feels great to scroll.
            </p>
          </div>
        </div>
      </RevealOnScroll>

      <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:items-stretch">
        <div className="h-full rounded-3xl border border-white/10 bg-[#141414]/40 p-6">
          <div className="flex flex-col gap-3">
            {STEPS.map((step, idx) => {
              const isActive = idx === activeIndex
              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={[
                    'group rounded-2xl border px-4 py-4 text-left transition',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BF5AF2]/70',
                    isActive ? 'border-[#BF5AF2]/40 bg-[#BF5AF2]/10' : 'border-white/10 bg-black/10 hover:border-white/20',
                  ].join(' ')}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-[#BF5AF2]">
                        Step {idx + 1}
                      </p>
                      <p className="mt-2 text-base font-semibold text-white">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-zinc-300">{step.description}</p>
                    </div>
                    <div
                      className={[
                        'mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-2xl border transition',
                        isActive ? 'border-[#BF5AF2]/40 bg-[#BF5AF2]/15' : 'border-white/10 bg-white/5 group-hover:bg-white/10',
                      ].join(' ')}
                      aria-hidden="true"
                    >
                      <span
                        className={[
                          'leading-none text-[22px] font-semibold',
                          isActive ? 'text-[#BF5AF2]' : 'text-zinc-300',
                        ].join(' ')}
                      >
                        {idx === 0 ? '♪' : idx === 1 ? '★' : '“'}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <LandingStepPreviewCard activeIndex={activeIndex} />
      </div>
    </section>
  )
}


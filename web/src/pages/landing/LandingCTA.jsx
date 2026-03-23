import RevealOnScroll from '../../components/RevealOnScroll.jsx'

const TESTFLIGHT_EMAIL = 'hello@getnotedapp.com'
const TESTFLIGHT_MAILTO = `mailto:${TESTFLIGHT_EMAIL}?subject=${encodeURIComponent('Requesting TestFlight access')}&body=${encodeURIComponent(
  "Hey Noted,\n\nI'd love early access to the TestFlight.\n\nName:\nWhy I want in:\n\nThanks!",
)}`

export default function LandingCTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 lg:pb-24">
      <div className="rounded-4xl border border-white/10 bg-[#141414]/40 p-8 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <RevealOnScroll>
              <p className="text-xs font-semibold tracking-wide text-[#BF5AF2]">Private beta</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Ask to join the first circle.
              </h2>
              <p className="mt-4 text-sm leading-6 text-zinc-300">
                Noted is only open to a limited group on TestFlight right now. If you want early access before the
                wider release, send us a note and make your case.
              </p>
            </RevealOnScroll>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <RevealOnScroll delayMs={140}>
                <a
                  href={TESTFLIGHT_MAILTO}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#BF5AF2] px-6 py-3 text-sm font-semibold text-black shadow-[0_0_0_1px_rgba(191,90,242,0.35),0_14px_34px_rgba(191,90,242,0.18)] transition-transform hover:scale-[1.02]"
                >
                  Email for Access
                </a>
              </RevealOnScroll>

              <RevealOnScroll delayMs={190}>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/20 hover:bg-white/10"
                >
                  Rewatch the flow
                </a>
              </RevealOnScroll>
            </div>
          </div>

          <RevealOnScroll delayMs={240}>
            <div className="rounded-3xl border border-white/10 bg-[#0B0B0B]/25 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-400">Inside the beta</p>
                <p className="text-xs font-semibold text-[#BF5AF2]">Invite-only</p>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  'Import listening history',
                  'Rate songs & albums',
                  'Write review notes',
                  'Build a scrolling diary',
                ].map((t) => (
                  <div key={t} className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-[#BF5AF2]/15 text-[#BF5AF2]">
                      ✓
                    </span>
                    <p className="text-sm font-medium text-zinc-200">{t}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 h-px bg-white/5" />
              <p className="mt-5 text-xs leading-5 text-zinc-400">
                Early members get a quieter room, closer feedback loops, and a real say in where Noted goes next.
              </p>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  )
}


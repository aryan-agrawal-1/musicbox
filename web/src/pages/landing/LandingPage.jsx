import LandingHero from './LandingHero.jsx'
import LandingSteps from './LandingSteps.jsx'
import LandingFeatures from './LandingFeatures.jsx'
import LandingFAQ from './LandingFAQ.jsx'
import LandingCTA from './LandingCTA.jsx'
import Seo from '../../seo/Seo.jsx'

export default function LandingPage() {
  return (
    <>
      <Seo />
      <div className="min-h-screen bg-[#0B0B0B] text-white relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-64 left-1/2 h-[600px] w-[600px] sm:h-[660px] sm:w-[660px] lg:h-[760px] lg:w-[760px] -translate-x-1/2 rounded-full bg-[#BF5AF2]/24 blur-[100px] opacity-80" />
        <div className="absolute top-40 -left-24 h-[420px] w-[420px] rounded-full bg-white/5 blur-[100px] opacity-80" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-linear-to-t from-black/80 to-transparent" />
        <div className="absolute inset-0 mx-noise opacity-10 mix-blend-overlay" />
      </div>

      <LandingHero />

      <main className="relative z-10">
        <LandingSteps />
        <LandingFeatures />
        <LandingFAQ />
        <LandingCTA />
      </main>

      <footer className="relative z-10 border-t border-white/5">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-xs text-zinc-400">
            Noted is a music diary for people who love to rate and review what they listen to.
          </p>
        </div>
      </footer>
      </div>
    </>
  )
}


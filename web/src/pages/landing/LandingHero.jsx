import { Link } from 'react-router-dom'

import LandingHeroPreview from './LandingHeroPreview.jsx'
import RevealOnScroll from '../../components/RevealOnScroll.jsx'
import iconForeground from '../../assets/icon-foreground.png'

const APP_STORE_URL = ''

function LogoMark() {
  return (
    <img src={iconForeground} width={22} height={22} alt="" aria-hidden="true" />
  )
}

export default function LandingHero() {
  return (
    <header className="relative z-10">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 pt-8">
        <div className="flex items-center gap-2">
          <LogoMark />
          <span className="text-sm font-semibold tracking-tight text-white">Noted</span>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          <a className="text-sm text-zinc-400 hover:text-zinc-200" href="#how-it-works">
            How it works
          </a>
          <a className="text-sm text-zinc-400 hover:text-zinc-200" href="#features">
            Features
          </a>
          <a className="text-sm text-zinc-400 hover:text-zinc-200" href="#faq">
            FAQ
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-white/20 hover:bg-black/30 md:inline-flex"
          >
            Sign in
          </Link>
          <a
            href={APP_STORE_URL || '#'}
            onClick={(e) => {
              if (!APP_STORE_URL) e.preventDefault()
            }}
            className="rounded-full bg-[#BF5AF2] px-4 py-2 text-sm font-semibold text-black shadow-[0_0_0_1px_rgba(191,90,242,0.35),0_10px_30px_rgba(191,90,242,0.20)] transition-transform hover:scale-[1.02]"
          >
            App Store
          </a>
        </div>
      </nav>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <RevealOnScroll>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
              Letterboxd for music, built for your listening diary
            </p>
          </RevealOnScroll>

          <RevealOnScroll delayMs={70}>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Track.
              <span className="text-[#BF5AF2]"> Rate.</span> &
              <br />
              Review your music.
            </h1>
          </RevealOnScroll>

          <RevealOnScroll delayMs={110}>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg">
              Noted turns your listening history into a clean, scrollable diary so every song and album gets a
              rating and a review that actually helps you remember.
            </p>
          </RevealOnScroll>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <RevealOnScroll delayMs={140} className="">
              <a
                href={APP_STORE_URL || '#'}
                onClick={(e) => {
                  if (!APP_STORE_URL) e.preventDefault()
                }}
                className="inline-flex items-center justify-center rounded-2xl bg-[#BF5AF2] px-5 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02] hover:bg-[#BF5AF2]"
              >
                Get on the App Store
              </a>
            </RevealOnScroll>

            <RevealOnScroll delayMs={180}>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/20 hover:bg-white/10"
              >
                See how it feels
              </a>
            </RevealOnScroll>
          </div>

        </div>

        <LandingHeroPreview />
      </div>
    </header>
  )
}


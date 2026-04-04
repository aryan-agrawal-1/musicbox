import RevealOnScroll from '../../components/RevealOnScroll.jsx'

const CONTACT_EMAIL = 'hello@getnotedapp.com'
const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Question about Noted')}`

export default function LandingContact() {
  return (
    <section id="contact" className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
      <RevealOnScroll>
        <div className="rounded-4xl border border-white/10 bg-[#141414]/40 p-8 sm:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-[#BF5AF2]">Contact</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                We read every note.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300">
                Questions, feedback, or press, just send an email and we'll get back as soon as we can.
              </p>
            </div>
            <a
              href={CONTACT_MAILTO}
              className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#BF5AF2] px-6 py-3 text-sm font-semibold text-black shadow-[0_0_0_1px_rgba(191,90,242,0.35),0_14px_34px_rgba(191,90,242,0.18)] transition-transform hover:scale-[1.02] lg:self-center"
            >
              Email us
            </a>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  )
}

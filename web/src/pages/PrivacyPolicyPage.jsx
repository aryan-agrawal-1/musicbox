import { Link } from 'react-router-dom'

import Seo from '../seo/Seo.jsx'

const legalEntityName = 'Noted'

const privacyEmail = 'hello@getnotedapp.com'

const lastUpdated = 'April 4, 2026'

export default function PrivacyPolicyPage() {
  return (
    <>
      <Seo
        title="Privacy Policy — Noted"
        description="How Noted collects, uses, and shares information when you use our music diary and social features."
      />
      <div className="min-h-dvh bg-[#0B0B0B] text-white">
        <div aria-hidden className="pointer-events-none fixed inset-0">
          <div className="absolute -top-64 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#BF5AF2]/20 blur-[100px] opacity-70" />
          <div className="absolute inset-0 mx-noise opacity-[0.07] mix-blend-overlay" />
        </div>

        <header className="relative z-10 border-b border-white/5">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-6">
            <Link
              to="/"
              className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
            >
              Back to home
            </Link>
            <span className="text-xs text-zinc-500">Last updated {lastUpdated}</span>
          </div>
        </header>

        <main className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-10">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            This Privacy Policy describes how {legalEntityName} (&quot;we,&quot; &quot;us,&quot; or
            &quot;our&quot;) collects, uses, discloses, and otherwise processes personal data in
            connection with Noted, our mobile application, website, and related services
            (collectively, the &quot;Service&quot;). We are established in the United Kingdom and
            act as the <span className="text-zinc-300">data controller</span> for personal data we
            process about you through the Service.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            This policy is designed to meet our obligations under the UK General Data Protection
            Regulation (&quot;UK GDPR&quot;) and the Data Protection Act 2018. If you are in the
            European Economic Area (&quot;EEA&quot;), the EU General Data Protection Regulation
            (&quot;EU GDPR&quot;) may also apply; your rights are substantially similar, and you may
            contact us or your local supervisory authority.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            By using the Service, you acknowledge this Privacy Policy. If you do not agree, please
            do not use the Service.
          </p>

          <section className="mt-12 space-y-4">
            <h2 className="text-lg font-semibold text-white">1. Information we collect</h2>
            <div className="space-y-4 text-sm leading-relaxed text-zinc-300">
              <p>
                <span className="font-medium text-zinc-200">Account and profile.</span> When you
                create an account, we collect identifiers and credentials such as your email
                address, username, and password. You may also provide optional profile information
                such as your name, bio, location, and profile photo. If you sign in with Apple, we
                receive data Apple provides as part of that flow (for example, a stable Apple user
                identifier and, when shared with us, your name or email).
              </p>
              <p>
                <span className="font-medium text-zinc-200">Music services and listening
                activity.</span> If you connect third-party music services, we receive tokens and
                identifiers needed to link your account and sync listening-related data with our
                servers, as permitted by those services and your settings. We process listening
                history and related metadata to power diary, feed, and discovery features.
              </p>
              <p>
                <span className="font-medium text-zinc-200">Content you create.</span> We collect
                content you submit through the Service, such as ratings, reviews, comments, likes,
                follows, and other social interactions visible in the app.
              </p>
              <p>
                <span className="font-medium text-zinc-200">Device and technical data.</span> We
                collect information such as device tokens used for push notifications, app
                diagnostics needed to operate the Service, and similar technical data from your
                device and our servers (for example, request metadata used for security and abuse
                prevention).
              </p>
              <p>
                <span className="font-medium text-zinc-200">Photos (optional).</span> If you choose
                to set a profile image, image data may be processed on your device and uploaded to
                our infrastructure using a secure upload flow initiated by the app.
              </p>
              <p>
                <span className="font-medium text-zinc-200">Analytics.</span> Our mobile app may use
                analytics tools to understand how the Service is used, including product analytics
                that can collect event data, coarse device or app information, and identifiers
                associated with your use of the app. Where configured, this may include user or
                account identifiers to correlate events across sessions.
              </p>
              <p>
                <span className="font-medium text-zinc-200">Communications.</span> If you contact us
                (for example, for support), we process the information you provide.
              </p>
            </div>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="text-lg font-semibold text-white">2. How we use information</h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              We use personal data to provide, maintain, and improve the Service; authenticate
              users; personalize your experience; operate social and music-diary features; deliver
              notifications you enable; measure and improve performance and reliability; detect,
              prevent, and respond to abuse and security issues; comply with law; and communicate
              with you about the Service.
            </p>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="text-lg font-semibold text-white">
              3. Legal bases for processing (UK and EEA)
            </h2>
            <div className="space-y-4 text-sm leading-relaxed text-zinc-300">
              <p>
                Where UK GDPR or EU GDPR applies, we rely on one or more of the following legal
                bases:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <span className="font-medium text-zinc-200">Performance of a contract</span> —
                  processing necessary to provide the Service you request (for example, account
                  creation, core app features, linked music services you choose, and support).
                </li>
                <li>
                  <span className="font-medium text-zinc-200">Legitimate interests</span> —
                  processing that is necessary for our legitimate interests, where those interests
                  are not overridden by your rights (for example, securing the Service, preventing
                  abuse, improving features, and certain product analytics), balanced against your
                  privacy rights.
                </li>
                <li>
                  <span className="font-medium text-zinc-200">Consent</span> — where we ask for
                  consent (for example, optional analytics beyond what we can justify on other bases,
                  or marketing where required), you may withdraw consent at any time without
                  affecting the lawfulness of processing before withdrawal.
                </li>
                <li>
                  <span className="font-medium text-zinc-200">Legal obligation</span> — where we
                  must process personal data to comply with applicable law.
                </li>
              </ul>
            </div>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="text-lg font-semibold text-white">4. How we share information</h2>
            <div className="space-y-4 text-sm leading-relaxed text-zinc-300">
              <p>
                We share personal data with service providers who process it on our instructions
                (processors) to help us run the Service—for example, hosting, storage, email
                delivery, analytics, push notification delivery, and music platform integrations. We
                require processors to protect personal data appropriately. We may also disclose
                information when required by law, to protect rights and safety, or in connection
                with a business transaction (such as a merger or acquisition), subject to applicable
                law.
              </p>
              <p>
                <span className="font-medium text-zinc-200">In-product social features.</span>{' '}
                Information you choose to make visible in the app (such as your profile, reviews,
                and social activity) may be seen by other users according to product functionality
                and your settings.
              </p>
              <p>
                Depending on configuration, categories of recipients may include: cloud
                infrastructure and object storage providers; email delivery providers; analytics
                providers; mobile platform and push notification services; and music platforms you
                connect (for example, Spotify or Apple Music) as needed to provide linked features.
              </p>
            </div>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="text-lg font-semibold text-white">5. Cookies and similar technologies</h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              Our website may use cookies and similar technologies as needed to operate the site,
              remember preferences, and measure basic usage. Our mobile app does not rely on
              browser cookies in the same way; it uses platform storage and SDK-based technologies
              consistent with your device settings.
            </p>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="text-lg font-semibold text-white">6. Retention</h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              We retain personal data for as long as your account is active and as needed to
              provide the Service, comply with legal obligations, resolve disputes, and enforce our
              terms. When you delete your account, we take steps to delete or anonymise personal
              data associated with your account, subject to applicable law and legitimate retention
              needs (for example, security logs or backups for a limited period).
            </p>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="text-lg font-semibold text-white">7. Security</h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              We implement technical and organisational measures designed to protect personal data.
              No method of transmission or storage is completely secure; we cannot guarantee
              absolute security.
            </p>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="text-lg font-semibold text-white">8. Your rights</h2>
            <div className="space-y-4 text-sm leading-relaxed text-zinc-300">
              <p>
                If UK GDPR or EU GDPR applies to our processing of your personal data, you may have
                the right to: request access to your personal data; request rectification of
                inaccurate data; request erasure; request restriction of processing; object to
                certain processing (including processing based on legitimate interests); request
                data portability (where applicable); and, where processing is based on consent,
                withdraw consent at any time.
              </p>
              <p>
                You can exercise these rights by contacting us at the email below. The Service may
                also include in-app controls to update your profile, manage connected services, and
                delete your account. We will respond within one month in most cases, or inform you
                if we need longer where permitted by law.
              </p>
              <p>
                If you are in the UK and believe we have not handled your personal data properly,
                you have the right to lodge a complaint with the{' '}
                <a
                  href="https://ico.org.uk/make-a-complaint/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#BF5AF2] underline decoration-[#BF5AF2]/40 underline-offset-2 transition-colors hover:text-[#d9a3ff]"
                >
                  Information Commissioner&apos;s Office (ICO)
                </a>
                . If you are in the EEA, you may contact your local data protection authority.
              </p>
              <p>
                <span className="font-medium text-zinc-200">Marketing.</span> If we send optional
                promotional communications, you can opt out using the instructions in those
                messages or by contacting us.
              </p>
            </div>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="text-lg font-semibold text-white">9. Children</h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              The Service is not directed at children under 13, or under the digital consent age in
              your country if higher, and we do not knowingly collect personal data from children in
              that category. If you believe we have collected such information, contact us and we
              will take appropriate steps.
            </p>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="text-lg font-semibold text-white">10. International transfers</h2>
            <div className="space-y-4 text-sm leading-relaxed text-zinc-300">
              <p>
                We and our service providers may process and store personal data in the United
                Kingdom, the EEA, the United States, and other countries. Those countries may have
                different data protection laws than your own.
              </p>
              <p>
                Where we transfer personal data from the UK or EEA to countries that are not
                subject to an adequacy decision or similar recognition, we implement appropriate
                safeguards required by applicable law—such as the UK International Data Transfer
                Agreement or Addendum, the EU Standard Contractual Clauses, or another approved
                transfer mechanism—unless an exception applies.
              </p>
            </div>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="text-lg font-semibold text-white">11. Third-party services</h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              The Service may link to or integrate with third-party services (including music
              platforms and onboarding tools). Those services have their own privacy policies, and
              we are not responsible for their practices. We encourage you to review their policies
              before connecting accounts or sharing information.
            </p>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="text-lg font-semibold text-white">12. Changes to this policy</h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              We may update this Privacy Policy from time to time. We will post the updated policy
              on this page and revise the &quot;Last updated&quot; date. If changes are material, we
              will provide additional notice as required by law.
            </p>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="text-lg font-semibold text-white">13. Contact</h2>
            <div className="space-y-4 text-sm leading-relaxed text-zinc-300">
              <p>
                For privacy questions or requests, including to exercise your rights, contact us at{' '}
                <a
                  href={`mailto:${privacyEmail}`}
                  className="text-[#BF5AF2] underline decoration-[#BF5AF2]/40 underline-offset-2 transition-colors hover:text-[#d9a3ff]"
                >
                  {privacyEmail}
                </a>
                .
              </p>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}

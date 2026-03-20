import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-white">Page not found</h1>
      <p className="mt-3 text-sm text-zinc-400">
        That URL doesn't exist yet. Try heading back to the landing page.
      </p>
      <div className="mt-8">
        <Link className="text-sm font-medium text-fuchsia-400 hover:text-fuchsia-300" to="/">
          Back to landing
        </Link>
      </div>
    </div>
  )
}


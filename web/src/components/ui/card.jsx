import { cn } from '../../lib/utils.js'

export function Card({ className, ...props }) {
  return <div className={cn('rounded-3xl border border-white/10 bg-[#141414]/40', className)} {...props} />
}


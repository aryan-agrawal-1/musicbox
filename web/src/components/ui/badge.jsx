import { cn } from '../../lib/utils.js'

export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-zinc-300',
    accent: 'rounded-full border border-[#BF5AF2]/30 bg-[#BF5AF2]/10 px-3 py-1 text-xs font-semibold text-[#BF5AF2]',
  }

  return <span className={cn(variants[variant] || variants.default, className)} {...props} />
}


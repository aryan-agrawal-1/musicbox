import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils.js'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BF5AF2]/70 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#BF5AF2] text-black hover:bg-[#BF5AF2] hover:opacity-90',
        secondary: 'border border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10',
        ghost: 'bg-transparent text-zinc-100 hover:bg-white/5',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export function Button({ variant, className, ...props }) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />
}


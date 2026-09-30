import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'ghost' | 'subtle' | 'danger';
type Size = 'sm' | 'md' | 'icon' | 'icon-sm';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: 'bg-[var(--accent)] text-white hover:brightness-110',
  ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.07]',
  subtle: 'bg-white/[0.06] text-zinc-200 hover:bg-white/[0.1] border border-white/[0.09]',
  danger: 'text-rose-400 hover:bg-rose-500/10',
};

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-sm',
  icon: 'h-7 w-7',
  'icon-sm': 'h-6 w-6',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'ghost', size = 'md', className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  );
});

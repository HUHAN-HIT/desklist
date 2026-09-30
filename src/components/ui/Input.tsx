import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-9 w-full rounded-lg border border-white/[0.09] bg-white/[0.05] px-3 text-sm text-zinc-100',
          'placeholder:text-zinc-600 focus:border-[var(--accent)] focus:outline-none',
          className,
        )}
        {...rest}
      />
    );
  },
);

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full resize-none rounded-lg border border-white/[0.09] bg-white/[0.05] px-3 py-2 text-sm text-zinc-100',
        'placeholder:text-zinc-600 focus:border-[var(--accent)] focus:outline-none',
        className,
      )}
      {...rest}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-9 w-full rounded-lg border border-white/[0.09] bg-zinc-900 px-2.5 text-sm text-zinc-100',
        'focus:border-[var(--accent)] focus:outline-none',
        className,
      )}
      {...rest}
    />
  );
});

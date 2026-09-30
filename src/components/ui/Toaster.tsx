import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore } from '../../stores/toast';

export function Toaster() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="pointer-events-auto flex items-center gap-3 rounded-xl border border-white/[0.1] bg-zinc-900/95 px-3.5 py-2.5 shadow-xl backdrop-blur"
          >
            <span className="text-[13px] text-zinc-200">{t.msg}</span>
            {t.action && (
              <button
                type="button"
                className="text-[13px] font-medium text-[var(--accent)] hover:brightness-125"
                onClick={() => {
                  t.action?.run();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

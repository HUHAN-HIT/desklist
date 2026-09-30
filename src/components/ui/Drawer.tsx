import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}

/** 主窗右侧编辑抽屉。 */
export function Drawer({ open, onClose, title, children, width = 360 }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <motion.aside
            initial={{ x: width }}
            animate={{ x: 0 }}
            exit={{ x: width }}
            transition={{ type: 'tween', duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-0 h-full overflow-y-auto border-l border-white/[0.08] bg-zinc-900 p-5"
            style={{ width }}
          >
            <h2 className="mb-4 text-[15px] font-semibold text-zinc-100">{title}</h2>
            {children}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

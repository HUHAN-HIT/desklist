import { motion } from 'framer-motion';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  size?: number;
}

/** 自绘动画 checkbox：150ms spring 打勾。 */
export function Checkbox({ checked, onChange, size = 16 }: Props) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      whileTap={{ scale: 0.82 }}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className="grid shrink-0 place-items-center rounded-[5px] border transition-colors"
      style={{
        width: size,
        height: size,
        borderColor: checked ? 'var(--accent)' : 'rgba(255,255,255,0.24)',
        backgroundColor: checked ? 'var(--accent)' : 'transparent',
      }}
    >
      <svg width={size * 0.68} height={size * 0.6} viewBox="0 0 12 10" fill="none">
        <motion.path
          d="M1 5 L4.5 8.5 L11 1"
          stroke="#fff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        />
      </svg>
    </motion.button>
  );
}

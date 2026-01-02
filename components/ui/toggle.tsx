'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'toggle',
        checked ? 'toggle-checked' : 'toggle-unchecked',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <motion.span
        className="toggle-thumb"
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  )
}

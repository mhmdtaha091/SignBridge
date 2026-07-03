import type { HTMLAttributes, ReactNode } from 'react'

/**
 * Shared card panel — the rounded-3xl cream panel used across SignBridge.
 *
 * Variants:
 * - default: bg-cream-100 border border-cream-200 (content cards)
 * - elevated: adds shadow-soft (interactive cards, landing CTA cards)
 * - success/error/warning/info: tinted backgrounds with matching borders
 */

type CardVariant = 'default' | 'elevated' | 'success' | 'error' | 'warning' | 'info'

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: 'bg-cream-100 border border-cream-200',
  elevated: 'bg-cream-100 border border-cream-200 shadow-soft',
  success: 'bg-leaf-50 border border-leaf-200',
  error: 'bg-coral-50 border border-coral-200',
  warning: 'bg-sun-50 border border-sun-200',
  info: 'bg-sky-50 border border-sky-200',
}

const BASE = 'rounded-3xl'

const PADDING = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  /** Visual prominence: sm=p-4, md=p-6, lg=p-8. Default md. */
  padding?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export default function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`${BASE} ${VARIANT_CLASSES[variant]} ${PADDING[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

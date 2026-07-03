import { Link } from 'react-router-dom'
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react'

/**
 * Shared button component with variants matching the SignBridge design system.
 *
 * Variants:
 * - primary: coral solid (main CTA)
 * - secondary: cream outline (alternative action)
 * - danger: coral-100 bg, coral-700 text (destructive/clear actions)
 * - success: leaf-500 bg, white text (speak/confirm actions)
 * - info: sky-100 bg, sky-700 text (informational actions)
 */

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'info'

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-coral-600 text-white hover:bg-coral-700 shadow-soft',
  secondary:
    'bg-cream-50 border-2 border-cream-300 text-ink-700 hover:bg-cream-200',
  danger:
    'bg-coral-100 text-coral-700 hover:bg-coral-100/70',
  success:
    'bg-leaf-500 text-white hover:bg-leaf-600',
  info:
    'bg-sky-100 text-sky-700 hover:bg-sky-100/70',
}

const BASE =
  'inline-flex items-center justify-center gap-2 font-extrabold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

const SIZE_CLASSES = {
  sm: 'px-4 py-1.5 text-sm',
  md: 'px-5 py-2.5',
  lg: 'px-7 py-3.5 text-lg',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${BASE} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

type LinkButtonBase = {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  className?: string
}

/**
 * A Link styled as a button. Use `to` for internal React Router navigation,
 * or `href` for external links.
 */
export function LinkButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: LinkButtonBase &
  (
    | { to: string; href?: never } & Omit<
      Parameters<typeof Link>[0],
      'className' | 'children' | 'to'
    >
    | { href: string; to?: never } & AnchorHTMLAttributes<HTMLAnchorElement>
  )) {
  const cls = `${BASE} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`

  if ('to' in props && props.to) {
    const { to, ...rest } = props
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    )
  }

  const { href, ...rest } = props as { href: string } & AnchorHTMLAttributes<HTMLAnchorElement>
  return (
    <a href={href} className={cls} {...rest}>
      {children}
    </a>
  )
}

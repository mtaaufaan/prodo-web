import * as React from "react"

import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

// Spesifikasi docs/design-system.md §10.1 -- height 36px, padding 8px/10px,
// Archivo 13px, radius 0, border `line` (signal saat focus, red saat error
// lewat aria-invalid).
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-none border border-line bg-input-bg px-2.5 py-2 font-sans text-[13px] text-text-body placeholder:text-text-faint focus-visible:outline-none focus-visible:border-signal disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-red",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

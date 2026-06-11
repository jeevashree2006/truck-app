import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "danger" | "outline";

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  outline:
    "btn border border-slate-200 dark:border-ink-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-ink-600",
};

export function Button({
  children,
  variant = "primary",
  className,
  icon,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: ReactNode }) {
  return (
    <button className={cn(variants[variant], className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}

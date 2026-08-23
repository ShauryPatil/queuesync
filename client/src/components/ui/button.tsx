import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-[transform,colors,box-shadow,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:translate-y-px active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-wait motion-reduce:transform-none motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:-translate-y-px hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25",
        destructive: "bg-destructive text-white shadow-md shadow-destructive/15 hover:-translate-y-px hover:bg-destructive/90 hover:shadow-lg focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "border bg-card/75 shadow-sm hover:-translate-y-px hover:bg-accent/70 hover:shadow-md dark:bg-transparent dark:border-input dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:-translate-y-px hover:bg-secondary/80 hover:shadow-md",
        ghost: "hover:bg-accent/75 dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-10",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean }) {
  const Comp = asChild ? Slot : "button";
  const pending = loading || props["aria-busy"] === true;

  if (asChild) {
    return <Comp data-slot="button" data-loading={pending ? "true" : undefined} aria-busy={pending || undefined} disabled={disabled || loading} className={cn(buttonVariants({ variant, size, className }))} {...props}>{children}</Comp>;
  }

  return <Comp data-slot="button" data-loading={pending ? "true" : undefined} aria-busy={pending || undefined} disabled={disabled || loading} className={cn(buttonVariants({ variant, size, className }))} {...props}>{pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}{children}</Comp>;
}

export { Button, buttonVariants };

import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const variants = cva("p-4 pb-16", {
  variants: {
    variant: {
      default: "max-w-screen-xl mx-auto",
      container: "container",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof variants> {}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(({ className, variant, ...props }, ref) => {
  return <div className={cn(variants({ variant, className }))} ref={ref} {...props} />;
});
Container.displayName = "Container";

export { Container };

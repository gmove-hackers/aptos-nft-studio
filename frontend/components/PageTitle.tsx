import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const variants = cva("text-3xl text-center font-bold", {
  variants: {
    margin: {
      default: "mb-14",
      none: "",
    },
  },
  defaultVariants: {
    margin: "default",
  },
});

interface PageTitleProps extends React.HTMLAttributes<HTMLHeadingElement>, VariantProps<typeof variants> {
  text: React.ReactNode;
}

const PageTitle = React.forwardRef<HTMLHeadingElement, PageTitleProps>(({ className, margin, text, ...props }, ref) => {
  return (
    <h2 className={cn(variants({ margin, className }))} ref={ref} {...props}>
      {text}
    </h2>
  );
});
PageTitle.displayName = "PageTitle";

export { PageTitle };

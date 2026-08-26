"use client";

import { type LucideIcon } from "lucide-react";
import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface AccordionFormSectionProps {
  value: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function AccordionFormSection({
  value,
  title,
  icon: Icon,
  children,
  className,
  contentClassName,
}: AccordionFormSectionProps) {
  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={value} className="px-4">
          <AccordionTrigger>
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>

              <h3 className="text-base font-semibold">{title}</h3>
            </div>
          </AccordionTrigger>

          <AccordionContent
            className={cn("grid gap-6 pt-2 pb-4", contentClassName)}
          >
            {children}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

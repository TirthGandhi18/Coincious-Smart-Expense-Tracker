"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "./utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Base
        "peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border transition-all outline-none focus-visible:ring-[3px] focus-visible:border-ring focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",

        // --- LIGHT MODE ---
        // OFF
        "data-[state=unchecked]:bg-[#E6D3B2] data-[state=unchecked]:border-transparent",

        // ON
        "data-[state=checked]:bg-[#8B4513] data-[state=checked]:border-transparent",

        // --- DARK MODE ---
        // OFF
        "dark:data-[state=unchecked]:bg-[#1E293B] dark:data-[state=unchecked]:border-transparent",

        // ON
        "dark:data-[state=checked]:bg-[#22C55E] dark:data-[state=checked]:border-transparent",

        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // Base thumb
          "pointer-events-none block size-4 rounded-full ring-0 transition-transform",

          // --- LIGHT MODE 
          // OFF (left)
          "data-[state=unchecked]:bg-white",

          // ON (right)
          "data-[state=checked]:bg-white",

          // --- DARK MODE ---
          // OFF thumb = light gray
          "dark:data-[state=unchecked]:bg-[#E2E8F0]",

          // ON thumb = dark navy
          "dark:data-[state=checked]:bg-[#0F172A]",

          // Movement
          "data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };

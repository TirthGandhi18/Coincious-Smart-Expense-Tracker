import { Wallet } from "lucide-react";
import { cn } from "../../lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
}

export function Logo({ size = "md" }: LogoProps) {
  const sizes = {
    sm: "w-8 h-8 icon:w-4 icon:h-4",
    md: "w-12 h-12 icon:w-6 icon:h-6",
    lg: "w-16 h-16 icon:w-8 icon:h-8",
  };

  const selected = sizes[size];

  return (
    <div className="flex items-center gap-3">
      <div className={cn("relative", selected)}>
        <div
          className={cn(
            "rounded-2xl p-0.5 bg-gradient-to-br",
            "from-[#8B5A3C] via-[#D7A86E] to-[#8B5A3C]",
            "dark:from-[#10B981] dark:via-[#34D399] dark:to-[#10B981]"
          )}
          style={{ width: "100%", height: "100%" }}
        >
          <div className="w-full h-full bg-white dark:bg-[#293548] rounded-2xl flex items-center justify-center">
            <Wallet className="icon text-[#8B5A3C] dark:text-[#10B981]" />
          </div>
        </div>
      </div>

      {/* Text – Always single line */}
      <div className="hidden md:block">
        <div className="text-lg font-semibold tracking-tight text-[#5D4037] dark:text-white whitespace-nowrap">
          Coincious
        </div>
      </div>
    </div>
  );
}

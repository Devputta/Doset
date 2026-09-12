import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "max-w-2xl space-y-3",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      <h2 className="font-display text-[28px] leading-tight text-text-primary sm:text-[34px]">
        {title}
      </h2>
      {description && (
        <p className="text-[15px] leading-relaxed text-text-secondary">
          {description}
        </p>
      )}
    </div>
  );
}

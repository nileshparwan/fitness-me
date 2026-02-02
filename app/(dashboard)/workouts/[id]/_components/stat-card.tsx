import { cn } from "@/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: any;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, className }: StatCardProps) {
  return (
    <div className={cn(
      "flex flex-col justify-center px-3 py-2.5 rounded-lg border bg-muted/5", 
      className
    )}>
      {/* Top Row: Icon + Label */}
      <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
        {Icon && <Icon className="h-3 w-3" />}
        <span className="text-[10px] font-semibold uppercase tracking-wider leading-none">
          {label}
        </span>
      </div>
      
      {/* Bottom Row: Value */}
      <div className="text-sm md:text-base font-bold tracking-tight leading-none truncate">
        {value}
      </div>
    </div>
  );
}
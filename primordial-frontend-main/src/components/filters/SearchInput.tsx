import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchInputProps = {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onOpenFilters?: () => void;
};

export function SearchInput({
  placeholder = "Pesquisar...",
  value,
  onChange,
  onOpenFilters,
}: SearchInputProps) {
  return (
    <div className="flex w-full items-center gap-2">
      <div className="relative w-full">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={18}
        />

        <Input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onOpenFilters}
      >
        <SlidersHorizontal size={18} />
      </Button>
    </div>
  );
}

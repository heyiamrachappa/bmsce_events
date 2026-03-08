import { Badge } from "@/components/ui/badge";

interface Category {
  id: string;
  name: string;
  color?: string | null;
}

interface CategoryFilterProps {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export default function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        variant={selected === null ? "default" : "outline"}
        className="cursor-pointer px-4 py-1.5 text-sm transition-all hover:shadow-sm"
        onClick={() => onSelect(null)}
      >
        All
      </Badge>
      {categories.map((cat) => (
        <Badge
          key={cat.id}
          variant={selected === cat.id ? "default" : "outline"}
          className="cursor-pointer px-4 py-1.5 text-sm transition-all hover:shadow-sm"
          style={
            selected === cat.id
              ? { backgroundColor: cat.color || undefined, borderColor: cat.color || undefined, color: "white" }
              : { borderColor: cat.color || undefined, color: cat.color || undefined }
          }
          onClick={() => onSelect(cat.id)}
        >
          {cat.name}
        </Badge>
      ))}
    </div>
  );
}

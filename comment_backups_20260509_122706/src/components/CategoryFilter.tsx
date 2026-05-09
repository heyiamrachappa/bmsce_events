import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

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
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Badge
          variant={selected === null ? "default" : "outline"}
          className={`cursor-pointer px-4 py-2 text-base transition-all duration-300 rounded-xl font-semibold ${
            selected === null 
              ? "gradient-primary text-foreground border-0 shadow-[0_0_15px_hsla(262,83%,58%,0.3)]" 
              : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-accent/50"
          }`}
          onClick={() => onSelect(null)}
        >
          All Events
        </Badge>
      </motion.div>
      {categories.map((cat) => (
        <motion.div key={cat.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Badge
            variant={selected === cat.id ? "default" : "outline"}
            className={`cursor-pointer px-4 py-2 text-base transition-all duration-300 rounded-xl font-semibold ${
              selected === cat.id ? "border-0 shadow-lg" : "hover:bg-accent/50"
            }`}
            style={
              selected === cat.id
                ? { 
                    backgroundColor: cat.color || undefined, 
                    borderColor: cat.color || undefined, 
                    color: "white",
                    boxShadow: `0 0 20px ${cat.color || "hsl(var(--primary))"}40` 
                  }
                : { 
                    borderColor: `${cat.color || "hsl(var(--border))"}60`, 
                    color: cat.color || undefined 
                  }
            }
            onClick={() => onSelect(cat.id)}
          >
            {cat.name}
          </Badge>
        </motion.div>
      ))}
    </div>
  );
}

import Link from "next/link";
import { BrickWall, CarFront, House, Package, Refrigerator, Shirt, Smartphone, Sofa, Wrench, type LucideIcon } from "lucide-react";
import type { Option } from "@/lib/catalog";

const icons: Record<string, LucideIcon> = {
  inmuebles: House, vehiculos: CarFront, tecnologia: Smartphone, ropa: Shirt, muebles: Sofa,
  electrodomesticos: Refrigerator, "materiales-construccion": BrickWall,
};

/** Accesos por rubro debajo del carrusel, como los de Mercado Libre. Servicios va primero y destacado. */
export function CategoryShortcuts({ categories }: { categories: Option[] }) {
  const items = [
    {id: "servicios", name: "Servicios", href: "/servicios", icon: Wrench},
    // "Otros" queda fuera: no ayuda a encontrar nada y le quita espacio al resto.
    ...categories.filter(item => item.id !== "otros").map(item => ({...item, href: `/?${new URLSearchParams({category: item.id})}`, icon: icons[item.id] ?? Package})),
  ];
  return (
    <nav aria-label="Rubros" className="shortcuts">
      {items.map(({id, name, href, icon: Icon}) => (
        <Link key={id} href={href} className="shortcut" data-featured={id === "servicios" || undefined}>
          <span className="shortcut-icon"><Icon className="size-6" aria-hidden="true" /></span>
          <span className="shortcut-name">{name}</span>
        </Link>
      ))}
    </nav>
  );
}

import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Calendar, Wallet, UtensilsCrossed, User as UserIcon } from "lucide-react";

const items = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Тойм", end: true },
  { to: "/dashboard/book", icon: Calendar, label: "Суудал захиалах" },
  { to: "/dashboard/order", icon: UtensilsCrossed, label: "Хоол захиалах" },
  { to: "/dashboard/wallet", icon: Wallet, label: "Хэтэвч" },
  { to: "/dashboard/profile", icon: UserIcon, label: "Профайл" },
];

export default function DashboardLayout() {
  return (
    <div className="container py-8">
      <div className="grid lg:grid-cols-[220px_1fr] gap-8">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto">
            {items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  isActive ? "bg-primary/10 text-primary border border-primary/30"
                           : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                <it.icon className="h-4 w-4" />
                {it.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <section><Outlet /></section>
      </div>
    </div>
  );
}

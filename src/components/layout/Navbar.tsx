import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, Trophy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Нүүр" },
  { to: "/stations", label: "Суудлууд" },
  { to: "/menu", label: "Цэс" },
  { to: "/contact", label: "Холбоо барих" },
];

export function Navbar() {
  const { user, isStaff, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display font-black text-lg">
          <Trophy className="h-6 w-6 text-primary" />
          <span className="text-gradient-neon">BE THE CHAMP</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/dashboard">Хэсэг</Link></Button>
              {isStaff && <Button asChild variant="ghost" size="sm"><Link to="/admin">Админ</Link></Button>}
              <Button variant="outline" size="sm" onClick={handleSignOut}>Гарах</Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/auth">Нэвтрэх</Link></Button>
              <Button asChild size="sm" className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold">
                <Link to="/auth?mode=signup">Бүртгүүлэх</Link>
              </Button>
            </>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Цэс">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur">
          <div className="container py-4 flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn("px-3 py-2 rounded-md", isActive ? "text-primary bg-muted" : "text-muted-foreground")
                }
              >
                {l.label}
              </NavLink>
            ))}
            <div className="border-t border-border/40 mt-2 pt-2 flex flex-col gap-2">
              {user ? (
                <>
                  <Button asChild variant="ghost" onClick={() => setOpen(false)}><Link to="/dashboard">Хэсэг</Link></Button>
                  {isStaff && <Button asChild variant="ghost" onClick={() => setOpen(false)}><Link to="/admin">Админ</Link></Button>}
                  <Button variant="outline" onClick={handleSignOut}>Гарах</Button>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" onClick={() => setOpen(false)}><Link to="/auth">Нэвтрэх</Link></Button>
                  <Button asChild className="bg-gradient-to-r from-primary to-secondary text-primary-foreground" onClick={() => setOpen(false)}>
                    <Link to="/auth?mode=signup">Бүртгүүлэх</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

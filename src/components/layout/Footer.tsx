import { Trophy } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border/40 mt-24 bg-card/30">
      <div className="container py-12 grid gap-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-display font-black">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="text-gradient-neon">BE THE CHAMP</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Your home for premium gaming, ramen, and wins. Open daily.
          </p>
        </div>
        <div>
          <h4 className="font-display text-sm mb-3">Explore</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/stations" className="hover:text-primary">Stations & Rooms</Link></li>
            <li><Link to="/menu" className="hover:text-primary">Menu</Link></li>
            <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm mb-3">Members</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auth?mode=signup" className="hover:text-primary">Become a Member</Link></li>
            <li><Link to="/dashboard" className="hover:text-primary">Member Dashboard</Link></li>
            <li><Link to="/dashboard/wallet" className="hover:text-primary">Top up Wallet</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm mb-3">Hours</h4>
          <p className="text-sm text-muted-foreground">Mon–Sun · 10:00 – 02:00</p>
          <p className="text-sm text-muted-foreground mt-1">Open all holidays</p>
        </div>
      </div>
      <div className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Be The Champ. All rights reserved.
      </div>
    </footer>
  );
}

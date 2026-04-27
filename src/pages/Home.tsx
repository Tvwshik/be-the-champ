import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Gamepad2, UtensilsCrossed, CreditCard, MapPin, Clock, ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-cafe.jpg";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={heroImage} alt="Be The Champ gaming cafe interior" width={1920} height={1080}
            className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>

        <div className="container py-20 md:py-32">
          <div className="max-w-3xl animate-fade-in-up">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary mb-6">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              Now open · 10:00 – 02:00
            </span>
            <h1 className="font-display text-5xl md:text-7xl font-black leading-[1.05] mb-6">
              Game like a <span className="text-gradient-neon">CHAMPION</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
              Premium gaming PCs, consoles, private rooms and the best ramen in town —
              delivered straight to your seat. Welcome to <strong className="text-foreground">Be The Champ</strong>.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold animate-pulse-glow">
                <Link to="/auth?mode=signup">Become a Member <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary/40">
                <Link to="/stations">Book a Station</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16 md:py-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Gamepad2, title: "Book Your Seat", desc: "Reserve PCs, consoles, or private rooms in seconds.", to: "/stations", color: "primary" },
            { icon: UtensilsCrossed, title: "Order to Seat", desc: "Hot ramen and snacks delivered while you play.", to: "/menu", color: "secondary" },
            { icon: CreditCard, title: "Member Wallet", desc: "Top up online or in-store. Faster check-outs, member rates.", to: "/auth?mode=signup", color: "accent" },
          ].map((f) => (
            <Card key={f.title} className="p-6 bg-card/60 border-border/60 hover:border-primary/50 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-xl mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{f.desc}</p>
              <Link to={f.to} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                Learn more <ArrowRight className="h-3 w-3" />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Stations preview */}
      <section className="container py-16 md:py-24 border-t border-border/40">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-2">Choose Your <span className="text-gradient-neon">Battlestation</span></h2>
            <p className="text-muted-foreground">Standard PCs, VIP rigs, consoles, and private rooms.</p>
          </div>
          <Button asChild variant="outline"><Link to="/stations">View all <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: "Standard PC", rate: "$3/hr", desc: "Solid gaming rig, mech keys" },
            { name: "VIP PC", rate: "$6/hr", desc: "RTX 4080, premium peripherals" },
            { name: "Console Seat", rate: "$5/hr", desc: "PS5 / Switch on big screen" },
            { name: "Private Room", rate: "$20+/hr", desc: "6–8 PCs, soundproofed" },
          ].map((s) => (
            <Card key={s.name} className="p-5 bg-gradient-to-br from-card to-card/40 border-border/60 hover:border-primary/50 hover:glow-cyan transition-all">
              <Trophy className="h-5 w-5 text-primary mb-3" />
              <h3 className="font-display text-lg">{s.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
              <p className="mt-3 font-bold text-secondary">{s.rate}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Visit us */}
      <section className="container py-16 md:py-24 border-t border-border/40">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-4">Visit <span className="text-gradient-neon">Be The Champ</span></h2>
            <p className="text-muted-foreground mb-6">Find us, drop in, and let's level up.</p>
            <div className="space-y-4">
              <div className="flex items-start gap-3"><MapPin className="h-5 w-5 text-primary mt-0.5" /><div>
                <p className="font-semibold">Find us on the map</p>
                <a className="text-sm text-primary hover:underline" href="https://maps.app.goo.gl/jATtFThX7Re7dqKx7?g_st=ac" target="_blank" rel="noreferrer">Open in Google Maps →</a>
              </div></div>
              <div className="flex items-start gap-3"><Clock className="h-5 w-5 text-primary mt-0.5" /><div>
                <p className="font-semibold">Open every day</p>
                <p className="text-sm text-muted-foreground">10:00 – 02:00</p>
              </div></div>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden border border-border/60 glow-cyan">
            <iframe
              title="Be The Champ location"
              src="https://www.google.com/maps?q=Be+The+Champ&output=embed"
              className="w-full h-80"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </>
  );
}

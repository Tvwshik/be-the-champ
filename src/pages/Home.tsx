import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Gamepad2, UtensilsCrossed, CreditCard, MapPin, Clock, ArrowRight, Sprout, AlertTriangle } from "lucide-react";
import heroImage from "@/assets/hero-cafe.jpg";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={heroImage} alt="Be The Champ гэйминг кафены дотор" width={1920} height={1080}
            className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>

        <div className="container py-20 md:py-32">
          <div className="max-w-3xl animate-fade-in-up">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary mb-6">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              Одоо нээлттэй · 10:00 – 02:00
            </span>
            <h1 className="font-display text-5xl md:text-7xl font-black leading-[1.05] mb-6">
              <span className="text-gradient-neon">АВАРГА</span> шиг тогло
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
              Дээд зэрэглэлийн гэйминг PC, консол, тусдаа өрөө болон хотын шилдэг рамэн —
              суудал дээр чинь хүргэгдэнэ. <strong className="text-foreground">Be The Champ</strong>-д тавтай морил.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold animate-pulse-glow">
                <Link to="/auth?mode=signup">Гишүүн болох <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary/40">
                <Link to="/stations">Суудал захиалах</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16 md:py-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Gamepad2, title: "Суудлаа захиал", desc: "PC, консол, тусдаа өрөөг хэдхэн секундэд захиална.", to: "/stations", color: "primary" },
            { icon: UtensilsCrossed, title: "Суудалдаа захиал", desc: "Халуун рамэн, зууш тоглож байх зуур чинь хүргэнэ.", to: "/menu", color: "secondary" },
            { icon: CreditCard, title: "Гишүүний хэтэвч", desc: "Онлайн эсвэл газар дээр цэнэглэ. Хурдан тооцоо, гишүүний үнэ.", to: "/auth?mode=signup", color: "accent" },
          ].map((f) => (
            <Card key={f.title} className="p-6 bg-card/60 border-border/60 hover:border-primary/50 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-xl mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{f.desc}</p>
              <Link to={f.to} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                Дэлгэрэнгүй <ArrowRight className="h-3 w-3" />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Stations preview */}
      <section className="container py-16 md:py-24 border-t border-border/40">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <h2 className="font-display text-3xl md:text-4xl mb-2">Өөрийн <span className="text-gradient-neon">тулааны суудлаа</span> сонго</h2>
            <p className="text-muted-foreground">Энгийн PC, VIP машин, консол, тусдаа өрөө.</p>
          </div>
          <Button asChild variant="outline"><Link to="/stations">Бүгдийг үзэх <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[
            { name: "Заал", rate: "4,000₮/ц", desc: "7800X3D · RTX 5060 · 360Hz" },
            { name: "VIP", rate: "6,000₮/ц", desc: "7800X3D · RTX 5060Ti · 500Hz" },
            { name: "VVIP", rate: "8,000₮/ц", desc: "9800X3D · RTX 5070 · 500Hz" },
            { name: "STAGE", rate: "10,000₮/ц", desc: "9800X3D · RTX 5070Ti · 500Hz" },
            { name: "SCORPION", rate: "50,000₮/ц", desc: "Premium тусгай багц" },
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
            <h2 className="font-display text-3xl md:text-4xl mb-4"><span className="text-gradient-neon">Be The Champ</span>-д морилно уу</h2>
            <p className="text-muted-foreground mb-6">Биднийг олж, ор, түвшнээ ахиулцгаая.</p>
            <div className="space-y-4">
              <div className="flex items-start gap-3"><MapPin className="h-5 w-5 text-primary mt-0.5" /><div>
                <p className="font-semibold">Газрын зураг дээрээс олох</p>
                <a className="text-sm text-primary hover:underline" href="https://maps.app.goo.gl/jATtFThX7Re7dqKx7?g_st=ac" target="_blank" rel="noreferrer">Google Maps дээр нээх →</a>
              </div></div>
              <div className="flex items-start gap-3"><Clock className="h-5 w-5 text-primary mt-0.5" /><div>
                <p className="font-semibold">Өдөр бүр нээлттэй</p>
                <p className="text-sm text-muted-foreground">10:00 – 02:00</p>
              </div></div>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden border border-border/60 glow-cyan">
            <iframe
              title="Be The Champ байршил"
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

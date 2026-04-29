import { Card } from "@/components/ui/card";
import { MapPin, Clock, Phone, Mail } from "lucide-react";

export default function Contact() {
  return (
    <div className="container py-12 md:py-16">
      <div className="max-w-2xl mb-10">
        <h1 className="font-display text-4xl md:text-5xl mb-3">
          Биднийг <span className="text-gradient-neon">олох</span>
        </h1>
        <p className="text-muted-foreground">Хэзээ ч ороорой — 24/7 нээлттэй.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card className="p-5 bg-card/60 border-border/60">
            <div className="flex items-start gap-3"><MapPin className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="font-semibold">Байршил</p>
                <a className="text-sm text-primary hover:underline"
                  href="https://maps.app.goo.gl/jATtFThX7Re7dqKx7?g_st=ac"
                  target="_blank" rel="noreferrer">Google Maps дээр нээх →</a>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-card/60 border-border/60">
            <div className="flex items-start gap-3"><Clock className="h-5 w-5 text-primary mt-1" />
              <div><p className="font-semibold">24/7 нээлттэй</p>
                <p className="text-sm text-muted-foreground">Өдөр бүр · 24 цаг</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-card/60 border-border/60">
            <div className="flex items-start gap-3"><Phone className="h-5 w-5 text-primary mt-1" />
              <div><p className="font-semibold">Утас</p>
                <a href="tel:+9767299977" className="text-sm text-primary hover:underline">+976 7299-9777</a>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-card/60 border-border/60">
            <div className="flex items-start gap-3"><Mail className="h-5 w-5 text-primary mt-1" />
              <div><p className="font-semibold">И-мэйл</p>
                <p className="text-sm text-muted-foreground">hello@bethechamp.cafe</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="rounded-xl overflow-hidden border border-border/60 glow-cyan min-h-[420px]">
          <iframe
            title="Be The Champ байршил"
            src="https://www.google.com/maps?q=Be+The+Champ&output=embed"
            className="w-full h-full min-h-[420px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  );
}

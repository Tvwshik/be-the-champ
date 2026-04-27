import { Card } from "@/components/ui/card";
import { MapPin, Clock, Phone, Mail } from "lucide-react";

export default function Contact() {
  return (
    <div className="container py-12 md:py-16">
      <div className="max-w-2xl mb-10">
        <h1 className="font-display text-4xl md:text-5xl mb-3">
          Find <span className="text-gradient-neon">Us</span>
        </h1>
        <p className="text-muted-foreground">Drop by anytime — we're open 16 hours a day.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card className="p-5 bg-card/60 border-border/60">
            <div className="flex items-start gap-3"><MapPin className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="font-semibold">Location</p>
                <a className="text-sm text-primary hover:underline"
                  href="https://maps.app.goo.gl/jATtFThX7Re7dqKx7?g_st=ac"
                  target="_blank" rel="noreferrer">Open in Google Maps →</a>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-card/60 border-border/60">
            <div className="flex items-start gap-3"><Clock className="h-5 w-5 text-primary mt-1" />
              <div><p className="font-semibold">Open daily</p>
                <p className="text-sm text-muted-foreground">10:00 – 02:00</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-card/60 border-border/60">
            <div className="flex items-start gap-3"><Phone className="h-5 w-5 text-primary mt-1" />
              <div><p className="font-semibold">Call us</p>
                <p className="text-sm text-muted-foreground">Add your phone number in admin</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-card/60 border-border/60">
            <div className="flex items-start gap-3"><Mail className="h-5 w-5 text-primary mt-1" />
              <div><p className="font-semibold">Email</p>
                <p className="text-sm text-muted-foreground">hello@bethechamp.cafe</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="rounded-xl overflow-hidden border border-border/60 glow-cyan min-h-[420px]">
          <iframe
            title="Be The Champ location"
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

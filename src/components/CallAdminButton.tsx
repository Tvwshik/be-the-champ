import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ADMIN_PHONE = "+976 9999-9999";

export function CallAdminButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className="fixed bottom-5 right-5 z-50 rounded-full h-14 w-14 p-0 shadow-lg bg-gradient-to-br from-primary to-secondary text-primary-foreground animate-pulse-glow md:h-auto md:w-auto md:px-5 md:rounded-full"
        aria-label="Админ дуудах"
      >
        <Phone className="h-5 w-5 md:mr-2" />
        <span className="hidden md:inline font-bold">Админ дуудах</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Админтай холбогдох</DialogTitle>
            <DialogDescription>
              Туслах хэрэгтэй бол админ руу залгана уу.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <a
              href={`tel:${ADMIN_PHONE.replace(/\s|-/g, "")}`}
              className="inline-flex items-center justify-center gap-2 h-12 rounded-md bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-lg"
            >
              <Phone className="h-5 w-5" />
              {ADMIN_PHONE}
            </a>
            <p className="text-xs text-muted-foreground text-center">
              Эсвэл ресепшнд ирж шууд асуугаарай.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

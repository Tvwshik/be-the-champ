import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

type Item = { id: string; name: string; description: string | null; price: number; image_url: string | null; is_available: boolean; category_id: string | null };
type Cat = { id: string; name: string; sort_order: number };

export default function Menu() {
  const { user } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("menu_categories").select("*").order("sort_order"),
      supabase.from("menu_items").select("*").eq("is_available", true).order("name"),
    ]).then(([c, i]) => {
      setCats((c.data ?? []) as Cat[]);
      setItems((i.data ?? []) as Item[]);
    });
  }, []);

  return (
    <div className="container py-12 md:py-16">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl md:text-5xl mb-3">
            Хоолны <span className="text-gradient-neon">цэс</span>
          </h1>
          <p className="text-muted-foreground">
            Халуун рамэн, япон сонгодог хоол, зууш, ундаа — тоглож байх зуур чинь суудал дээр чинь хүргэгдэнэ.
          </p>
        </div>
        <Button asChild className="bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold">
          <Link to={user ? "/dashboard/order" : "/auth?next=/dashboard/order"}>
            {user ? "Суудалдаа захиалах" : "Захиалахын тулд нэвтрэх"}
          </Link>
        </Button>
      </div>

      {cats.map((c) => {
        const list = items.filter((i) => i.category_id === c.id);
        if (!list.length) return null;
        return (
          <section key={c.id} className="mb-12">
            <h2 className="font-display text-2xl mb-5 border-l-4 border-primary pl-3">{c.name}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((it) => (
                <Card key={it.id} className="p-5 bg-card/60 border-border/60 flex justify-between items-start gap-4 hover:border-primary/40 transition-colors">
                  <div className="flex-1">
                    <h3 className="font-semibold">{it.name}</h3>
                    {it.description && <p className="text-sm text-muted-foreground mt-1">{it.description}</p>}
                  </div>
                  <span className="font-display font-bold text-secondary whitespace-nowrap">{Number(it.price).toLocaleString("mn-MN")}₮</span>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

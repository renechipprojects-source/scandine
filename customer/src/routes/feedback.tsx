import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CustomerNav } from "@/components/customer-nav";
import { motion } from "framer-motion";
import { useState } from "react";
import { Star, Camera, Send } from "lucide-react";
import { toast } from "sonner";

const emojis = ["😞", "😐", "🙂", "😍", "🤩"];

export const Route = createFileRoute("/feedback")({ component: Feedback });

function Feedback() {
  const nav = useNavigate();
  const [emoji, setEmoji] = useState(3);
  const [food, setFood] = useState(4);
  const [service, setService] = useState(5);
  const [text, setText] = useState("");

  return (
    <div className="min-h-screen bg-background pb-32">
      <CustomerNav />
      <div className="max-w-2xl mx-auto px-4 md:px-8 pt-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Tell us</div>
        <h1 className="font-display text-3xl md:text-4xl font-bold">How was everything?</h1>

        <div className="mt-6 glass rounded-3xl p-6 shadow-glass">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Overall vibe</div>
          <div className="flex justify-between gap-2">
            {emojis.map((e, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.9 }}
                onClick={() => setEmoji(i)}
                className={`text-3xl md:text-4xl transition ${emoji === i ? "scale-125" : "opacity-40 hover:opacity-100"}`}
              >{e}</motion.button>
            ))}
          </div>

          <div className="mt-6"><Stars label="Food quality" value={food} onChange={setFood} /></div>
          <div className="mt-4"><Stars label="Service" value={service} onChange={setService} /></div>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Write a review</div>
            <textarea
              value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Loved the truffle risotto, will come back for more…"
              rows={4}
              className="w-full rounded-2xl border bg-background p-3 text-sm resize-none"
            />
          </div>

          <button className="mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold">
            <Camera className="h-3.5 w-3.5" /> Add photo
          </button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { toast.success("Thanks for the review!"); nav({ to: "/" }); }}
            className="mt-6 w-full rounded-2xl gradient-primary text-white font-semibold py-4 shadow-float flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" /> Submit review
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function Stars({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onChange(n)}>
            <Star className={`h-7 w-7 ${n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

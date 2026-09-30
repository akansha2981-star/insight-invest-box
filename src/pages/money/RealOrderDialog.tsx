import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export interface RealOrderReq { symbol: string; price: number; side?: "BUY" | "SELL" }

/** Real broker order with explicit confirmation. Limits and the on/off switch are enforced on the server. */
export function RealOrderDialog({ req, onClose }: { req: RealOrderReq | null; onClose: () => void }) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY"); const [qty, setQty] = useState(1); const [price, setPrice] = useState(0);
  const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  const open = !!req;
  const init = () => { if (req) { setSide(req.side ?? "BUY"); setPrice(+req.price.toFixed(2)); setQty(1); setOk(false); } };
  const send = async () => {
    if (!req) return; setBusy(true);
    const { data, error } = await supabase.functions.invoke("swing-order", { body: { symbol: req.symbol.replace(/-EQ$/, ""), side, quantity: qty, price, confirm: true } });
    setBusy(false);
    if (error || !data?.ok) return toast.error(data?.error ?? "Order could not be sent. No order was placed.");
    toast.success(`Real ${side} order sent to Angel One. Order ID ${data.orderId}`); onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); else init(); }}>
      <DialogContent onOpenAutoFocus={init}>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Real order: {req?.symbol}</DialogTitle>
          <DialogDescription>This sends a real limit order (delivery, NSE) to your Angel One account and uses real money. It is not a paper trade.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">{(["BUY", "SELL"] as const).map((s) => <Button key={s} variant={side === s ? (s === "BUY" ? "default" : "destructive") : "outline"} onClick={() => setSide(s)}>{s}</Button>)}</div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Quantity</Label><Input type="number" min={1} max={100000} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(100000, Math.round(+e.target.value))))} /></div>
            <div><Label className="text-xs">Limit price (₹)</Label><Input type="number" min={0.05} step={0.05} value={price} onChange={(e) => setPrice(Math.max(0.05, +e.target.value))} /></div>
          </div>
          <div className="rounded-md border border-border bg-muted/40 p-2 text-sm">Order value: <b>₹{(qty * price).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</b></div>
          <label className="flex items-start gap-2 text-xs"><Checkbox checked={ok} onCheckedChange={(v) => setOk(!!v)} />I understand this is a real order with real money, placed at my own risk. InvestingIQ is not an investment adviser.</label>
          <Button className="w-full" variant={side === "SELL" ? "destructive" : "default"} disabled={!ok || busy || qty < 1 || price <= 0} onClick={send}>{busy ? "Sending..." : `Place real ${side} order`}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

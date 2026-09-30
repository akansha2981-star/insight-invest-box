import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Send, ShieldOff, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Ctx } from "@/lib/swing/strategies20";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RealOrderReq } from "./RealOrderDialog";

const db = supabase as any;

/** Real trading page: pick an NSE stock, open the confirmation dialog, see every attempt in the order log. */
export function RealTrading({ ctxs, onOrder }: { ctxs: Ctx[]; onOrder: (r: RealOrderReq) => void }) {
  const [lo, setLo] = useState<any>({ enabled: false, maxOrderValue: 10000, dailyLimit: 25000 });
  const [orders, setOrders] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const load = async () => {
    const [{ data: s }, { data: o }] = await Promise.all([
      db.from("swing_settings").select("value").eq("key", "live_orders").maybeSingle(),
      db.from("swing_live_orders").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (s?.value) setLo((p: any) => ({ ...p, ...s.value })); setOrders(o ?? []);
  };
  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, []);
  const matches = useMemo(() => ctxs.filter((c) => c.sym.toUpperCase().includes(q.trim().toUpperCase())).slice(0, 12), [ctxs, q]);
  const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const usedToday = orders.filter((o) => o.status === "placed" && new Date(new Date(o.created_at).getTime() + 330 * 60000).toISOString().slice(0, 10) === today).reduce((a, o) => a + +o.order_value, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base">{lo.enabled ? <ShieldCheck className="h-4 w-4 text-primary" /> : <ShieldOff className="h-4 w-4 text-destructive" />}Real trading (NSE, Angel One)</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-4">
          <div><div className="text-xs text-muted-foreground">Real orders</div><Badge variant={lo.enabled ? "default" : "destructive"}>{lo.enabled ? "ON" : "OFF"}</Badge></div>
          <div><div className="text-xs text-muted-foreground">Max per order</div><b>₹{Number(lo.maxOrderValue).toLocaleString("en-IN")}</b></div>
          <div><div className="text-xs text-muted-foreground">Daily limit</div><b>₹{Number(lo.dailyLimit).toLocaleString("en-IN")}</b></div>
          <div><div className="text-xs text-muted-foreground">Used today</div><b>₹{Math.round(usedToday).toLocaleString("en-IN")}</b></div>
          {!lo.enabled && <p className="flex items-start gap-2 text-xs text-muted-foreground sm:col-span-4"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />Real orders are switched off, so any order you try here is refused and logged. Turn them on in Desk controls once your Angel One account is active.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Place an order</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="max-w-sm"><Label className="text-xs">Search NSE stock</Label><Input placeholder="e.g. RELIANCE" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{matches.map((c) => { const px = c.b.at(-1)?.close ?? 0; return (
            <div key={c.sym} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
              <div><div className="font-semibold">{c.sym}</div><div className="text-xs text-muted-foreground">Last ₹{px.toFixed(2)} · {c.b.at(-1)?.date}</div></div>
              <div className="flex gap-1"><Button size="sm" className="h-7" onClick={() => onOrder({ symbol: c.sym, price: px, side: "BUY" })}>Buy</Button><Button size="sm" variant="destructive" className="h-7" onClick={() => onOrder({ symbol: c.sym, price: px, side: "SELL" })}>Sell</Button></div>
            </div>); })}</div>
          <p className="text-[11px] text-muted-foreground">Limit delivery orders on NSE only. Every order needs a confirmation and is checked against the limits on the server. Not investment advice.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">Order log</CardTitle><Button size="sm" variant="outline" onClick={load}><RefreshCw className="mr-1 h-4 w-4" />Refresh</Button></CardHeader>
        <CardContent className="overflow-x-auto p-0"><Table>
          <TableHeader><TableRow><TableHead>Time (IST)</TableHead><TableHead>Stock</TableHead><TableHead>Side</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Status</TableHead><TableHead>Broker ID / message</TableHead></TableRow></TableHeader>
          <TableBody>{!orders.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No orders yet.</TableCell></TableRow>}
            {orders.map((o) => <TableRow key={o.id}><TableCell className="text-xs">{new Date(o.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</TableCell><TableCell className="font-semibold">{o.symbol}</TableCell><TableCell><Badge variant={o.side === "BUY" ? "default" : "destructive"}>{o.side}</Badge></TableCell><TableCell className="text-right">{o.quantity}</TableCell><TableCell className="text-right">₹{(+o.price).toFixed(2)}</TableCell><TableCell className="text-right">₹{Math.round(+o.order_value).toLocaleString("en-IN")}</TableCell><TableCell><Badge variant={o.status === "placed" ? "default" : "secondary"}>{o.status}</Badge></TableCell><TableCell className="max-w-xs truncate text-xs">{o.broker_order_id ?? o.message}</TableCell></TableRow>)}
          </TableBody></Table></CardContent>
      </Card>
    </div>
  );
}

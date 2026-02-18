import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Edit, Trash2, Eye, CheckCircle, Clock, Star, TrendingUp,
  TrendingDown, Minus, BarChart2, X, Save, ChevronDown
} from "lucide-react";
import { Link } from "react-router-dom";

interface StockReview {
  id: string;
  symbol: string;
  company_name: string;
  sector: string;
  exchange: string;
  current_price: number | null;
  target_price: number | null;
  rating: string | null;
  analyst_name: string | null;
  summary: string | null;
  investment_thesis: string | null;
  risks: string | null;
  financials: any;
  key_metrics: any;
  tags: string[] | null;
  cover_image_url: string | null;
  status: string | null;
  is_featured: boolean | null;
  views_count: number | null;
  published_at: string | null;
  created_at: string;
}

const RATINGS = ["STRONG BUY", "BUY", "HOLD", "SELL", "STRONG SELL"];
const SECTORS = ["IT", "Banking", "Pharma", "Auto", "FMCG", "Energy", "Finance", "Infra", "Telecom", "Power", "Realty", "Metal", "FMCG", "Cement", "Defence", "General"];

const EMPTY_FORM = {
  symbol: "", company_name: "", sector: "IT", exchange: "NSE",
  current_price: "", target_price: "", rating: "HOLD",
  analyst_name: "", summary: "", investment_thesis: "", risks: "",
  cover_image_url: "", is_featured: false, tags: "",
  financials: {
    revenue: "", net_profit: "", eps: "", pe_ratio: "",
    debt_equity: "", roe: "", market_cap: "", book_value: ""
  },
  key_metrics: {
    "52w_high": "", "52w_low": "", dividend_yield: "",
    promoter_holding: "", fii_holding: "", beta: ""
  }
};

export function AdminStockReviews() {
  const [reviews, setReviews] = useState<StockReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "form">("list");
  const [editingReview, setEditingReview] = useState<StockReview | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchReviews(); }, []);

  async function fetchReviews() {
    setLoading(true);
    const { data } = await supabase
      .from("stock_reviews" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setReviews((data as any[]) ?? []);
    setLoading(false);
  }

  function openCreate() {
    setEditingReview(null);
    setForm(EMPTY_FORM);
    setView("form");
  }

  function openEdit(r: StockReview) {
    setEditingReview(r);
    setForm({
      symbol: r.symbol,
      company_name: r.company_name,
      sector: r.sector,
      exchange: r.exchange,
      current_price: r.current_price?.toString() ?? "",
      target_price: r.target_price?.toString() ?? "",
      rating: r.rating ?? "HOLD",
      analyst_name: r.analyst_name ?? "",
      summary: r.summary ?? "",
      investment_thesis: r.investment_thesis ?? "",
      risks: r.risks ?? "",
      cover_image_url: r.cover_image_url ?? "",
      is_featured: r.is_featured ?? false,
      tags: (r.tags ?? []).join(", "),
      financials: {
        revenue: r.financials?.revenue ?? "",
        net_profit: r.financials?.net_profit ?? "",
        eps: r.financials?.eps ?? "",
        pe_ratio: r.financials?.pe_ratio ?? "",
        debt_equity: r.financials?.debt_equity ?? "",
        roe: r.financials?.roe ?? "",
        market_cap: r.financials?.market_cap ?? "",
        book_value: r.financials?.book_value ?? "",
      },
      key_metrics: {
        "52w_high": r.key_metrics?.["52w_high"] ?? "",
        "52w_low": r.key_metrics?.["52w_low"] ?? "",
        dividend_yield: r.key_metrics?.dividend_yield ?? "",
        promoter_holding: r.key_metrics?.promoter_holding ?? "",
        fii_holding: r.key_metrics?.fii_holding ?? "",
        beta: r.key_metrics?.beta ?? "",
      }
    });
    setView("form");
  }

  async function handleSave(status: "draft" | "published") {
    setSaving(true);
    const payload: any = {
      symbol: form.symbol.toUpperCase().trim(),
      company_name: form.company_name.trim(),
      sector: form.sector,
      exchange: form.exchange,
      current_price: form.current_price ? parseFloat(form.current_price) : null,
      target_price: form.target_price ? parseFloat(form.target_price) : null,
      rating: form.rating,
      analyst_name: form.analyst_name || null,
      summary: form.summary || null,
      investment_thesis: form.investment_thesis || null,
      risks: form.risks || null,
      cover_image_url: form.cover_image_url || null,
      is_featured: form.is_featured,
      tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      financials: form.financials,
      key_metrics: form.key_metrics,
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    };

    if (editingReview) {
      await supabase.from("stock_reviews" as any).update(payload).eq("id", editingReview.id);
    } else {
      await supabase.from("stock_reviews" as any).insert(payload);
    }

    setSaving(false);
    fetchReviews();
    setView("list");
  }

  async function deleteReview(id: string) {
    if (!confirm("Delete this stock review? This cannot be undone.")) return;
    await supabase.from("stock_reviews" as any).delete().eq("id", id);
    fetchReviews();
  }

  async function togglePublish(r: StockReview) {
    const newStatus = r.status === "published" ? "draft" : "published";
    await supabase.from("stock_reviews" as any).update({
      status: newStatus,
      published_at: newStatus === "published" ? new Date().toISOString() : null,
    }).eq("id", r.id);
    fetchReviews();
  }

  const ratingColor = (rating: string | null) => {
    if (!rating) return "badge-neutral";
    if (rating.includes("BUY")) return "badge-gain";
    if (rating.includes("SELL")) return "badge-loss";
    return "badge-neutral";
  };

  if (view === "form") {
    return (
      <div className="p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{editingReview ? "Edit Stock Review" : "New Stock Review"}</h1>
            <p className="text-sm text-muted-foreground mt-1">Provide comprehensive analysis for investors</p>
          </div>
          <button onClick={() => setView("list")} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white border border-border rounded-xl p-6 shadow-card">
            <h2 className="font-bold text-foreground mb-4 flex items-center gap-2"><BarChart2 className="h-4 w-4 text-primary" /> Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Stock Symbol *</label>
                <input value={form.symbol} onChange={e => setForm((f: any) => ({ ...f, symbol: e.target.value }))}
                  placeholder="e.g. RELIANCE" className="form-input" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Company Name *</label>
                <input value={form.company_name} onChange={e => setForm((f: any) => ({ ...f, company_name: e.target.value }))}
                  placeholder="e.g. Reliance Industries Ltd" className="form-input" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Sector</label>
                <select value={form.sector} onChange={e => setForm((f: any) => ({ ...f, sector: e.target.value }))} className="form-input">
                  {SECTORS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Exchange</label>
                <select value={form.exchange} onChange={e => setForm((f: any) => ({ ...f, exchange: e.target.value }))} className="form-input">
                  {["NSE", "BSE", "NSE/BSE"].map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Current Price (₹)</label>
                <input type="number" value={form.current_price} onChange={e => setForm((f: any) => ({ ...f, current_price: e.target.value }))}
                  placeholder="0.00" className="form-input" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Target Price (₹)</label>
                <input type="number" value={form.target_price} onChange={e => setForm((f: any) => ({ ...f, target_price: e.target.value }))}
                  placeholder="0.00" className="form-input" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Analyst Rating</label>
                <select value={form.rating} onChange={e => setForm((f: any) => ({ ...f, rating: e.target.value }))} className="form-input">
                  {RATINGS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Analyst Name</label>
                <input value={form.analyst_name} onChange={e => setForm((f: any) => ({ ...f, analyst_name: e.target.value }))}
                  placeholder="e.g. John Smith" className="form-input" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Cover Image URL</label>
                <input value={form.cover_image_url} onChange={e => setForm((f: any) => ({ ...f, cover_image_url: e.target.value }))}
                  placeholder="https://..." className="form-input" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Tags (comma separated)</label>
                <input value={form.tags} onChange={e => setForm((f: any) => ({ ...f, tags: e.target.value }))}
                  placeholder="large-cap, dividend, growth" className="form-input" />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <input type="checkbox" id="featured" checked={form.is_featured}
                  onChange={e => setForm((f: any) => ({ ...f, is_featured: e.target.checked }))}
                  className="w-4 h-4 rounded border-border text-primary" />
                <label htmlFor="featured" className="text-sm font-medium text-foreground cursor-pointer">Feature this review on homepage</label>
              </div>
            </div>
          </div>

          {/* Analysis */}
          <div className="bg-white border border-border rounded-xl p-6 shadow-card">
            <h2 className="font-bold text-foreground mb-4">Analysis & Thesis</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Summary / Executive Overview</label>
                <textarea value={form.summary} onChange={e => setForm((f: any) => ({ ...f, summary: e.target.value }))}
                  rows={3} placeholder="Brief summary of the stock..." className="form-input resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Investment Thesis (Why Buy/Sell?)</label>
                <textarea value={form.investment_thesis} onChange={e => setForm((f: any) => ({ ...f, investment_thesis: e.target.value }))}
                  rows={5} placeholder="Detailed investment case, growth drivers, competitive moats..." className="form-input resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Key Risks</label>
                <textarea value={form.risks} onChange={e => setForm((f: any) => ({ ...f, risks: e.target.value }))}
                  rows={3} placeholder="Regulatory risks, competition, market headwinds..." className="form-input resize-none" />
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="bg-white border border-border rounded-xl p-6 shadow-card">
            <h2 className="font-bold text-foreground mb-4">Financial Data</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { key: "revenue", label: "Revenue (Cr)" },
                { key: "net_profit", label: "Net Profit (Cr)" },
                { key: "eps", label: "EPS (₹)" },
                { key: "pe_ratio", label: "P/E Ratio" },
                { key: "debt_equity", label: "Debt/Equity" },
                { key: "roe", label: "ROE (%)" },
                { key: "market_cap", label: "Market Cap (Cr)" },
                { key: "book_value", label: "Book Value (₹)" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">{label}</label>
                  <input value={form.financials[key]} onChange={e => setForm((f: any) => ({ ...f, financials: { ...f.financials, [key]: e.target.value } }))}
                    placeholder="—" className="form-input" />
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-white border border-border rounded-xl p-6 shadow-card">
            <h2 className="font-bold text-foreground mb-4">Key Market Metrics</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: "52w_high", label: "52-Week High (₹)" },
                { key: "52w_low", label: "52-Week Low (₹)" },
                { key: "dividend_yield", label: "Dividend Yield (%)" },
                { key: "promoter_holding", label: "Promoter Holding (%)" },
                { key: "fii_holding", label: "FII Holding (%)" },
                { key: "beta", label: "Beta" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">{label}</label>
                  <input value={form.key_metrics[key]} onChange={e => setForm((f: any) => ({ ...f, key_metrics: { ...f.key_metrics, [key]: e.target.value } }))}
                    placeholder="—" className="form-input" />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-4">
            <button onClick={() => handleSave("published")} disabled={saving || !form.symbol || !form.company_name}
              className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-card disabled:opacity-50">
              <CheckCircle className="h-4 w-4" /> {saving ? "Publishing..." : "Publish Review"}
            </button>
            <button onClick={() => handleSave("draft")} disabled={saving || !form.symbol || !form.company_name}
              className="flex items-center gap-2 bg-white border border-border text-foreground px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-muted transition-colors">
              <Save className="h-4 w-4" /> Save Draft
            </button>
            <button onClick={() => setView("list")} className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const published = reviews.filter(r => r.status === "published");
  const drafts = reviews.filter(r => r.status === "draft");

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stock Reviews</h1>
          <p className="text-sm text-muted-foreground mt-1">{reviews.length} total · {published.length} published · {drafts.length} drafts</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-card">
          <Plus className="h-4 w-4" /> Add Stock Review
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading...
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-white border border-border rounded-xl">
          <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-base">No stock reviews yet</p>
          <p className="text-sm mt-1">Create your first comprehensive stock analysis</p>
          <button onClick={openCreate} className="mt-5 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
            Add First Review
          </button>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  {["Stock", "Sector", "Price", "Target", "Rating", "Analyst", "Status", "Views", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reviews.map(r => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-foreground">{r.symbol}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[120px]">{r.company_name}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-semibold">{r.sector}</span>
                    </td>
                    <td className="px-4 py-3.5 number-font font-semibold text-foreground">
                      {r.current_price ? `₹${r.current_price.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-4 py-3.5 number-font text-gain font-semibold">
                      {r.target_price ? `₹${r.target_price.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${ratingColor(r.rating)}`}>{r.rating ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-sm">{r.analyst_name ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => togglePublish(r)}
                        className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${r.status === "published" ? "badge-gain" : "badge-neutral"}`}>
                        {r.status === "published" ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {r.status}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 number-font text-sm text-muted-foreground">{(r.views_count ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(r)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <Link to={`/stocks/review/${r.symbol.toLowerCase()}`} target="_blank"
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Preview">
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <button onClick={() => deleteReview(r.id)} className="p-1.5 text-muted-foreground hover:text-loss hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

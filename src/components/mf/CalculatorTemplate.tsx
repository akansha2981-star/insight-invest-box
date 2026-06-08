import { ReactNode, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { Calculator, HelpCircle, ChevronDown } from "lucide-react";
import { fmtINR } from "@/lib/mfFormat";

export interface CalcField {
  key: string;
  label: string;
  default: number;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}

export interface CalcOutput { label: string; value: number; isCurrency?: boolean; accent?: string; }

interface Props {
  title: string;
  subtitle: string;
  metaTitle: string;
  metaDescription: string;
  canonical: string;
  fields: CalcField[];
  compute: (v: Record<string, number>) => CalcOutput[];
  intro?: ReactNode;
  faqs: { q: string; a: string }[];
  gradient?: string;
}

export default function CalculatorTemplate({ title, subtitle, metaTitle, metaDescription, canonical, fields, compute, intro, faqs, gradient = "from-emerald-600 to-teal-700" }: Props) {
  const [vals, setVals] = useState<Record<string, number>>(() => Object.fromEntries(fields.map(f => [f.key, f.default])));
  const [open, setOpen] = useState<number | null>(null);
  const outputs = compute(vals);

  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonical} />
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
      </Helmet>
      <Header />
      <main className="max-w-[1100px] mx-auto px-4 py-8">
        <div className={`bg-gradient-to-br ${gradient} text-white rounded-2xl p-6 sm:p-8 mb-6`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"><Calculator className="h-6 w-6" /></div>
            <div><h1 className="text-2xl sm:text-3xl font-black">{title}</h1><p className="text-white/80 text-sm">{subtitle}</p></div>
          </div>
        </div>
        {intro && <div className="bg-card border border-border rounded-xl p-5 mb-6 text-sm text-muted-foreground leading-relaxed">{intro}</div>}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-bold">Inputs</h2>
            {fields.map(f => (
              <div key={f.key}>
                <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>{f.label}</span><span className="font-semibold text-foreground">{f.prefix || ''}{vals[f.key].toLocaleString('en-IN')}{f.suffix || ''}</span></div>
                <input type="number" value={vals[f.key]} onChange={e => setVals({ ...vals, [f.key]: Number(e.target.value) })} className="w-full border border-border rounded px-3 py-2 text-sm bg-background mb-1" />
                {f.min !== undefined && f.max !== undefined && (
                  <input type="range" min={f.min} max={f.max} step={f.step || 1} value={vals[f.key]} onChange={e => setVals({ ...vals, [f.key]: Number(e.target.value) })} className="w-full" />
                )}
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold mb-4">Results</h2>
            <div className="space-y-3">
              {outputs.map(o => (
                <div key={o.label} className="flex justify-between items-center border-b border-border pb-2 last:border-0">
                  <span className="text-sm text-muted-foreground">{o.label}</span>
                  <span className={`font-black text-lg ${o.accent || ''}`}>{o.isCurrency ? fmtINR(o.value) : o.value.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {faqs.length > 0 && (
          <div className="mt-8 bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold mb-4 flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" /> Frequently Asked Questions</h2>
            <div className="space-y-2">
              {faqs.map((f, i) => (
                <div key={i} className="border-b border-border pb-2 last:border-0">
                  <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex justify-between items-center text-left py-2 font-semibold text-sm">
                    {f.q}<ChevronDown className={`h-4 w-4 transition ${open === i ? 'rotate-180' : ''}`} />
                  </button>
                  {open === i && <p className="text-sm text-muted-foreground pb-2 leading-relaxed">{f.a}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        <ComplianceDisclaimer />
      </main>
      <Footer />
    </div>
  );
}

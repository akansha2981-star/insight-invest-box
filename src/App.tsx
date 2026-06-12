import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from "react";
import { Building2, Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { FloatingAIButton } from "./components/FloatingAIButton";
import { useParams, Navigate as RRNavigate } from "react-router-dom";

const isChunkLoadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError/i.test(message);
};

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-card">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span className="text-sm font-semibold">Loading InvestingIQ…</span>
    </div>
  </div>
);

const Index = lazy(() => import("./pages/Index"));
const NewsHubPage = lazy(() => import("./pages/NewsHubPage"));
const NewsDetailPage = lazy(() => import("./pages/NewsDetailPage"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const MarketsPage = lazy(() => import("./pages/MarketsPage"));
const StocksPage = lazy(() => import("./pages/StocksPage"));
const EconomyPage = lazy(() => import("./pages/EconomyPage"));
const MFPage = lazy(() => import("./pages/MFPage"));
const CryptoPage = lazy(() => import("./pages/CryptoPage"));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage"));
const StockReviewPage = lazy(() => import("./pages/StockReviewPage"));
const StockReviewDetailPage = lazy(() => import("./pages/StockReviewDetailPage"));
const RealEstatePage = lazy(() => import("./pages/RealEstatePage"));
const PropertyDetailPage = lazy(() => import("./pages/PropertyDetailPage"));
const CityBucketPage = lazy(() => import("./pages/CityBucketPage"));
const SIPCalculatorPage = lazy(() => import("./pages/SIPCalculatorPage"));
const EMICalculatorPage = lazy(() => import("./pages/EMICalculatorPage"));
const FDCalculatorPage = lazy(() => import("./pages/FDCalculatorPage"));
const TaxCalculatorPage = lazy(() => import("./pages/TaxCalculatorPage"));
const StockScreenerPage = lazy(() => import("./pages/StockScreenerPage"));
const PortfolioTesterPage = lazy(() => import("./pages/PortfolioTesterPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const CareersPage = lazy(() => import("./pages/CareersPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const SitemapPage = lazy(() => import("./pages/SitemapPage"));
const CurrencyConverterPage = lazy(() => import("./pages/CurrencyConverterPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const UserLogin = lazy(() => import("./pages/UserLogin"));
const MFScreenerPage = lazy(() => import("./pages/MFScreenerPage"));
const MFDetailPage = lazy(() => import("./pages/MFDetailPage"));
const MFComparePage = lazy(() => import("./pages/MFComparePage"));
const MFOverlapPage = lazy(() => import("./pages/MFOverlapPage"));
const MFFundHousePage = lazy(() => import("./pages/MFFundHousePage"));
const MFNewsPage = lazy(() => import("./pages/MFNewsPage"));
const ETFPage = lazy(() => import("./pages/ETFPage"));
const ETFScreenerPage = lazy(() => import("./pages/ETFScreenerPage"));
const ETFDetailPage = lazy(() => import("./pages/ETFDetailPage"));
const ETFComparePage = lazy(() => import("./pages/ETFComparePage"));
const ToolsHubPage = lazy(() => import("./pages/ToolsHubPage"));
const StepUpSIPPage = lazy(() => import("./pages/tools/StepUpSIPPage"));
const GoalSIPPage = lazy(() => import("./pages/tools/GoalSIPPage"));
const RetirementSIPPage = lazy(() => import("./pages/tools/RetirementSIPPage"));
const ChildEducationSIPPage = lazy(() => import("./pages/tools/ChildEducationSIPPage"));
const MarriageSIPPage = lazy(() => import("./pages/tools/MarriageSIPPage"));
const InflationSIPPage = lazy(() => import("./pages/tools/InflationSIPPage"));
const FIRECalculatorPage = lazy(() => import("./pages/tools/FIRECalculatorPage"));
const LumpsumCalculatorPage = lazy(() => import("./pages/tools/LumpsumCalculatorPage"));
const SWPCalculatorPage = lazy(() => import("./pages/tools/SWPCalculatorPage"));
const PortfolioAnalyzerPage = lazy(() => import("./pages/tools/PortfolioAnalyzerPage"));
const BestMutualFunds2026 = lazy(() => import("./pages/seo/MFLandingPages").then((m) => ({ default: m.BestMutualFunds2026 })));
const BestSIPFunds = lazy(() => import("./pages/seo/MFLandingPages").then((m) => ({ default: m.BestSIPFunds })));
const BestELSSFunds = lazy(() => import("./pages/seo/MFLandingPages").then((m) => ({ default: m.BestELSSFunds })));
const BestSmallCapFunds = lazy(() => import("./pages/seo/MFLandingPages").then((m) => ({ default: m.BestSmallCapFunds })));
const BestIndexFunds = lazy(() => import("./pages/seo/MFLandingPages").then((m) => ({ default: m.BestIndexFunds })));
const BestETFsIndia = lazy(() => import("./pages/seo/MFLandingPages").then((m) => ({ default: m.BestETFsIndia })));
const GoldETFvsPhysical = lazy(() => import("./pages/seo/MFLandingPages").then((m) => ({ default: m.GoldETFvsPhysical })));
const ETFvsMutualFund = lazy(() => import("./pages/seo/MFLandingPages").then((m) => ({ default: m.ETFvsMutualFund })));
const SIPvsLumpsum = lazy(() => import("./pages/seo/MFLandingPages").then((m) => ({ default: m.SIPvsLumpsum })));

const NewsToBlogRedirect = () => {
  const { slug } = useParams();
  return <RRNavigate to={`/news/${slug}`} replace />;
};

const queryClient = new QueryClient();

class RealEstateErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Real estate page render failed", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h1 className="mb-2 text-2xl font-black text-foreground">Real estate page is reloading safely</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Some property intelligence data could not render. Refresh the page or return to the listings.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button onClick={() => window.location.reload()} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
                Refresh page
              </button>
              <a href="/real-estate" className="rounded-lg border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted">
                Back to Real Estate
              </a>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <FloatingAIButton />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="/news" element={<Navigate to="/news-hub" replace />} />
          <Route path="/news-hub" element={<NewsHubPage />} />
          <Route path="/news/:slug" element={<NewsDetailPage />} />
          {/* Legacy/alias routes to prevent 404s from older internal links */}
          <Route path="/blog" element={<Navigate to="/news" replace />} />
          <Route path="/blog/:slug" element={<NewsToBlogRedirect />} />
          {/* Mutual Funds & ETFs ecosystem */}
          <Route path="/mf" element={<Navigate to="/mutual-funds" replace />} />
          <Route path="/mutual-funds" element={<MFPage />} />
          <Route path="/mutual-funds/screener" element={<MFScreenerPage />} />
          <Route path="/mutual-funds/compare" element={<MFComparePage />} />
          <Route path="/mutual-funds/overlap" element={<MFOverlapPage />} />
          <Route path="/mutual-funds/news" element={<MFNewsPage />} />
          <Route path="/mutual-funds/fund-house/:slug" element={<MFFundHousePage />} />
          <Route path="/mutual-funds/:slug" element={<MFDetailPage />} />
          <Route path="/etfs" element={<ETFPage />} />
          <Route path="/etfs/screener" element={<ETFScreenerPage />} />
          <Route path="/etfs/compare" element={<ETFComparePage />} />
          <Route path="/etfs/:slug" element={<ETFDetailPage />} />
          <Route path="/markets" element={<MarketsPage />} />
          <Route path="/stocks" element={<StocksPage />} />
          <Route path="/economy" element={<EconomyPage />} />
          <Route path="/crypto" element={<CryptoPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/stocks/reviews" element={<StockReviewPage />} />
          <Route path="/stocks/review/:symbol" element={<StockReviewDetailPage />} />
          <Route path="/real-estate" element={<RealEstateErrorBoundary><RealEstatePage /></RealEstateErrorBoundary>} />
          <Route path="/real-estate/:city/:bucket" element={<RealEstateErrorBoundary><CityBucketPage /></RealEstateErrorBoundary>} />
          <Route path="/real-estate/:slug" element={<RealEstateErrorBoundary><PropertyDetailPage /></RealEstateErrorBoundary>} />
          <Route path="/tools/sip" element={<SIPCalculatorPage />} />
          <Route path="/tools/emi" element={<EMICalculatorPage />} />
          <Route path="/tools/fd" element={<FDCalculatorPage />} />
          <Route path="/tools/tax" element={<TaxCalculatorPage />} />
          <Route path="/tools/screener" element={<StockScreenerPage />} />
          <Route path="/tools/portfolio" element={<PortfolioTesterPage />} />
          {/* MF tool calculators */}
          <Route path="/tools" element={<ToolsHubPage />} />
          <Route path="/tools/step-up-sip" element={<StepUpSIPPage />} />
          <Route path="/tools/goal-sip" element={<GoalSIPPage />} />
          <Route path="/tools/retirement-sip" element={<RetirementSIPPage />} />
          <Route path="/tools/child-education-sip" element={<ChildEducationSIPPage />} />
          <Route path="/tools/marriage-sip" element={<MarriageSIPPage />} />
          <Route path="/tools/inflation-sip" element={<InflationSIPPage />} />
          <Route path="/tools/fire-calculator" element={<FIRECalculatorPage />} />
          <Route path="/tools/lumpsum-calculator" element={<LumpsumCalculatorPage />} />
          <Route path="/tools/swp-calculator" element={<SWPCalculatorPage />} />
          <Route path="/tools/portfolio-analyzer" element={<PortfolioAnalyzerPage />} />
          {/* SEO landing pages */}
          <Route path="/best-mutual-funds-2026" element={<BestMutualFunds2026 />} />
          <Route path="/best-sip-funds" element={<BestSIPFunds />} />
          <Route path="/best-elss-funds" element={<BestELSSFunds />} />
          <Route path="/best-small-cap-funds" element={<BestSmallCapFunds />} />
          <Route path="/best-index-funds" element={<BestIndexFunds />} />
          <Route path="/best-etfs-india" element={<BestETFsIndia />} />
          <Route path="/gold-etf-vs-physical-gold" element={<GoldETFvsPhysical />} />
          <Route path="/etf-vs-mutual-fund" element={<ETFvsMutualFund />} />
          <Route path="/sip-vs-lumpsum" element={<SIPvsLumpsum />} />
          <Route path="/currency-converter" element={<CurrencyConverterPage />} />
          <Route path="/currency-converter/:pair" element={<CurrencyConverterPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/sitemap" element={<SitemapPage />} />
          <Route path="/login" element={<UserLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

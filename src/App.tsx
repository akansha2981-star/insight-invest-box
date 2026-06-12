import { Component, type ErrorInfo, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NewsPage from "./pages/NewsPage";
import NewsHubPage from "./pages/NewsHubPage";
import NewsDetailPage from "./pages/NewsDetailPage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import MarketsPage from "./pages/MarketsPage";
import StocksPage from "./pages/StocksPage";
import EconomyPage from "./pages/EconomyPage";
import MFPage from "./pages/MFPage";
import CryptoPage from "./pages/CryptoPage";
import PortfolioPage from "./pages/PortfolioPage";
import StockReviewPage from "./pages/StockReviewPage";
import StockReviewDetailPage from "./pages/StockReviewDetailPage";
import RealEstatePage from "./pages/RealEstatePage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import CityBucketPage from "./pages/CityBucketPage";
import SIPCalculatorPage from "./pages/SIPCalculatorPage";
import EMICalculatorPage from "./pages/EMICalculatorPage";
import FDCalculatorPage from "./pages/FDCalculatorPage";
import TaxCalculatorPage from "./pages/TaxCalculatorPage";
import StockScreenerPage from "./pages/StockScreenerPage";
import PortfolioTesterPage from "./pages/PortfolioTesterPage";
import AboutPage from "./pages/AboutPage";
import CareersPage from "./pages/CareersPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import SitemapPage from "./pages/SitemapPage";
import CurrencyConverterPage from "./pages/CurrencyConverterPage";
import NotFound from "./pages/NotFound";
import UserLogin from "./pages/UserLogin";
import { FloatingAIButton } from "./components/FloatingAIButton";
import MFScreenerPage from "./pages/MFScreenerPage";
import MFDetailPage from "./pages/MFDetailPage";
import MFComparePage from "./pages/MFComparePage";
import MFOverlapPage from "./pages/MFOverlapPage";
import MFFundHousePage from "./pages/MFFundHousePage";
import MFNewsPage from "./pages/MFNewsPage";
import ETFPage from "./pages/ETFPage";
import ETFScreenerPage from "./pages/ETFScreenerPage";
import ETFDetailPage from "./pages/ETFDetailPage";
import ETFComparePage from "./pages/ETFComparePage";
import ToolsHubPage from "./pages/ToolsHubPage";
import StepUpSIPPage from "./pages/tools/StepUpSIPPage";
import GoalSIPPage from "./pages/tools/GoalSIPPage";
import RetirementSIPPage from "./pages/tools/RetirementSIPPage";
import ChildEducationSIPPage from "./pages/tools/ChildEducationSIPPage";
import MarriageSIPPage from "./pages/tools/MarriageSIPPage";
import InflationSIPPage from "./pages/tools/InflationSIPPage";
import FIRECalculatorPage from "./pages/tools/FIRECalculatorPage";
import LumpsumCalculatorPage from "./pages/tools/LumpsumCalculatorPage";
import SWPCalculatorPage from "./pages/tools/SWPCalculatorPage";
import PortfolioAnalyzerPage from "./pages/tools/PortfolioAnalyzerPage";
import {
  BestMutualFunds2026, BestSIPFunds, BestELSSFunds, BestSmallCapFunds, BestIndexFunds,
  BestETFsIndia, GoldETFvsPhysical, ETFvsMutualFund, SIPvsLumpsum,
} from "./pages/seo/MFLandingPages";
import { useParams, Navigate as RRNavigate } from "react-router-dom";

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

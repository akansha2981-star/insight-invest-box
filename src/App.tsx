import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NewsPage from "./pages/NewsPage";
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
import NotFound from "./pages/NotFound";
import UserLogin from "./pages/UserLogin";
import { FloatingAIButton } from "./components/FloatingAIButton";
import { useParams, Navigate as RRNavigate } from "react-router-dom";

const NewsToBlogRedirect = () => {
  const { slug } = useParams();
  return <RRNavigate to={`/news/${slug}`} replace />;
};

const queryClient = new QueryClient();

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
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:slug" element={<NewsDetailPage />} />
          {/* Legacy/alias routes to prevent 404s from older internal links */}
          <Route path="/blog" element={<Navigate to="/news" replace />} />
          <Route path="/blog/:slug" element={<NewsToBlogRedirect />} />
          <Route path="/mutual-funds" element={<Navigate to="/mf" replace />} />
          <Route path="/markets" element={<MarketsPage />} />
          <Route path="/stocks" element={<StocksPage />} />
          <Route path="/economy" element={<EconomyPage />} />
          <Route path="/mf" element={<MFPage />} />
          <Route path="/crypto" element={<CryptoPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/stocks/reviews" element={<StockReviewPage />} />
          <Route path="/stocks/review/:symbol" element={<StockReviewDetailPage />} />
          <Route path="/real-estate" element={<RealEstatePage />} />
          <Route path="/real-estate/:city/:bucket" element={<CityBucketPage />} />
          <Route path="/real-estate/:slug" element={<PropertyDetailPage />} />
          <Route path="/tools/sip" element={<SIPCalculatorPage />} />
          <Route path="/tools/emi" element={<EMICalculatorPage />} />
          <Route path="/tools/fd" element={<FDCalculatorPage />} />
          <Route path="/tools/tax" element={<TaxCalculatorPage />} />
          <Route path="/tools/screener" element={<StockScreenerPage />} />
          <Route path="/tools/portfolio" element={<PortfolioTesterPage />} />
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

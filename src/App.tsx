import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:slug" element={<NewsDetailPage />} />
          <Route path="/markets" element={<MarketsPage />} />
          <Route path="/stocks" element={<StocksPage />} />
          <Route path="/economy" element={<EconomyPage />} />
          <Route path="/mf" element={<MFPage />} />
          <Route path="/crypto" element={<CryptoPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/stocks/reviews" element={<StockReviewPage />} />
          <Route path="/stocks/review/:symbol" element={<StockReviewDetailPage />} />
          <Route path="/real-estate" element={<RealEstatePage />} />
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

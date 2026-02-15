import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Moisture from "./pages/Moisture";
import Fertility from "./pages/Fertility";
import Schedule from "./pages/Schedule";
import Profile from "./pages/Profile";
import Crops from "./pages/Crops";
import CropComparison from "./pages/CropComparison";
import Sensors from "./pages/Sensors";
import PestDetection from "./pages/PestDetection";
import YieldPrediction from "./pages/YieldPrediction";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineIndicator from "./components/OfflineIndicator";
import InstallPrompt from "./components/InstallPrompt";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <Toaster />
        <Sonner />
        <OfflineIndicator />
        <InstallPrompt />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/moisture"
              element={
                <ProtectedRoute>
                  <Moisture />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fertility"
              element={
                <ProtectedRoute>
                  <Fertility />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedule"
              element={
                <ProtectedRoute>
                  <Schedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crops"
              element={
                <ProtectedRoute>
                  <Crops />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crop-comparison"
              element={
                <ProtectedRoute>
                  <CropComparison />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sensors"
              element={
                <ProtectedRoute>
                  <Sensors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pest-detection"
              element={
                <ProtectedRoute>
                  <PestDetection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/yield-prediction"
              element={
                <ProtectedRoute>
                  <YieldPrediction />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;

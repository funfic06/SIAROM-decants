import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import PrivateGate from "./components/PrivateGate";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CatalogProvider } from "./contexts/CatalogContext";
import { ClientesProvider } from "./contexts/ClientesContext";
import { StorefrontProvider } from "./contexts/StorefrontContext";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import { lazy, Suspense, useEffect } from "react";

const AdminPage = lazy(() => import("./pages/AdminPage"));
// Rota reservada do painel. Troque por um caminho só seu (e mantenha em segredo).
const ADMIN_PATH = "/gestao-k7q2x9m4v1";

function AdminRoute() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  return <Suspense fallback={null}><AdminPage /></Suspense>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/perfumes/:slug" component={ProductDetail} />
      <Route path={ADMIN_PATH} component={AdminRoute} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <CatalogProvider>
            <ClientesProvider>
              <StorefrontProvider>
                <Toaster />
                <PrivateGate>
                  <Router />
                </PrivateGate>
              </StorefrontProvider>
            </ClientesProvider>
          </CatalogProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

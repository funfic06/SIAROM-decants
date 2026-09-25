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
import AdminPage from "./pages/AdminPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/perfumes/:slug" component={ProductDetail} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/admin.html" component={AdminPage} />
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

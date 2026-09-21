import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// NoL Feature Pages
import Home from "./pages/Home";
import RoomPage from "./pages/RoomPage";
import SupportPage from "./pages/SupportPage";
import AdminPage from "./pages/AdminPage";

function Router() {
  return (
    <Switch>
      {/* 1. Public Games Grid Landing */}
      <Route path="/" component={Home} />

      {/* 2. Room Lobby & Live Multiplayer Game */}
      <Route path="/room/:roomCode" component={RoomPage} />

      {/* 3. Support Channels */}
      <Route path="/support" component={SupportPage} />

      {/* 4. Admin Management Dashboard */}
      <Route path="/admin" component={AdminPage} />

      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

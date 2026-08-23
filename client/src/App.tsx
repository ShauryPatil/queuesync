import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import BusinessDetails from "./pages/BusinessDetails";
import LiveQueue from "./pages/LiveQueue";
import { MyBookings, Notifications, ProfileSettings } from "./pages/CustomerAccount";
import MerchantWorkspace from "./pages/MerchantWorkspace";

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/explore" component={Home} /><Route path="/business/:businessId" component={BusinessDetails} /><Route path="/live-queue" component={LiveQueue} /><Route path="/my-bookings" component={MyBookings} /><Route path="/notifications" component={Notifications} /><Route path="/profile" component={ProfileSettings} /><Route path="/settings" component={ProfileSettings} /><Route path="/merchant" component={MerchantWorkspace} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><TooltipProvider><Toaster richColors position="top-right" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

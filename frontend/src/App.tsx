import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { DashboardContent } from "@/components/dashboard/DashboardContent";

function App() {
  return (
    <ErrorBoundary>
      <DashboardProvider>
        <DashboardContent />
      </DashboardProvider>
    </ErrorBoundary>
  );
}

export default App;

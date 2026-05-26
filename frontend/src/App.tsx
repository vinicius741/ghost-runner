import { ThemeProvider } from "@/contexts/ThemeContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { DashboardContent } from "@/components/dashboard/DashboardContent";

function App() {
  return (
    <ThemeProvider>
      <DashboardProvider>
        <DashboardContent />
      </DashboardProvider>
    </ThemeProvider>
  );
}

export default App;

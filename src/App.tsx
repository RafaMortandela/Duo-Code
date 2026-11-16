import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { ToastProvider } from "./components/Toast";
import {
  HomePage,
  ProblemPage,
  ProfilePage,
  ReviewPage,
  SettingsPage,
  TrailPage,
} from "./pages";
import { MotionProvider } from "./motion/MotionProvider";
import { ProgressProvider } from "./progress/ProgressProvider";
import { ThemeProvider } from "./theme/ThemeProvider";

export default function App() {
  return (
    <ToastProvider>
      <ThemeProvider>
        <MotionProvider>
        <ProgressProvider>
          <HashRouter>
            <div className="app">
              <Sidebar />
              <main className="app-main">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/trail" element={<TrailPage />} />
                  <Route path="/problem/:slug" element={<ProblemPage />} />
                  <Route path="/review" element={<ReviewPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </HashRouter>
        </ProgressProvider>
        </MotionProvider>
      </ThemeProvider>
    </ToastProvider>
  );
}

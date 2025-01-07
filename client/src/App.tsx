import { BrowserRouter, Route, Routes } from "react-router";
import Home from "./pages/Home";
import { ThemeProvider } from "./components/ui/theme-provider";
import ProjectInfo from "./pages/ProjectInfo";
import AuthWrapper from "./components/auth/AuthWrapper";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/project/:projectId" element={<ProjectInfo />} />

          {/* Authentication Routes */}
          <Route element={<AuthWrapper />}>
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
          </Route>
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  )
}


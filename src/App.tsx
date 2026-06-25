import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import RoleHome from "./components/RoleHome";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import ExerciseLibrary from "./pages/ExerciseLibrary";
import ExerciseDetail from "./pages/ExerciseDetail";
import MyWorkout from "./pages/MyWorkout";
import AdminUsers from "./pages/AdminUsers";
import TabataRoutines from "./pages/TabataRoutines";
import TabataController from "./pages/TabataController";
import TabataDisplay from "./pages/TabataDisplay";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/tv/:routineId" element={<TabataDisplay />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<RoleHome />} />
              <Route path="/clienti/:id" element={<ClientDetail />} />
              <Route path="/esercizi" element={<ExerciseLibrary />} />
              <Route path="/esercizi/:id" element={<ExerciseDetail />} />
              <Route path="/scheda" element={<MyWorkout />} />
              <Route path="/tabata" element={<TabataRoutines />} />
              <Route path="/tabata/controller/:sessionId" element={<TabataController />} />
              <Route path="/admin/utenti" element={<AdminUsers />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

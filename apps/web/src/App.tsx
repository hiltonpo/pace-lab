import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { CreatePlanPage } from "./pages/CreatePlanPage";
import { PlanDetailPage } from "./pages/PlanDetailPage";
import { CreateWorkoutPage } from "./pages/CreateWorkoutPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/plans/new" element={<CreatePlanPage />} />
          <Route path="/plans/:id" element={<PlanDetailPage />} />
          <Route path="/workouts/new" element={<CreateWorkoutPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

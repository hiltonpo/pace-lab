import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { CreatePlanPage } from "./pages/CreatePlanPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/plans/new" element={<CreatePlanPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

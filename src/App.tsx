import { Navigate, Route, Routes } from 'react-router';
import { AppLayout } from './components/ui/AppLayout.tsx';
import { ProtectedRoute } from './components/ui/ProtectedRoute.tsx';
import { PROJECT_SECTIONS } from './lib/sections.ts';
import { LoginPage } from './pages/LoginPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { NewProjectPage } from './pages/NewProjectPage.tsx';
import { ProjectAgentsPage } from './pages/ProjectAgentsPage.tsx';
import { ProjectBudgetPage } from './pages/ProjectBudgetPage.tsx';
import { ProjectDashboardPage } from './pages/ProjectDashboardPage.tsx';
import { ProjectsPage } from './pages/ProjectsPage.tsx';
import { SectionPlaceholderPage } from './pages/SectionPlaceholderPage.tsx';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<NewProjectPage />} />
        <Route path="/projects/:projectId" element={<AppLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ProjectDashboardPage />} />
          <Route path="agents" element={<ProjectAgentsPage />} />
          <Route path="budget" element={<ProjectBudgetPage />} />
          {PROJECT_SECTIONS.filter(
            (section) =>
              section.key !== 'dashboard' && section.key !== 'agents' && section.key !== 'budget',
          ).map((section) => (
            <Route
              key={section.key}
              path={section.key}
              element={<SectionPlaceholderPage title={section.label} />}
            />
          ))}
          <Route path="*" element={<SectionPlaceholderPage />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/projects" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

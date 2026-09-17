import { Route, Routes } from 'react-router';
import { RequireAuth, RequirePermission } from '../../components/admin/AdminLayout';
import DashboardHome from './DashboardHome';
import StatsPage from './StatsPage';
import LoansAdmin from './LoansAdmin';
import VisitorsAdmin from './VisitorsAdmin';
import SettingsPage from './SettingsPage';
import { BooksAdmin, EventsAdmin, ProjectsAdmin, ResourcesAdmin, SurveysAdmin } from './ContentPages';
import NotFoundPage from '../public/NotFoundPage';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route index element={<RequirePermission perm="stats"><DashboardHome /></RequirePermission>} />
        <Route path="stats" element={<RequirePermission perm="stats"><StatsPage /></RequirePermission>} />
        <Route path="books" element={<RequirePermission perm="content"><BooksAdmin /></RequirePermission>} />
        <Route path="resources" element={<RequirePermission perm="content"><ResourcesAdmin /></RequirePermission>} />
        <Route path="loans" element={<RequirePermission perm="loans"><LoansAdmin /></RequirePermission>} />
        <Route path="projects" element={<RequirePermission perm="content"><ProjectsAdmin /></RequirePermission>} />
        <Route path="events" element={<RequirePermission perm="content"><EventsAdmin /></RequirePermission>} />
        <Route path="surveys" element={<RequirePermission perm="content"><SurveysAdmin /></RequirePermission>} />
        <Route path="visitors" element={<RequirePermission perm="stats"><VisitorsAdmin /></RequirePermission>} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { ConfigProvider } from './context/ConfigContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { PublicLayout } from './components/layout/PublicLayout';
import { Spinner } from './components/ui/Feedback';
import HomePage from './pages/public/HomePage';

const ResourcesPage = lazy(() => import('./pages/public/ResourcesPage'));
const BooksPage = lazy(() => import('./pages/public/BooksPage'));
const BorrowPage = lazy(() => import('./pages/public/BorrowPage'));
const ProjectsPage = lazy(() => import('./pages/public/ProjectsPage'));
const EventsPage = lazy(() => import('./pages/public/EventsPage'));
const SurveysPage = lazy(() => import('./pages/public/SurveysPage'));
const VisitPage = lazy(() => import('./pages/public/VisitPage'));
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage'));

const AdminRoutes = lazy(() => import('./pages/admin/AdminRoutes'));
const LoginPage = lazy(() => import('./pages/admin/LoginPage'));

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfigProvider>
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={<HomePage />} />
                <Route path="resources" element={<ResourcesPage />} />
                <Route path="books" element={<BooksPage />} />
                <Route path="borrow" element={<BorrowPage />} />
                <Route path="borrow/:bookId" element={<BorrowPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="events" element={<EventsPage />} />
                <Route path="surveys" element={<SurveysPage />} />
                <Route path="visit" element={<VisitPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
              <Route
                path="admin/login"
                element={
                  <AuthProvider>
                    <LoginPage />
                  </AuthProvider>
                }
              />
              <Route
                path="admin/*"
                element={
                  <AuthProvider>
                    <AdminRoutes />
                  </AuthProvider>
                }
              />
            </Routes>
          </Suspense>
        </ConfigProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

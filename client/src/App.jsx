import { Link, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './screens/HomePage'
import CatalogPage from './screens/CatalogPage'
import BookDetailsPage from './screens/BookDetailsPage'
import CirculationPage from './screens/CirculationPage'
import InventoryPage from './screens/InventoryPage'
import AnalyticsPage from './screens/AnalyticsPage'
import ProfilePage from './screens/ProfilePage'
import LoginPage from './screens/LoginPage'
import RegisterPage from './screens/RegisterPage'
import CategoriesPage from './screens/CategoriesPage'

function NotFound() {
  return (
    <div className="w-full max-w-[1440px] mx-auto px-margin py-space-xl">
      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-xl text-center max-w-xl mx-auto">
        <span className="material-symbols-outlined text-[44px] text-brass-muted">menu_book</span>
        <p className="font-label-sm text-label-sm uppercase tracking-widest text-brass-muted mt-space-sm">Folio 404</p>
        <h1 className="font-headline-lg text-headline-lg text-walnut-dark mt-1">This shelfmark is not in the registry</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
          The page you requested has been moved, deaccessioned, or never catalogued.
        </p>
        <div className="mt-space-lg flex flex-wrap items-center justify-center gap-space-sm">
          <Link
            to="/catalog"
            className="px-space-lg py-3 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-walnut-dark transition-colors"
          >
            Search the catalogue
          </Link>
          <Link
            to="/"
            className="px-space-lg py-3 rounded-lg bg-parchment text-walnut-dark font-label-lg text-label-lg hover:bg-surface-container-high transition-colors"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="books/:id" element={<BookDetailsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        <Route
          path="circulation"
          element={
            <ProtectedRoute>
              <CirculationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory"
          element={
            <ProtectedRoute roles={['librarian', 'admin']}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/analytics"
          element={
            <ProtectedRoute roles={['librarian', 'admin']}>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

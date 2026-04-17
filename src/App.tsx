import { Routes, Route, Navigate } from "react-router-dom";

// Public
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ActivateTag from "./pages/ActivateTag";
import PublicProfile from "./pages/PublicProfile";
import UpdatePassword from "./pages/UpdatePassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";

// Cliente
import Dashboard from "./pages/Dashboard";
import MyAccount from "./pages/MyAccount";
import MyPets from "./pages/MyPets";
import PetDetails from "./pages/PetDetails";
import MedicalProfile from "./pages/MedicalProfile";
import ManagePetPublicProfile from "./pages/ManagePetPublicProfile";
import Orders from "./pages/Orders";
import Order from "./pages/Order";
import OrderDetail from "./pages/OrderDetail";
import MyTagsPage from "./pages/MyTagsPage";

// Reportes
import MyReports from "./pages/MyReports";
import MyReportDetails from "./pages/MyReportDetails";

// Admin
import AdminDashboard from "./pages/AdminDashboard";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminPetsPage from "./pages/admin/AdminPetsPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import AdminTagsInventoryPage from "./pages/admin/AdminTagsInventoryPage";

// Routes
import AdminRoute from "./routes/AdminRoute";
import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      {/* ================= PUBLIC ================= */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/activar" element={<ActivateTag />} />
      <Route path="/pedido" element={<Order />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/privacidad" element={<PrivacyPolicy />} />
      <Route path="/terminos" element={<TermsConditions />} />
      
      {/* Perfil público (QR / NFC) */}
      <Route path="/p/:code" element={<PublicProfile />} />

      {/* ================= CLIENT ================= */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-account"
        element={
          <ProtectedRoute>
            <MyAccount />
          </ProtectedRoute>
        }
      />

      {/* Mascotas */}
      <Route
        path="/mis-mascotas"
        element={
          <ProtectedRoute>
            <MyPets />
          </ProtectedRoute>
        }
      />

      <Route
        path="/mis-mascotas/:id"
        element={
          <ProtectedRoute>
            <PetDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/mis-mascotas/:id/perfil-medico"
        element={
          <ProtectedRoute>
            <MedicalProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/mis-mascotas/:id/perfil-publico"
        element={
          <ProtectedRoute>
            <ManagePetPublicProfile />
          </ProtectedRoute>
        }
      />

      {/* Pedidos */}
      <Route
        path="/mis-pedidos"
        element={
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        }
      />

      <Route
        path="/mis-pedidos/:id"
        element={
          <ProtectedRoute>
            <OrderDetail />
          </ProtectedRoute>
        }
      />

      <Route path="/mis-placas" element={<MyTagsPage />} />

      {/* ================= REPORTES ================= */}
      <Route
        path="/mis-reportes"
        element={
          <ProtectedRoute>
            <MyReports />
          </ProtectedRoute>
        }
      />

      <Route
        path="/mis-reportes/:id"
        element={
          <ProtectedRoute>
            <MyReportDetails />
          </ProtectedRoute>
        }
      />

      {/* ================= ADMIN ================= */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/pedidos"
        element={
          <AdminRoute>
            <AdminOrdersPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/usuarios"
        element={
          <AdminRoute>
            <AdminUsersPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/mascotas"
        element={
          <AdminRoute>
            <AdminPetsPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/reportes"
        element={
          <AdminRoute>
            <AdminReportsPage />
          </AdminRoute>
        }
      />

      <Route path="/admin/inventario-placas" element={<AdminTagsInventoryPage />} />

      {/* ================= FALLBACK ================= */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
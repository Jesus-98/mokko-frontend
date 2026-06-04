import { Routes, Route, Navigate } from "react-router-dom";

// Tarjeta de Presentación
import ConoceMokko from "./pages/ConoceMokko";

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
import CreatePet from "./pages/CreatePet";
import EditPet from "./pages/EditPet";
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
      {/* ========== TARJETA DE PRESENTACIÓN ========== */}
      <Route path="/conoce-mokko" element={<ConoceMokko />} />
      <Route path="/tarjeta" element={<ConoceMokko />} />
      
      {/* ================= PUBLIC ================= */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/activar" element={<ActivateTag />} />
      <Route path="/pedido" element={<Order />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/privacidad" element={<PrivacyPolicy />} />
      <Route path="/terminos" element={<TermsConditions />} />

      {/* Perfil público QR / NFC */}
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
        path="/mis-mascotas/nueva"
        element={
          <ProtectedRoute>
            <CreatePet />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/mis-mascotas/:id/editar"
        element={
          <ProtectedRoute>
            <EditPet />
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

      {/* Placas del cliente */}
      <Route
        path="/mis-placas"
        element={
          <ProtectedRoute>
            <MyTagsPage />
          </ProtectedRoute>
        }
      />

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

      <Route
        path="/admin/inventario-placas"
        element={
          <AdminRoute>
            <AdminTagsInventoryPage />
          </AdminRoute>
        }
      />

      {/* ================= FALLBACK ================= */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
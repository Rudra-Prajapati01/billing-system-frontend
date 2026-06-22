import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Layout from "../components/Layout";
import Dashboard from "../pages/Dashboard";

// Auth & Protected Routes
import ProtectedRoute from "../components/ProtectedRoute";
import Login from "../pages/auth/Login";
import UserManagement from "../pages/admin/UserManagement";
import CompanyManagement from "../pages/admin/CompanyManagement";

// Master Pages
import AdminMaster from "../pages/master/AdminMaster";
import CompanyProfile from "../pages/master/CompanyProfile";
import CustomerMaster from "../pages/master/CustomerMaster";
import BankMaster from "../pages/master/BankMaster";
import TermsCondition from "../pages/master/TermsCondition";

// Payment Pages (New Folder Structure)
import PaymentMaster from "../pages/payment/PaymentMaster";
import ReceiptMaster from "../pages/payment/ReceiptMaster";
import CustomerReport from "../pages/reports/CustomerReport";

// Sales Pages
import InvoiceCreate from "../pages/sales/InvoiceCreate";
import QuotationCreate from "../pages/sales/QuotationCreate";
import LeadMaster from "../pages/lead/LeadMaster";

export default function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />

                {/* Protected Layout and Billing Pages */}
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>

                    <Route
                        index
                        element={<Navigate to="/dashboard" replace />}
                    />

                    {/* Dashboard */}
                    <Route
                        path="dashboard"
                        element={<Dashboard />}
                    />

                    {/* User Admin (SuperAdmin only) */}
                    <Route
                        path="admin/users"
                        element={<ProtectedRoute adminOnly={true}><UserManagement /></ProtectedRoute>}
                    />

                    <Route
                        path="admin/companies"
                        element={<ProtectedRoute adminOnly={true}><CompanyManagement /></ProtectedRoute>}
                    />

                    {/* User System Configuration */}
                    <Route
                        path="user/admin"
                        element={<AdminMaster />}
                    />

                    <Route
                        path="user/company-profile"
                        element={<CompanyProfile />}
                    />

                    {/* Master */}
                    <Route
                        path="master/customer"
                        element={<CustomerMaster />}
                    />

                    <Route
                        path="master/terms-condition"
                        element={<TermsCondition />}
                    />

                    <Route
                        path="master/bank"
                        element={<BankMaster />}
                    />

                    {/* Payment & Receipt */}
                    <Route
                        path="payment"
                        element={<PaymentMaster />}
                    />

                    <Route
                        path="receipt"
                        element={<ReceiptMaster />} // <-- Fixed Component Name
                    />


                    <Route
                        path="/reports/customer-report"
                        element={<CustomerReport />}
                    />


                    {/* Sales */}
                    <Route
                        path="sales/quotation"
                        element={<QuotationCreate />}
                    />

                    <Route
                        path="sales/invoice"
                        element={<InvoiceCreate />}
                    />

                    <Route
                        path="lead"
                        element={<LeadMaster />}
                    />

                </Route>

            </Routes>
        </BrowserRouter>
    );
}
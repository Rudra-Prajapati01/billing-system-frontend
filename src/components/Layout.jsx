import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import "../pages/dashboard.css";

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth <= 992) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  return (
    <div
      className={[
        "mn-layout",
        collapsed ? "mn-layout--collapsed" : "",
        mobileOpen ? "mn-layout--mobile-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
      />

      {mobileOpen && (
        <div
          className="mn-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="mn-layout__main">
        <Navbar onToggleSidebar={toggleSidebar} />

        <main className="mn-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
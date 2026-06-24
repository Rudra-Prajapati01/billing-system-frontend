import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import { getImageUrl } from "../utils/logoUtil";
import {
  FiHome,
  FiUsers,
  FiDatabase,
  FiUserCheck,
  FiTrendingUp,
  FiCreditCard,
  FiCheckSquare,
  FiArchive,
  FiClipboard,
  FiBarChart2,
  FiFileText,
  FiSliders,
  FiKey,
  FiLogOut,
  FiChevronRight
} from "react-icons/fi";

const menuConfig = [
  {
    section: "MENU",
    items: [
      {
        label: "Dashboard",
        icon: <FiHome />,
        path: "/",
        badge: "01" // Exact Minible Theme Match
      }
    ]
  },
  {
    section: "USER & MASTER",
    items: [
      {
        label: "User",
        icon: <FiUsers />,
        hasChildren: true,
        children: [
          { label: "Admin Master", path: "/user/admin" },
          { label: "Company Profile", path: "/user/company-profile" },
        ],
      },
      {
        label: "Master",
        icon: <FiDatabase />,
        hasChildren: true,
        children: [
          { label: "Customer Master", path: "/master/customer" },
          { label: "Terms & Condition", path: "/master/terms-condition" },
          { label: "Bank Master", path: "/master/bank" },
        ],
      },
      {
        label: "Payment",
        icon: <FiCreditCard />,
        path: "/payment"
      },
    ],
  },
  {
    section: "TRANSACTION",
    items: [
      {
        label: "Lead",
        icon: <FiUserCheck />,
        path: "/lead" // ⬅️ Seedha path de diya, hasChildren aur children hata diye
      },
      {
        label: "Sales / Service",
        icon: <FiTrendingUp />,
        hasChildren: true,
        children: [
          { label: "Quotation", path: "/sales/quotation" },
          { label: "Invoice", path: "/sales/invoice" },
        ]
      },
      { label: "Receipt", icon: <FiCheckSquare />, path: "/transaction/receipt" },
      { label: "To Do Task", icon: <FiClipboard />, path: "/transaction/to-do" },
    ],
  },
  
  {
    section: "REPORTS",
    items: [
      { label: "Transaction", icon: <FiBarChart2 />, hasChildren: true, children: [] },
      {
        label: "Party Report",
        icon: <FiFileText />,
        hasChildren: true,
        children: [
          { label: "Customer Report", path: "/reports/customer-report" }
        ]
      },
      { label: "Other", icon: <FiArchive />, hasChildren: true, children: [] },
    ],
  },
  {
    section: "SETTING",
    items: [
      { label: "Software Setting", icon: <FiSliders />, path: "/setting/software-setting" },
      { label: "Change Password", icon: <FiKey />, path: "/setting/change-password" },
      { label: "Logout", icon: <FiLogOut />, path: "/logout" },
    ],
  },
  {
    section: "ADMINISTRATION",
    adminOnly: true,
    items: [
      {
        label: "Administration",
        icon: <FiSliders />,
        hasChildren: true,
        children: [
          { label: "Users", path: "/admin/users" },
          { label: "Companies", path: "/admin/companies" }
        ],
      },
    ],
  },
];

const Sidebar = ({ collapsed, mobileOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState({
    User: true, // User accordion open by default
    Master: false,
    "Party Report": true, // Automatically open the Party Report accordion for convenience
    Administration: false,
  });
  const [sidebarLogo, setSidebarLogo] = useState(null);

  useEffect(() => {
    const fetchSidebarLogo = async () => {
      try {
        const response = await apiClient.get("/company-profile");
        if (response.data && response.data.profile && response.data.profile.logo) {
          setSidebarLogo(response.data.profile.logo);
        }
      } catch (err) {
        console.error("Failed to load sidebar logo", err);
      }
    };
    fetchSidebarLogo();
  }, []);

  const toggleMenu = (label) => {
    setOpenMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login");
  };

  // Get user role for filtering
  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  let userRole = "";
  if (userStr) {
    try {
      userRole = JSON.parse(userStr).role;
    } catch (e) {
      console.error("Error reading user role in sidebar:", e);
    }
  }

  const filteredMenuConfig = menuConfig.filter((group) => {
    if (group.adminOnly && userRole !== "SuperAdmin") {
      return false;
    }
    return true;
  });

  return (
    <aside
      className={[
        "mn-sidebar",
        collapsed ? "mn-sidebar--collapsed" : "",
        mobileOpen ? "mn-sidebar--mobile-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mn-sidebar__brand">
        <span className="mn-sidebar__logo-icon">
          {sidebarLogo ? (
            <img
              src={getImageUrl(sidebarLogo)}
              alt="Company Logo"
              style={{ width: "32px", height: "32px", objectFit: "contain" }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          ) : (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
              <circle cx="12" cy="12" r="10" fill="#5156be" />
              <path d="M7 14.5 12 8l5 6.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          )}
        </span>
        <span className="mn-sidebar__logo-text">Biling</span>
      </div>

      <nav className="mn-sidebar__nav">
        {filteredMenuConfig.map((group) => (
          <div key={group.section} className="mn-sidebar__section">
            {group.section !== "USER & MASTER" && (
              <div className="mn-sidebar__section-label">{group.section}</div>
            )}

            <ul className="mn-sidebar__list">
              {group.items.map((item) => {
                const isOpen = !!openMenus[item.label];
                const hasChildren = item.hasChildren && item.children && item.children.length > 0;
                const isChildActive = hasChildren && item.children.some(
                  (child) => location.pathname === child.path
                );

                return (
                  <li key={item.label} className="mn-sidebar__item">
                    {item.hasChildren ? (
                      <>
                        <div
                          onClick={() => toggleMenu(item.label)}
                          className={`mn-sidebar__link ${isChildActive ? "mn-sidebar__link--active" : ""}`}
                          style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                        >
                          <span className="mn-sidebar__icon">{item.icon}</span>
                          <span className="mn-sidebar__text">{item.label}</span>

                          <FiChevronRight
                            className="mn-sidebar__chevron"
                            style={{
                              marginLeft: "auto",
                              transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                              transition: "transform 0.2s ease"
                            }}
                          />
                        </div>

                        {isOpen && hasChildren && (
                          <ul className="mn-sidebar__list" style={{ paddingLeft: "15px", marginTop: "5px" }}>
                            {item.children.map((child) => (
                              <li key={child.path} className="mn-sidebar__item">
                                <NavLink
                                  to={child.path}
                                  className={({ isActive }) =>
                                    "mn-sidebar__link" +
                                    (isActive ? " mn-sidebar__link--active" : "")
                                  }
                                  style={{ paddingLeft: "25px" }}
                                >
                                  <span className="mn-sidebar__text">{child.label}</span>
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <NavLink
                        to={item.path || "#"}
                        end={item.path === "/"}
                        onClick={(e) => {
                          if (item.label === "Logout" || item.path === "/logout") {
                            e.preventDefault();
                            handleLogout();
                          }
                        }}
                        className={({ isActive }) =>
                          "mn-sidebar__link" +
                          (isActive ? " mn-sidebar__link--active" : "")
                        }
                      >
                        <span className="mn-sidebar__icon">{item.icon}</span>
                        <span className="mn-sidebar__text">{item.label}</span>

                        {item.badge && (
                          <span className="mn-sidebar__badge">{item.badge}</span>
                        )}
                      </NavLink>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/import", label: "Import Statements" },
  { to: "/transactions", label: "Transactions" },
  { to: "/assets", label: "Assets" },
  { to: "/liabilities", label: "Liabilities" },
  { to: "/net-worth", label: "Net Worth" },
  { to: "/settings", label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon" aria-hidden="true">
          💰
        </span>
        <span className="brand-name">MyFinancePal</span>
      </div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `sidebar-link${isActive ? " active" : ""}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <p className="sidebar-privacy">
        Your data stays on this device. Nothing is uploaded.
      </p>
    </aside>
  );
}

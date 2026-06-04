import { useCallback, useEffect, useId, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  NavIcon,
  PanelCloseIcon,
  PanelOpenIcon,
  SearchIcon,
  type NavIconId,
} from "../lib/nav-icons";
import { TRANSACTION_SEARCH_PARAM } from "../lib/transaction-search-query";

export type NavLinkConfig = {
  to: string;
  label: string;
  icon: NavIconId;
  end?: boolean;
};

export const NAV_LINKS: NavLinkConfig[] = [
  { to: "/", label: "Overview", icon: "overview", end: true },
  { to: "/import", label: "Import Statements", icon: "import" },
  { to: "/transactions", label: "Transactions", icon: "transactions" },
  { to: "/assets", label: "Assets", icon: "assets" },
  { to: "/liabilities", label: "Liabilities", icon: "liabilities" },
  { to: "/net-worth", label: "Net Worth", icon: "net-worth" },
];

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  navExpanded: boolean;
  showCloseIcon: boolean;
  onToggleNav: () => void;
  onExpandNav: () => void;
  onCloseMobile: () => void;
};

export function Sidebar({
  collapsed,
  mobileOpen,
  navExpanded,
  showCloseIcon,
  onToggleNav,
  onExpandNav,
  onCloseMobile,
}: SidebarProps) {
  const searchFieldId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryFromUrl = searchParams.get(TRANSACTION_SEARCH_PARAM) ?? "";
  const [searchExpanded, setSearchExpanded] = useState(Boolean(queryFromUrl));
  const [searchValue, setSearchValue] = useState(queryFromUrl);

  useEffect(() => {
    setSearchValue(queryFromUrl);
    if (queryFromUrl) setSearchExpanded(true);
  }, [queryFromUrl]);

  const applySearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (location.pathname === "/transactions") {
        setSearchParams(trimmed ? { [TRANSACTION_SEARCH_PARAM]: trimmed } : {}, {
          replace: true,
        });
      } else if (trimmed) {
        navigate(
          `/transactions?${TRANSACTION_SEARCH_PARAM}=${encodeURIComponent(trimmed)}`,
        );
      }
    },
    [location.pathname, navigate, setSearchParams],
  );

  const openSearch = useCallback(() => {
    setSearchExpanded(true);
    if (collapsed && !mobileOpen) onExpandNav();
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [collapsed, mobileOpen, onExpandNav]);

  const toggleSearch = useCallback(() => {
    if (searchExpanded) {
      setSearchExpanded(false);
      if (searchValue) {
        setSearchValue("");
        applySearch("");
      }
      return;
    }
    openSearch();
  }, [searchExpanded, searchValue, applySearch, openSearch]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    applySearch(value);
  };

  return (
    <aside
      className={`sidebar${collapsed ? " sidebar--collapsed" : ""}${mobileOpen ? " sidebar--mobile-open" : ""}${searchExpanded ? " sidebar--search-open" : ""}`}
      aria-label="Main navigation"
    >
      <div className="sidebar-nav__toolbar">
        <div className="sidebar-nav__toolbar-row">
          <button
            type="button"
            className="sidebar-nav__icon-btn"
            onClick={onToggleNav}
            aria-label={showCloseIcon ? "Close navigation" : "Open navigation"}
            aria-expanded={navExpanded}
            title={showCloseIcon ? "Close navigation" : "Open navigation"}
          >
            {showCloseIcon ? (
              <PanelCloseIcon size={18} />
            ) : (
              <PanelOpenIcon size={18} />
            )}
          </button>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `sidebar-nav__icon-btn sidebar-nav__icon-btn--link${isActive ? " sidebar-nav__icon-btn--active" : ""}`
            }
            title="Settings"
            aria-label="Settings"
            onClick={onCloseMobile}
          >
            <NavIcon id="settings" size={18} />
          </NavLink>

          <button
            type="button"
            className={`sidebar-nav__icon-btn${searchExpanded ? " sidebar-nav__icon-btn--active" : ""}`}
            onClick={toggleSearch}
            aria-label={searchExpanded ? "Close search" : "Search transactions"}
            aria-expanded={searchExpanded}
            title="Search transactions"
          >
            <SearchIcon size={18} />
          </button>
        </div>

        <div
          className={`sidebar-search${searchExpanded ? " sidebar-search--open" : ""}`}
          aria-hidden={!searchExpanded}
        >
          <div className="sidebar-search__inner">
            <label className="sidebar-search__label" htmlFor={searchFieldId}>
              Search any transactions
            </label>
            <input
              ref={searchInputRef}
              id={searchFieldId}
              type="search"
              className="sidebar-search__input"
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Merchant, category, amount…"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            title={collapsed && !searchExpanded ? link.label : undefined}
            className={({ isActive }) =>
              `sidebar-link${isActive ? " active" : ""}`
            }
            onClick={onCloseMobile}
          >
            <span className="sidebar-link__icon" aria-hidden="true">
              <NavIcon id={link.icon} size={20} />
            </span>
            <span className="sidebar-link__label">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <p className="sidebar-privacy">
        Your data stays on this device. Nothing is uploaded.
      </p>
    </aside>
  );
}

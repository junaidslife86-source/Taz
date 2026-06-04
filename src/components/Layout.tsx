import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  APP_NAME,
  readSidebarCollapsedPreference,
  writeSidebarCollapsedPreference,
} from "../constants/app";
import { AppLogo } from "./AppLogo";
import { Sidebar } from "./Sidebar";

type LayoutProps = {
  children: React.ReactNode;
};

function isMobileViewport(): boolean {
  return window.matchMedia("(max-width: 768px)").matches;
}

const CHROME_SCROLL_THRESHOLD = 12;
const CHROME_SCROLL_DELTA = 6;

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readSidebarCollapsedPreference);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chromeHidden, setChromeHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    writeSidebarCollapsedPreference(collapsed);
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
    setChromeHidden(false);
    lastScrollY.current = 0;
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;

      if (y <= CHROME_SCROLL_THRESHOLD) {
        setChromeHidden(false);
      } else if (delta > CHROME_SCROLL_DELTA) {
        setChromeHidden(true);
      } else if (delta < -CHROME_SCROLL_DELTA) {
        setChromeHidden(false);
      }

      lastScrollY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMobileNav = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const navExpanded = mobileOpen || !collapsed;
  const showCloseIcon = isMobileViewport() ? mobileOpen : !collapsed;

  const handleNavToggle = useCallback(() => {
    if (isMobileViewport()) {
      setMobileOpen((open) => !open);
    } else {
      setCollapsed((c) => !c);
    }
  }, []);

  return (
    <div
      className={`app-layout${collapsed ? " app-layout--sidebar-collapsed" : ""}${mobileOpen ? " app-layout--sidebar-mobile-open" : ""}`}
    >
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        navExpanded={navExpanded}
        showCloseIcon={showCloseIcon}
        onToggleNav={handleNavToggle}
        onExpandNav={() => setCollapsed(false)}
        onCloseMobile={closeMobileNav}
      />

      {mobileOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={closeMobileNav}
        />
      ) : null}

      <div className="main-pane">
        <header
          className={`app-chrome${chromeHidden ? " app-chrome--hidden" : ""}`}
        >
          <Link to="/" className="app-chrome__brand">
            <span className="app-chrome__logo" aria-hidden="true">
              <AppLogo size={40} className="app-chrome__logo-img" />
            </span>
            <span className="app-chrome__title">{APP_NAME}</span>
          </Link>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}

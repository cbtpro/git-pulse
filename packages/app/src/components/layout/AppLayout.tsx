import { useTranslation } from "../../i18n";
import { Avatar, Button } from "@arco-design/web-react";
import { ArrowUpRight, UserRound } from "lucide-react";
import {
  Navigate,
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "../../stores/authStore";
import {
  NAVIGATION_ITEMS,
  pagePath,
  PROFILE_SETTINGS_PATH,
} from "../../types/navigation";
import { DesktopSidebar } from "../navigation/DesktopSidebar";
import { MobileBottomNav } from "../navigation/MobileBottomNav";
import { HomePage } from "../../pages/HomePage";
import { ExplorePage } from "../../pages/ExplorePage";
import { InboxPage } from "../../pages/InboxPage";
import { ProfilePage } from "../../pages/ProfilePage";
import { GlobalSearch } from "../search/GlobalSearch";
import { SettingsPage } from "../../pages/SettingsPage";
import { ReleaseCenterPage } from "../../pages/ReleaseCenterPage";
import { StarCollectionsPage } from "../../pages/StarCollectionsPage";
import { RepositoryPage } from "../../pages/RepositoryPage";

export function AppLayout({ onShowLogin }: { onShowLogin: () => void }) {
  const { t } = useTranslation();
  const { isLoggedIn, userProfile, activeAccountId } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const page =
    NAVIGATION_ITEMS.find(
      (item) =>
        location.pathname === pagePath(item.id) ||
        (item.id !== "home" &&
          location.pathname.startsWith(`${pagePath(item.id)}/`)),
    ) || NAVIGATION_ITEMS[0];
  const isProfileSettings = location.pathname === PROFILE_SETTINGS_PATH;
  const pageTitle = isProfileSettings ? t("账号与外观") : t(page.label);
  useEffect(() => {
    document.title = `${pageTitle} · GitPulse`;
  }, [pageTitle]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <div className="gp-app">
      <a
        className="gp-skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        {t("跳到主要内容")}
      </a>
      <DesktopSidebar
        currentPage={page.id}
        isLoggedIn={isLoggedIn}
        onShowLogin={onShowLogin}
      />
      <div className="gp-workspace">
        <header className="gp-topbar">
          <div className="gp-breadcrumb">
            {isProfileSettings ? (
              <Link to="/profile">{t("我的空间")}</Link>
            ) : (
              <span>{t("工作台")}</span>
            )}
            <span>/</span>
            <strong>{pageTitle}</strong>
          </div>
          <div className="gp-topbar-actions">
            <GlobalSearch
              key={activeAccountId || "guest"}
              onShowLogin={onShowLogin}
            />
            <div className="gp-topbar-divider" />
            {isLoggedIn && userProfile ? (
              <button
                className="gp-account-button"
                onClick={() => navigate("/profile")}
                aria-label={t("查看我的空间")}
              >
                <Avatar size={30}>
                  <img src={userProfile.avatar_url} alt="" />
                </Avatar>
                <span>{userProfile.login}</span>
              </button>
            ) : (
              <Button
                type="primary"
                onClick={onShowLogin}
                icon={<UserRound size={16} />}
              >
                {t("登录")}
              </Button>
            )}
          </div>
        </header>
        <main id="main-content" className="gp-main" tabIndex={-1}>
          <Routes key={activeAccountId || "guest"}>
            <Route path="/profile/releases" element={<ReleaseCenterPage onShowLogin={onShowLogin} />} />
            <Route path="/profile/collections" element={<StarCollectionsPage onShowLogin={onShowLogin} />} />
            <Route path="/repo/:owner/:name" element={<RepositoryPage onShowLogin={onShowLogin} />} />
            <Route path="/" element={<HomePage onShowLogin={onShowLogin} />} />
            <Route
              path="/explore"
              element={<ExplorePage onShowLogin={onShowLogin} />}
            />
            <Route
              path="/inbox"
              element={<InboxPage onShowLogin={onShowLogin} />}
            />
            <Route
              path="/profile"
              element={<ProfilePage onShowLogin={onShowLogin} />}
            />
            <Route
              path={PROFILE_SETTINGS_PATH}
              element={<SettingsPage onShowLogin={onShowLogin} />}
            />
            <Route
              path="/settings"
              element={<Navigate to={PROFILE_SETTINGS_PATH} replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <footer className="gp-footer">
            <span>{t("GitPulse · 保持与开源世界的连接")}</span>
            <a href="https://github.com" target="_blank" rel="noreferrer">
              {t("在 GitHub 继续探索")}
              <ArrowUpRight size={12} />
            </a>
          </footer>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

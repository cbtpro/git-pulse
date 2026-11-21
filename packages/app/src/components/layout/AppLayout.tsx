import { useTranslation } from "../../i18n";
import { Avatar, Button } from "@arco-design/web-react";
import { ArrowUpRight, UserRound } from "lucide-react";
import { Navigate, Route, useNavigate } from "react-router-dom";
import { lazy, useEffect } from "react";
import { useAuthStore } from "../../stores/authStore";
import { PROFILE_SETTINGS_PATH } from "../../types/navigation";
import { DesktopSidebar } from "../navigation/DesktopSidebar";
import { MobileBottomNav } from "../navigation/MobileBottomNav";
import { AppBreadcrumbs } from "../navigation/AppBreadcrumbs";
import {
  useAppLinkNavigation,
  useNavigationTrail,
} from "../routing/useAppNavigation";
import { GlobalSearch } from "../search/GlobalSearch";
import {
  PageStateProvider,
  RetainedRoutes,
  usePageDestination,
} from "../routing/PageState";

const HomePage = lazy(() =>
  import("../../pages/HomePage").then((module) => ({
    default: module.HomePage,
  })),
);

const ExplorePage = lazy(() =>
  import("../../pages/ExplorePage").then((module) => ({
    default: module.ExplorePage,
  })),
);

const InboxPage = lazy(() =>
  import("../../pages/InboxPage").then((module) => ({
    default: module.InboxPage,
  })),
);

const ProfilePage = lazy(() =>
  import("../../pages/ProfilePage").then((module) => ({
    default: module.ProfilePage,
  })),
);

const SettingsPage = lazy(() =>
  import("../../pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);

const OfflineWorkspacePage = lazy(() =>
  import("../../pages/OfflineWorkspacePage").then((module) => ({
    default: module.OfflineWorkspacePage,
  })),
);

const ReleaseCenterPage = lazy(() =>
  import("../../pages/ReleaseCenterPage").then((module) => ({
    default: module.ReleaseCenterPage,
  })),
);

const StarCollectionsPage = lazy(() =>
  import("../../pages/StarCollectionsPage").then((module) => ({
    default: module.StarCollectionsPage,
  })),
);

const RepositoryPage = lazy(() =>
  import("../../pages/RepositoryPage").then((module) => ({
    default: module.RepositoryPage,
  })),
);

export function AppLayout({ onShowLogin }: { onShowLogin: () => void }) {
  const account = useAuthStore((state) => state.activeAccountId);
  return (
    <PageStateProvider key={account || "guest"}>
      <AppLayoutContent onShowLogin={onShowLogin} />
    </PageStateProvider>
  );
}

function AppLayoutContent({ onShowLogin }: { onShowLogin: () => void }) {
  const { t } = useTranslation();
  const { isLoggedIn, userProfile, activeAccountId } = useAuthStore();
  const navigate = useNavigate();
  const destination = usePageDestination();
  const onNavigateLink = useAppLinkNavigation();
  const { trail, section } = useNavigationTrail();
  const current = trail.at(-1)!;
  const pageTitle = current.literal ? current.label : t(current.label);
  useEffect(() => {
    document.title = `${pageTitle} · GitPulse`;
  }, [pageTitle]);
  return (
    <div className="gp-app" onClick={onNavigateLink}>
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
        currentPage={section}
        isLoggedIn={isLoggedIn}
        onShowLogin={onShowLogin}
      />
      <div className="gp-workspace">
        <header className="gp-topbar">
          <AppBreadcrumbs trail={trail} />
          <div className="gp-topbar-actions">
            <GlobalSearch
              key={activeAccountId || "guest"}
              onShowLogin={onShowLogin}
            />
            <div className="gp-topbar-divider" />
            {isLoggedIn && userProfile ? (
              <button
                className="gp-account-button"
                onClick={() => {
                  const target = destination("/profile");
                  navigate(target.to, { state: target.state });
                }}
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
          <RetainedRoutes>
            <Route
              path="/profile/offline"
              element={<OfflineWorkspacePage onShowLogin={onShowLogin} />}
            />
            <Route
              path="/profile/releases"
              element={<ReleaseCenterPage onShowLogin={onShowLogin} />}
            />
            <Route
              path="/profile/collections"
              element={<StarCollectionsPage onShowLogin={onShowLogin} />}
            />
            <Route
              path="/repo/:owner/:name"
              element={<RepositoryPage onShowLogin={onShowLogin} />}
            />
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
          </RetainedRoutes>
          <footer className="gp-footer">
            <span>{t("GitPulse · 保持与开源世界的连接")}</span>
            <a href="https://github.com" target="_blank" rel="noreferrer">
              {t("在 GitHub 继续探索")}
              <ArrowUpRight size={12} />
            </a>
          </footer>
        </main>
      </div>
      <MobileBottomNav currentPage={section} />
    </div>
  );
}

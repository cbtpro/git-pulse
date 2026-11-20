import { APP_VERSION } from "../../version";
import { useTranslation } from "../../i18n";
import { Menu, Button } from "@arco-design/web-react";
import { ArrowUpRight, CircleHelp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  NAVIGATION_ITEMS,
  pagePath,
  type NavigationPage,
} from "../../types/navigation";
import { Brand } from "../common/Brand";

export function DesktopSidebar({
  currentPage,
  isLoggedIn,
  onShowLogin,
}: {
  currentPage: NavigationPage;
  isLoggedIn: boolean;
  onShowLogin: () => void;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  return (
    <aside className="gp-sidebar">
      <a className="gp-brand-link" href="#/" aria-label={t("GitPulse 概览")}>
        <Brand />
      </a>
      <div className="gp-nav-caption">{t("工作台")}</div>
      <nav aria-label={t("主导航")}>
        <Menu
          selectedKeys={[currentPage]}
          onClickMenuItem={(key) => navigate(pagePath(key as NavigationPage))}
        >
          {NAVIGATION_ITEMS.map(({ id, label, icon: Icon }) => (
            <Menu.Item key={id} aria-label={t(label)}>
              <span className="gp-menu-content" title={t(label)}>
                <Icon size={19} aria-hidden="true" />
                <span>{t(label)}</span>
              </span>
            </Menu.Item>
          ))}
        </Menu>
      </nav>
      <div className="gp-sidebar-bottom">
        {!isLoggedIn && (
          <div className="gp-sidebar-connect">
            <div className="gp-connect-dot" />
            <strong>{t("让工作台属于你")}</strong>
            <p>{t("连接账号，集中查看通知与仓库。")}</p>
            <Button long type="primary" onClick={onShowLogin}>
              {t("连接 GitHub")}
              <ArrowUpRight size={15} />
            </Button>
          </div>
        )}
        <a
          className="gp-help-link"
          aria-label={t("GitHub 使用帮助")}
          title={t("GitHub 使用帮助")}
          href={`https://docs.github.com/${i18n.language.startsWith("zh") ? "zh" : i18n.language === "ja" ? "ja" : "en"}`}
          target="_blank"
          rel="noreferrer"
        >
          <CircleHelp size={17} />
          <span>{t("GitHub 使用帮助")}</span>
          <ArrowUpRight size={13} />
        </a>
        <div className="gp-sidebar-version">
          GitPulse <span>v{APP_VERSION}</span>
        </div>
      </div>
    </aside>
  );
}

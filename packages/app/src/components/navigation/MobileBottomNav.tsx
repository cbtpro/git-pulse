import { useTranslation } from "../../i18n";
import { NavLink } from "react-router-dom";
import { NAVIGATION_ITEMS, pagePath } from "../../types/navigation";
import { usePageDestination } from "../routing/PageState";

export function MobileBottomNav() {
  const { t } = useTranslation();
  const destination = usePageDestination();
  return (
    <nav className="gp-mobile-nav" aria-label={t("底部导航")}>
      {NAVIGATION_ITEMS.map(({ id, shortLabel, icon: Icon }) => (
        <NavLink
          key={id}
          {...destination(pagePath(id))}
          end={id === "home"}
          className={({ isActive }) =>
            isActive ? "gp-mobile-link is-active" : "gp-mobile-link"
          }
        >
          <Icon size={21} aria-hidden="true" />
          <span>{t(shortLabel)}</span>
        </NavLink>
      ))}
    </nav>
  );
}

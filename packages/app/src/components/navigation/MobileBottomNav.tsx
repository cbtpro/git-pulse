import { useTranslation } from "../../i18n";
import { Link } from "react-router-dom";
import {
  NAVIGATION_ITEMS,
  pagePath,
  type NavigationPage,
} from "../../types/navigation";
import { useTabDestination } from "../routing/PageState";

export function MobileBottomNav({
  currentPage,
}: {
  currentPage: NavigationPage;
}) {
  const { t } = useTranslation();
  const destination = useTabDestination();
  return (
    <nav className="gp-mobile-nav" aria-label={t("底部导航")}>
      {NAVIGATION_ITEMS.map(({ id, shortLabel, icon: Icon }) => (
        <Link
          key={id}
          {...destination(pagePath(id))}
          aria-current={currentPage === id ? "page" : undefined}
          className={
            currentPage === id ? "gp-mobile-link is-active" : "gp-mobile-link"
          }
        >
          <Icon size={21} aria-hidden="true" />
          <span>{t(shortLabel)}</span>
        </Link>
      ))}
    </nav>
  );
}

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  type MouseEventHandler,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronRight, Ellipsis, House } from "lucide-react";
import { useTranslation } from "../../i18n";
import type { NavigationCrumb } from "../routing/navigationTrail";
import "./breadcrumbs.css";

function CrumbMenu({
  items,
  onNavigate,
}: {
  items: NavigationCrumb[];
  onNavigate: MouseEventHandler<HTMLAnchorElement>;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDetailsElement>(null);
  const location = useLocation();
  useLayoutEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [location.key]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (
        ref.current &&
        event.target instanceof Node &&
        !ref.current.contains(event.target)
      )
        ref.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <details
      ref={ref}
      className="gp-crumb-menu"
      onBlur={(event) => {
        // Safari does not focus clicked links; its null relatedTarget arrives
        // before click. Closing here would remove the link before navigation.
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && ref.current?.open) {
          event.preventDefault();
          event.stopPropagation();
          ref.current.open = false;
          ref.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary aria-label={t("展开导航路径")} title={t("展开导航路径")}>
        <Ellipsis size={18} aria-hidden="true" />
      </summary>
      <ul className="gp-crumb-menu-items">
        {items.map((item, index) => (
          <li key={index}>
            <Link to={item.to} state={item.state} replace onClick={onNavigate}>
              {item.literal ? item.label : t(item.label)}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function AppBreadcrumbs({ trail }: { trail: NavigationCrumb[] }) {
  const { t } = useTranslation();
  const location = useLocation();
  const focusContent = useRef(false);
  const label = (item: NavigationCrumb) =>
    item.literal ? item.label : t(item.label);
  const parent = trail.at(-2);
  const current = trail.at(-1)!;
  const ancestors = trail.slice(0, -1);
  const collapsed = trail.length > 4;
  useLayoutEffect(() => {
    if (focusContent.current) {
      document.getElementById("main-content")?.focus({ preventScroll: true });
      focusContent.current = false;
    }
  }, [location.key]);
  const onNavigate: MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    )
      focusContent.current = true;
  };
  const separator = (
    <ChevronRight size={12} className="gp-crumb-separator" aria-hidden="true" />
  );
  return (
    <div className="gp-header-location">
      {parent && (
        <Link
          className="gp-page-back"
          to={parent.to}
          state={parent.state}
          replace
          aria-label={t("返回{{page}}", { page: label(parent) })}
          title={t("返回{{page}}", { page: label(parent) })}
          onClick={onNavigate}
        >
          <ArrowLeft size={19} aria-hidden="true" />
        </Link>
      )}
      <nav
        className={`gp-breadcrumb${trail.length > 2 ? " has-ancestors" : ""}`}
        aria-label={t("面包屑导航")}
      >
        <ol>
          {ancestors.map((item, index) => (
            <Fragment key={index}>
              <li
                className={`${index === 0 ? "gp-crumb-root" : "gp-crumb-ancestor"}${collapsed && index > 0 && index < ancestors.length - 1 ? " is-collapsed" : ""}`}
              >
                <Link
                  to={item.to}
                  state={item.state}
                  replace
                  title={label(item)}
                  aria-label={label(item)}
                  onClick={onNavigate}
                >
                  {index === 0 && <House size={16} aria-hidden="true" />}
                  <span>{label(item)}</span>
                </Link>
                {separator}
              </li>
              {index === 0 && collapsed && (
                <li className="gp-crumb-desktop-overflow">
                  <CrumbMenu
                    items={ancestors.slice(1, -1)}
                    onNavigate={onNavigate}
                  />
                  {separator}
                </li>
              )}
            </Fragment>
          ))}
          {trail.length > 2 && (
            <li className="gp-crumb-mobile-overflow">
              <CrumbMenu items={ancestors} onNavigate={onNavigate} />
              {separator}
            </li>
          )}
          <li className="gp-crumb-current">
            <span aria-current="page" title={label(current)}>
              {label(current)}
            </span>
          </li>
        </ol>
      </nav>
    </div>
  );
}

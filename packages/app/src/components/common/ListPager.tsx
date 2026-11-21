import { useTranslation } from "../../i18n";
import { Button } from "@arco-design/web-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { usePageActive, usePageScrollToTop } from "../routing/PageState";

export function ListPager({
  page,
  hasNext,
  onChange,
}: {
  page: number;
  hasNext: boolean;
  onChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  const active = usePageActive();
  const scrollToTop = usePageScrollToTop();
  const previous = useRef(page);
  useLayoutEffect(() => {
    if (previous.current !== page && active) scrollToTop();
    previous.current = page;
  }, [page, active, scrollToTop]);
  if (page === 1 && !hasNext) return null;
  const changePage = (next: number) => {
    onChange(next);
  };
  return (
    <nav className="gp-list-pager" aria-label={t("列表分页")}>
      <Button
        disabled={page === 1}
        onClick={() => changePage(page - 1)}
        icon={<ChevronLeft size={16} />}
      >
        {t("上一页")}
      </Button>
      <span>{t("第 {{page}} 页", { page })}</span>
      <Button disabled={!hasNext} onClick={() => changePage(page + 1)}>
        {t("下一页")}
        <ChevronRight size={16} />
      </Button>
    </nav>
  );
}

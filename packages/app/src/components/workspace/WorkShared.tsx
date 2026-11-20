import { Button } from "@arco-design/web-react";
import { useTranslation } from "../../i18n";
import { ProfileMarkdown } from "../profile/ProfileReadmeCard";
export function MarkdownBody({
  body,
  url,
}: {
  body: string | null | undefined;
  url: string;
}) {
  const { t } = useTranslation();
  return body ? (
    <ProfileMarkdown readme={{ markdown: body, htmlUrl: url, rawUrl: url }} />
  ) : (
    <p className="gp-work-muted">{t("暂无描述")}</p>
  );
}
export function WorkPager({
  page,
  hasNext,
  busy,
  onChange,
}: {
  page: number;
  hasNext: boolean;
  busy?: boolean;
  onChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <nav className="gp-work-toolbar gp-work-pager" aria-label={t("分页")}>
      <Button disabled={page <= 1 || busy} onClick={() => onChange(page - 1)}>
        {t("上一页")}
      </Button>
      <span>{page}</span>
      <Button disabled={!hasNext || busy} onClick={() => onChange(page + 1)}>
        {t("下一页")}
      </Button>
    </nav>
  );
}

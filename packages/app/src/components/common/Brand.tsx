import { GitBranch } from "lucide-react";
import { useTranslation } from "../../i18n";

export function Brand() {
  const { t } = useTranslation();
  return (
    <div className="gp-brand">
      <span className="gp-brand-mark">
        <GitBranch size={22} aria-hidden="true" />
      </span>
      <span className="gp-brand-name">
        GitPulse<span>{t("YOUR GITHUB WORKSPACE")}</span>
      </span>
    </div>
  );
}

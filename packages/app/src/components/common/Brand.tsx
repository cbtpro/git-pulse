import { useTranslation } from "../../i18n";

export function Brand() {
  const { t } = useTranslation();
  return (
    <div className="gp-brand">
      <span className="gp-brand-mark">
        <img
          src={`${import.meta.env.BASE_URL}icons/brand.webp`}
          width={38}
          height={38}
          alt=""
        />
      </span>
      <span className="gp-brand-name">
        GitPulse<span>{t("YOUR GITHUB WORKSPACE")}</span>
      </span>
    </div>
  );
}

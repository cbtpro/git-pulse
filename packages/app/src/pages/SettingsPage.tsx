import { WidgetSettingsCard } from "../components/contributions/WidgetSettingsCard";
import { APP_VERSION } from "../version";
import { useTranslation } from "../i18n";
import { Card, Radio, Select, Switch } from "@arco-design/web-react";
import { LANGUAGES, type Language } from "../i18n/languages";
import {
  Check,
  Laptop,
  Monitor,
  Moon,
  Palette,
  Rows3,
  Sun,
  Scan,
  Languages,
  Layers,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import {
  usePreferencesStore,
  type Density,
  type Theme,
} from "../stores/preferencesStore";
import { AccountSettingsCard } from "../components/AccountSettingsCard";

const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "跟随系统", icon: Monitor },
];

export function SettingsPage({ onShowLogin }: { onShowLogin: () => void }) {
  const { t } = useTranslation();
  const {
    theme,
    density,
    safeArea,
    headerBlur,
    language,
    showProfileReadme,
    showPinnedRepositories,
    showGitHubPages,
    setTheme,
    setDensity,
    setSafeArea,
    setHeaderBlur,
    setLanguage,
    setShowProfileReadme,
    setShowPinnedRepositories,
    setShowGitHubPages,
  } = usePreferencesStore();
  return (
    <div className="gp-page gp-settings">
      <PageHeader
        eyebrow={t("ACCOUNT & APPEARANCE")}
        title={t("账号与外观")}
        description={t("管理你的 GitHub 账号，调整主题与内容密度。")}
      />
      <div className="gp-settings-layout">
        <div className="gp-settings-main">
          <AccountSettingsCard onShowLogin={onShowLogin} />
          <WidgetSettingsCard />
          <Card className="gp-settings-card">
            <div className="gp-card-title">
              <Palette size={20} />
              <h2>{t("外观与显示")}</h2>
            </div>
            <div className="gp-setting-row gp-language-setting">
              <div>
                <h3 id="language-label">
                  <Languages size={17} />
                  {t("界面语言")}
                </h3>
                <p>{t("选择应用显示语言，立即生效。")}</p>
              </div>
              <Select
                value={language}
                options={LANGUAGES.map((option) => ({ ...option }))}
                onChange={(value) => setLanguage(value as Language)}
                aria-label={t("界面语言")}
              />
            </div>
            <div className="gp-setting-heading">
              <h3>{t("界面主题")}</h3>
              <p>{t("选择舒适的配色，或自动跟随设备设置。")}</p>
            </div>
            <Radio.Group
              value={theme}
              onChange={(value) => setTheme(value as Theme)}
              className="gp-theme-options"
              aria-label={t("界面主题")}
            >
              {themes.map(({ value, label, icon: Icon }) => (
                <Radio key={value} value={value}>
                  <div
                    className={`gp-theme-preview gp-preview-${value}`}
                    aria-hidden="true"
                  >
                    <span className="gp-preview-sidebar" />
                    <span className="gp-preview-body">
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                  <span className="gp-theme-label">
                    <Icon size={16} />
                    {t(label)}
                    {theme === value && (
                      <Check size={15} className="gp-selected-check" />
                    )}
                  </span>
                </Radio>
              ))}
            </Radio.Group>
            <div className="gp-setting-row">
              <div>
                <h3>
                  <Rows3 size={17} />
                  {t("内容密度")}
                </h3>
                <p>{t("调整卡片间距与控件大小。")}</p>
              </div>
              <Radio.Group
                type="button"
                value={density}
                onChange={(value) => setDensity(value as Density)}
                aria-label={t("内容密度")}
              >
                <Radio value="comfortable">{t("舒适")}</Radio>
                <Radio value="compact">{t("紧凑")}</Radio>
              </Radio.Group>
            </div>
            <div className="gp-setting-row gp-display-setting">
              <div>
                <h3 id="header-blur-label">
                  <Layers size={17} />
                  {t("顶部毛玻璃效果")}
                </h3>
                <p id="header-blur-description">
                  {t("让顶部栏呈现柔和的背景模糊效果。关闭后使用不透明背景。")}
                </p>
              </div>
              <Switch
                checked={headerBlur}
                onChange={setHeaderBlur}
                aria-labelledby="header-blur-label"
                aria-describedby="header-blur-description"
              />
            </div>
            <div className="gp-setting-row gp-safe-area-setting">
              <div>
                <h3 id="safe-area-label">
                  <Scan size={17} />
                  {t("开启安全区")}
                </h3>
                <p id="safe-area-description">
                  {t(
                    "为状态栏与底部手势条留出空间。关闭后扩大可视区域，内容可能与系统区域重叠。",
                  )}
                </p>
              </div>
              <Switch
                checked={safeArea}
                onChange={setSafeArea}
                aria-labelledby="safe-area-label"
                aria-describedby="safe-area-description"
              />
            </div>
            <div className="gp-settings-saved">
              <Check size={14} />
              {t("设置自动保存在当前设备")}
            </div>
          </Card>
          <Card className="gp-settings-card">
            <div className="gp-card-title">
              <Laptop size={20} />
              <h2>{t("我的空间")}</h2>
            </div>
            {[
              {
                title: "显示个人 Profile",
                description: "在贡献活动上方展示 GitHub 个人主页 README。",
                checked: showProfileReadme,
                onChange: setShowProfileReadme,
              },
              {
                title: "显示置顶仓库",
                description: "在我的仓库上方展示 GitHub 主页置顶的项目。",
                checked: showPinnedRepositories,
                onChange: setShowPinnedRepositories,
              },
              {
                title: "显示 GitHub Pages",
                description: "汇总你的仓库中已开启的 GitHub Pages 站点。",
                checked: showGitHubPages,
                onChange: setShowGitHubPages,
              },
            ].map((setting) => (
              <div
                className="gp-setting-row gp-display-setting"
                key={setting.title}
              >
                <div>
                  <h3>{t(setting.title)}</h3>
                  <p>{t(setting.description)}</p>
                </div>
                <Switch
                  checked={setting.checked}
                  onChange={setting.onChange}
                  aria-label={t(setting.title)}
                />
              </div>
            ))}
          </Card>
        </div>
        <aside>
          <Card className="gp-settings-about">
            <div className="gp-about-icon">
              <Laptop size={24} />
            </div>
            <h3>{t("专注你的开源日常")}</h3>
            <p>{t("GitPulse 将项目探索、通知和个人仓库放在同一个工作台。")}</p>
            <div>
              <span>{t("当前版本")}</span>
              <strong>{APP_VERSION}</strong>
            </div>
            <div>
              <span>{t("偏好保存")}</span>
              <strong>{t("当前设备")}</strong>
            </div>
            <p className="gp-about-note">
              {t("外观偏好仅保存在当前设备，不会修改你的 GitHub 账号设置。")}
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

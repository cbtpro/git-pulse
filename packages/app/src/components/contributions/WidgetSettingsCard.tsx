import { Alert, Button, Card, Message } from "@arco-design/web-react";
import { Boxes, Grid2X2, PanelsTopLeft, RefreshCw } from "lucide-react";
import { useTranslation } from "../../i18n";
import { useAuthStore } from "../../stores/authStore";
import {
  pinContributionWidget,
  refreshContributionWidgets,
  useWidgetStore,
} from "../../services/widgets/WidgetService";

export function WidgetSettingsCard() {
  const { t, i18n } = useTranslation();
  const widget = useWidgetStore();
  const loggedIn = useAuthStore((state) => state.isLoggedIn);
  if (!widget.supported) return null;
  const add = async (mode: "2d" | "3d") => {
    try {
      const accepted = await pinContributionWidget(mode);
      Message.info(
        t(
          accepted
            ? "请在系统面板中确认添加小组件。"
            : "请长按桌面，在小组件列表中找到 GitPulse。",
        ),
      );
    } catch {
      Message.error(t("无法添加小组件，请从桌面的小组件列表添加。"));
    }
  };
  return (
    <Card className="gp-settings-card">
      <div className="gp-card-title">
        <PanelsTopLeft size={20} />
        <h2>{t("桌面贡献小组件")}</h2>
      </div>
      <p>{t("提供二维热力图和三维贡献图，支持不同尺寸，跟随当前登录账号。")}</p>
      <div className="gp-setting-row">
        <div>
          <h3>{t("与应用同步")}</h3>
          <p>
            {t(
              "打开应用、切换账号或刷新贡献图时更新；退出账号后清空小组件。不共享 GitHub Token。",
            )}
          </p>
          {widget.updatedAt && (
            <p role="status">
              {t("最近同步：{{time}}", {
                time: new Intl.DateTimeFormat(i18n.language, {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(widget.updatedAt),
              })}
            </p>
          )}
        </div>
        <Button
          icon={<RefreshCw size={16} />}
          loading={widget.syncing}
          disabled={!widget.available || !loggedIn}
          onClick={() => void refreshContributionWidgets()}
        >
          {t("立即同步")}
        </Button>
      </div>
      {!widget.available ? (
        <Alert
          type="info"
          content={t("当前版本未启用桌面小组件，请安装支持小组件的版本。")}
        />
      ) : !loggedIn ? (
        <Alert type="info" content={t("登录后，贡献活动会同步到桌面。")} />
      ) : widget.error ? (
        <Alert
          type="warning"
          content={t(
            widget.error === "fetch"
              ? "暂时无法获取贡献数据，已保留上次同步内容，请稍后重试。"
              : "小组件同步失败，请稍后重试。",
          )}
        />
      ) : null}
      {widget.available && (
        <p>
          {t(
            "长按桌面，在小组件列表中找到 GitPulse，选择 2D 或 3D。点击小组件可打开应用。",
          )}
        </p>
      )}
      {widget.available && widget.canPin && (
        <div className="gp-inline-actions">
          <Button icon={<Grid2X2 size={16} />} onClick={() => void add("2d")}>
            {t("添加 2D 小组件")}
          </Button>
          <Button icon={<Boxes size={16} />} onClick={() => void add("3d")}>
            {t("添加 3D 小组件")}
          </Button>
        </div>
      )}
    </Card>
  );
}

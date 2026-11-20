/**
 * 自适应登录页面
 * 根据平台自动切换移动端或桌面端视图
 */

import { usePlatform } from "../../hooks/usePlatform";
import { MobileLoginView } from "./mobile/MobileLoginView";
import { DesktopLoginView } from "./desktop/DesktopLoginView";

interface AdaptiveLoginPageProps {
  onLoginSuccess: (token: string) => void;
  onClose?: () => void;
}

export function AdaptiveLoginPage({
  onLoginSuccess,
  onClose,
}: AdaptiveLoginPageProps) {
  const platformInfo = usePlatform();

  return platformInfo.platform === "mobile" ? (
    <MobileLoginView onLoginSuccess={onLoginSuccess} onClose={onClose} />
  ) : (
    <DesktopLoginView onLoginSuccess={onLoginSuccess} onClose={onClose} />
  );
}

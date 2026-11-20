import { AdaptiveLoginPage } from "../views/login/AdaptiveLoginPage";

interface LoginPageProps {
  onLoginSuccess: (token: string) => void;
}

export function LoginPage(props: LoginPageProps) {
  return <AdaptiveLoginPage {...props} />;
}

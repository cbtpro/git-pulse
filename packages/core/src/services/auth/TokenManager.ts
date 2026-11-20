/**
 * Token 管理服务
 * 处理 Token 的存储、获取和清除
 */

const TOKEN_STORAGE_KEY = 'github_token';
const USERNAME_STORAGE_KEY = 'github_username';

export class TokenManager {
  /**
   * 保存 Token
   */
  static saveToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch (error) {
      console.error('保存 Token 失败:', error);
    }
  }

  /**
   * 获取保存的 Token
   */
  static getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('读取 Token 失败:', error);
      return null;
    }
  }

  /**
   * 清除 Token
   */
  static clearToken(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('清除 Token 失败:', error);
    }
  }

  /**
   * 保存用户名
   */
  static saveUsername(username: string): void {
    try {
      localStorage.setItem(USERNAME_STORAGE_KEY, username);
    } catch (error) {
      console.error('保存用户名失败:', error);
    }
  }

  /**
   * 获取保存的用户名
   */
  static getUsername(): string | null {
    try {
      return localStorage.getItem(USERNAME_STORAGE_KEY);
    } catch (error) {
      console.error('读取用户名失败:', error);
      return null;
    }
  }

  /**
   * 清除用户名
   */
  static clearUsername(): void {
    try {
      localStorage.removeItem(USERNAME_STORAGE_KEY);
    } catch (error) {
      console.error('清除用户名失败:', error);
    }
  }

  /**
   * 清除所有认证数据
   */
  static clearAll(): void {
    this.clearToken();
    this.clearUsername();
  }

  /**
   * 检查是否存在有效的 Token
   */
  static hasToken(): boolean {
    return this.getToken() !== null && this.getToken()!.length > 0;
  }
}

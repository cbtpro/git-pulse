/**
 * GitPulse 核心库导出
 * 
 * 这个模块导出所有核心库功能，包括：
 * - GitHub API 客户端和工厂
 * - 认证 Token 管理器
 * - GitHub API 类型定义
 */

// API 层导出
export * from './services/api/index';
export * from './services/api/interfaces/GitHubApiClient';
export * from './services/api/implementations/DirectGitHubApi';
export * from './services/api/implementations/BackendProxyApi';

// 认证层导出
export * from './services/auth/TokenManager';

// 类型导出
export * from './types/github';

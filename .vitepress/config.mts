import { defineConfig } from 'vitepress'
import { withMermaid } from "vitepress-plugin-mermaid";

// https://vitepress.dev/reference/site-config
export default withMermaid({
  title: 'RFC',
  description: 'RFC规范，旨在建立角色卡跨平台 API 标准',
  base: '/',  // 如果你的仓库名不是用户名.github.io，则需要设置为 '/仓库名/'
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    outline: {
      level: [2, 3],
      label: '页面导航',
    },
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭',
                },
              },
            },
          },
        },
      },
    },
    nav: [
      { text: '首页', link: '/' },
      { text: '规范', link: '/CHARACTER_API_RFC' },
      { text: '实现指南', link: '/landing/' },
      { text: '外部资源', link: '/resource/TAVERNHELPER' },
      { text: '公告', link: '/RFC_ANNOUNCEMENT' },
    ],

    sidebar: {
      '/': [
        {
          text: '概览',
          items: [
            { text: 'Why RFC', link: '/介绍' },
            { text: 'RFC 总览', link: '/CHARACTER_API_RFC' },
            { text: '实现指南', link: '/landing/' },
            { text: '公告', link: '/RFC_ANNOUNCEMENT' },
          ],
        },
        {
          text: '🔗 外部资源',
          items: [{ text: '酒馆助手 API', link: '/resource/TAVERNHELPER' }],
        },
      ],
      '/landing/': [
        {
          text: '📚 实现指南',
          items: [{ text: '总览', link: '/landing/' }],
        },
        {
          text: '🚀 Generation - 生成模块',
          collapsed: true,
          items: [
            { text: '介绍', link: '/landing/generation/' },
            { text: '应用（Application）', link: '/landing/generation/application' },
            { text: '平台（Platform）', link: '/landing/generation/platform' },
            { text: '适配器（Adapter）', link: '/landing/generation/adapter' },
            { text: '包装器（Wrapper）', link: '/landing/generation/wrapper' },
            { text: '高级应用', link: '/landing/generation/advanced-application' },
          ],
        },
        {
          text: '🔧 Variable - 变量模块',
          collapsed: true,
          items: [
            { text: '介绍', link: '/landing/variable/' },
            { text: '应用（Application）', link: '/landing/variable/application' },
            { text: '平台（Platform）', link: '/landing/variable/platform' },
            { text: '适配器（Adapter）', link: '/landing/variable/adapter' },
            { text: '包装器（Wrapper）', link: '/landing/variable/wrapper' },
            { text: '高级应用', link: '/landing/variable/advanced-application' },
          ],
        },
        {
          text: '🤖 LLM Variable - LLM变量模块',
          collapsed: true,
          items: [
            { text: '介绍', link: '/landing/llm-variable/' },
            { text: '应用（Application）', link: '/landing/llm-variable/application' },
            { text: '平台（Platform）', link: '/landing/llm-variable/platform' },
            { text: '适配器（Adapter）', link: '/landing/llm-variable/adapter' },
            { text: '包装器（Wrapper）', link: '/landing/llm-variable/wrapper' },
            { text: '高级应用', link: '/landing/llm-variable/advanced-application' },
          ],
        },
        {
          text: '🔔 Event - 事件模块',
          collapsed: true,
          items: [
            { text: '介绍', link: '/landing/event/' },
            { text: '应用（Application）', link: '/landing/event/application' },
            { text: '平台（Platform）', link: '/landing/event/platform' },
            { text: '适配器（Adapter）', link: '/landing/event/adapter' },
            { text: '包装器（Wrapper）', link: '/landing/event/wrapper' },
          ],
        },
        {
          text: '🔍 Regex - 正则系统模块',
          collapsed: true,
          items: [
            { text: '介绍', link: '/landing/regex/' },
            { text: '应用（Application）', link: '/landing/regex/application' },
            { text: '平台（Platform）', link: '/landing/regex/platform' },
            { text: '适配器（Adapter）', link: '/landing/regex/adapter' },
            { text: '包装器（Wrapper）', link: '/landing/regex/wrapper' },
            { text: '高级应用', link: '/landing/regex/advanced-application' },
          ],
        },
      ],
      '/landing/generation/': [
        {
          text: '🚀 Generation - 生成模块',
          items: [
            { text: '介绍', link: '/landing/generation/' },
            { text: '应用（Application）', link: '/landing/generation/application' },
            { text: '平台（Platform）', link: '/landing/generation/platform' },
            { text: '适配器（Adapter）', link: '/landing/generation/adapter' },
            { text: '包装器（Wrapper）', link: '/landing/generation/wrapper' },
            { text: '高级应用', link: '/landing/generation/advanced-application' },
          ],
        },
      ],
      '/landing/variable/': [
        {
          text: '🔧 Variable - 变量模块',
          items: [
            { text: '介绍', link: '/landing/variable/' },
            { text: '应用（Application）', link: '/landing/variable/application' },
            { text: '平台（Platform）', link: '/landing/variable/platform' },
            { text: '适配器（Adapter）', link: '/landing/variable/adapter' },
            { text: '包装器（Wrapper）', link: '/landing/variable/wrapper' },
            { text: '高级应用', link: '/landing/variable/advanced-application' },
          ],
        },
      ],
      '/landing/llm-variable/': [
        {
          text: '🤖 LLM Variable - LLM变量模块',
          items: [
            { text: '介绍', link: '/landing/llm-variable/' },
            { text: '应用（Application）', link: '/landing/llm-variable/application' },
            { text: '平台（Platform）', link: '/landing/llm-variable/platform' },
            { text: '适配器（Adapter）', link: '/landing/llm-variable/adapter' },
            { text: '包装器（Wrapper）', link: '/landing/llm-variable/wrapper' },
            { text: '高级应用', link: '/landing/llm-variable/advanced-application' },
          ],
        },
      ],
      '/landing/event/': [
        {
          text: '🔔 Event - 事件模块',
          items: [
            { text: '介绍', link: '/landing/event/' },
            { text: '应用（Application）', link: '/landing/event/application' },
            { text: '平台（Platform）', link: '/landing/event/platform' },
            { text: '适配器（Adapter）', link: '/landing/event/adapter' },
            { text: '包装器（Wrapper）', link: '/landing/event/wrapper' },
          ],
        },
      ],
      '/landing/regex/': [
        {
          text: '🔍 Regex - 正则系统模块',
          items: [
            { text: '介绍', link: '/landing/regex/' },
            { text: '应用（Application）', link: '/landing/regex/application' },
            { text: '平台（Platform）', link: '/landing/regex/platform' },
            { text: '适配器（Adapter）', link: '/landing/regex/adapter' },
            { text: '包装器（Wrapper）', link: '/landing/regex/wrapper' },
            { text: '高级应用', link: '/landing/regex/advanced-application' },
          ],
        },
      ],
      '/resource/': [
        {
          text: '🔗 外部资源',
          items: [{ text: '酒馆助手 API', link: '/resource/TAVERNHELPER' }],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/your-github-link' }],
  },
});

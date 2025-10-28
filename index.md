---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "CharacterAPI RFC"
  text: "角色卡跨平台 API 规范"
  tagline: 为 LLM 角色扮演平台间角色卡的互操作性与可移植性提供统一抽象层
  actions:
    - theme: brand
      text: Why RFC
      link: /介绍
    - theme: alt
      text: RFC 总览
      link: /CHARACTER_API_RFC

features:
  - title: 平台无关
    details: 保持最小、稳定的接口与语义，杜绝平台特定耦合，使用抽象接口。
  - title: 能力协商与降级
    details: 通过 capabilities 与特性检测声明支持能力，不支持时进行可预期降级。
  - title: 统一规范
    details: 包装层的事件、日志与状态行为纳入RFC约束，成为兼容性判断依据。
  - title: 📚 实现指南
    details: 提供详细的分层架构文档，从平台层到应用层的完整实现参考。
    link: /landing/
    linkText: 查看模块文档
---


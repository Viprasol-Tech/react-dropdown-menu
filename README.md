<p align="center">
  <img src="docs/assets/logo.png" width="120" alt="Viprasol Tech logo">
</p>

<h1 align="center">react-dropdown-menu</h1>

<p align="center">
  <strong>Accessible dropdown menu for React — keyboard navigation, focus management, ARIA.</strong><br>
  Arrow-key navigation, Escape to close, Enter to select — done right.
</p>

<p align="center">
  <em>Built and maintained by <a href="https://viprasol.com">Viprasol Tech</a> — Fintech Experts. Full-Stack Builders.</em>
</p>

<p align="center">
  <a href="https://github.com/Viprasol-Tech/react-dropdown-menu/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Viprasol-Tech/react-dropdown-menu/ci.yml?style=flat-square&logo=githubactions&logoColor=white&label=CI" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/Viprasol-Tech/react-dropdown-menu?style=flat-square&color=blue" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <a href="https://t.me/viprasol_help"><img src="https://img.shields.io/badge/Telegram-support-26A5E4?style=flat-square&logo=telegram&logoColor=white" alt="Telegram"></a>
</p>

---

## ✨ Features

- ♿ **Accessible** — proper ARIA roles, focus management, and keyboard support.
- ⌨️ **Keyboard nav** — ArrowUp/Down (with looping), Escape to close, Enter to select.
- 🧮 **Tested core** — pure `nextIndex()` navigation helper, fully unit-tested.
- 🔒 **Strictly typed** — TypeScript `strict`, ships `.d.ts`.

## 📦 Install

```bash
npm install react-dropdown-menu
```

## 🚀 Usage

```tsx
import { DropdownMenu, type DropdownItem } from "react-dropdown-menu";

const items: DropdownItem[] = [
  { id: "edit", label: "Edit" },
  { id: "dup", label: "Duplicate" },
  { id: "del", label: "Delete" },
];

export function Demo() {
  return (
    <DropdownMenu
      label="Actions"
      items={items}
      onSelect={(item) => console.log("selected", item.id)}
    />
  );
}
```

## 🤝 Contributing

PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md).

## Contact — Viprasol Tech Private Limited

- 🌐 Website: [viprasol.com](https://viprasol.com)
- ✉️ Email: [support@viprasol.com](mailto:support@viprasol.com)
- 💬 Telegram: [t.me/viprasol_help](https://t.me/viprasol_help) · 📱 WhatsApp: +91 96336 52112
- 🐙 GitHub: [@Viprasol-Tech](https://github.com/Viprasol-Tech) · 💼 [LinkedIn](https://www.linkedin.com/in/viprasol/) · 𝕏 [@viprasol](https://twitter.com/viprasol)

> *Viprasol Tech — fintech software, web & SaaS apps, algorithmic trading systems, and AI agents. Need a custom build? [Get in touch](mailto:support@viprasol.com).*

## License

[MIT](LICENSE) © 2025 Viprasol Tech Private Limited

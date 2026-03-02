<div align="center">
  <img src="src/assets/nfo/upfyn-logo.png" alt="Upfyn Code Logo" width="120" height="120">

  <h1>Upfyn Code</h1>

  <p><strong>A powerful GUI toolkit for AI-powered code agents</strong></p>
  <p><strong>Create custom agents, manage interactive Claude Code sessions, run secure background agents, and more.</strong></p>

  <p>
    <a href="https://github.com/AnitChaudhry/Upfyn-Code-App/releases"><img src="https://img.shields.io/github/v/release/AnitChaudhry/Upfyn-Code-App?style=for-the-badge&color=blue" alt="Release"></a>
    <a href="https://github.com/AnitChaudhry/Upfyn-Code-App/blob/main/LICENSE"><img src="https://img.shields.io/github/license/AnitChaudhry/Upfyn-Code-App?style=for-the-badge&color=green" alt="License"></a>
    <a href="https://github.com/AnitChaudhry/Upfyn-Code-App/issues"><img src="https://img.shields.io/github/issues/AnitChaudhry/Upfyn-Code-App?style=for-the-badge&color=orange" alt="Issues"></a>
    <a href="https://github.com/AnitChaudhry/Upfyn-Code-App/pulls"><img src="https://img.shields.io/github/issues-pr/AnitChaudhry/Upfyn-Code-App?style=for-the-badge&color=purple" alt="PRs"></a>
    <a href="https://github.com/AnitChaudhry/Upfyn-Code-App/stargazers"><img src="https://img.shields.io/github/stars/AnitChaudhry/Upfyn-Code-App?style=for-the-badge&color=yellow" alt="Stars"></a>
  </p>

  <p>
    <a href="#features">Features</a> &bull;
    <a href="#installation">Installation</a> &bull;
    <a href="#usage">Usage</a> &bull;
    <a href="#development">Development</a> &bull;
    <a href="#contributing">Contributing</a> &bull;
    <a href="https://github.com/AnitChaudhry/Upfyn-Code-App/discussions">Discussions</a>
  </p>
</div>

---

> [!NOTE]
> This project is not affiliated with, endorsed by, or sponsored by Anthropic. Claude is a trademark of Anthropic, PBC. This is an independent developer project using Claude.

## Overview

**Upfyn Code** is a powerful application that transforms how you interact with AI code agents. It provides a beautiful GUI for managing your Claude Code sessions, creating custom agents, tracking usage, and much more.

Think of Upfyn Code as your command center for AI-assisted development — bridging the gap between the command-line and a visual experience that makes development more intuitive and productive.

## Features

### Project and Session Management
- **Visual Project Browser**: Navigate through all your Claude Code projects in `~/.claude/projects/`
- **Session History**: View and resume past coding sessions with full context
- **Smart Search**: Find projects and sessions quickly with built-in search
- **Session Insights**: See first messages, timestamps, and session metadata at a glance

### CC Agents
- **Custom AI Agents**: Create specialized agents with custom system prompts and behaviors
- **Agent Library**: Build a collection of purpose-built agents for different tasks
- **Background Execution**: Run agents in separate processes for non-blocking operations
- **Execution History**: Track all agent runs with detailed logs and performance metrics

### Usage Analytics Dashboard
- **Cost Tracking**: Monitor your Claude API usage and costs in real-time
- **Token Analytics**: Detailed breakdown by model, project, and time period
- **Visual Charts**: Beautiful charts showing usage trends and patterns
- **Export Data**: Export usage data for accounting and analysis

### MCP Server Management
- **Server Registry**: Manage Model Context Protocol servers from a central UI
- **Easy Configuration**: Add servers via UI or import from existing configs
- **Connection Testing**: Verify server connectivity before use
- **Claude Desktop Import**: Import server configurations from Claude Desktop

### Timeline and Checkpoints
- **Session Versioning**: Create checkpoints at any point in your coding session
- **Visual Timeline**: Navigate through your session history with a branching timeline
- **Instant Restore**: Jump back to any checkpoint with one click
- **Fork Sessions**: Create new branches from existing checkpoints

### CLAUDE.md Management
- **Built-in Editor**: Edit CLAUDE.md files directly within the app
- **Live Preview**: See your markdown rendered in real-time
- **Project Scanner**: Find all CLAUDE.md files in your projects

### BYOK Chat
- **Bring Your Own Key**: Use your own API keys from 8+ providers
- **Multi-provider**: Anthropic, OpenAI, OpenRouter, Google, Groq, DeepSeek, Mistral, XAI
- **Streaming**: Real-time streaming chat responses

### Multi-language Support
- Built-in i18n with English, Japanese, Korean, and Chinese (Simplified)
- Easy to add more languages via the translation system

## Installation

### Prerequisites

- **Node.js** (18+ with npm) or **Bun**
- **Claude Code CLI**: Install from [Claude official site](https://claude.ai/code)

### Quick Start

```bash
git clone https://github.com/AnitChaudhry/Upfyn-Code-App.git
cd Upfyn-Code-App
npm install
npm run dev
```

The app will be available at `http://localhost:1420`

### Production Build

```bash
npm run build
npm run preview
```

## Usage

### Getting Started

1. **Launch Upfyn Code**: Start the dev server or open the built application
2. **Login**: Sign in with your cli.upfyn.com credentials
3. **Welcome Screen**: Choose between CC Agents or Projects

### Managing Projects

```
Projects -> Select Project -> View Sessions -> Resume or Start New
```

### Creating Agents

1. **Design Your Agent**: Set name, icon, and system prompt
2. **Configure Model**: Choose between available Claude models
3. **Set Permissions**: Configure file read/write and network access
4. **Execute Tasks**: Run your agent on any project

## Development

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS v4 + shadcn/ui + Radix UI |
| State | Zustand + React Context |
| Editor | CodeMirror 6 |
| Charts | Recharts |
| Markdown | react-markdown + MDX Editor |
| i18n | i18next |

### Project Structure

```
Upfyn-Code-App/
├── src/                   # React frontend
│   ├── components/        # UI components
│   ├── contexts/          # React contexts (auth, tabs, theme)
│   ├── hooks/             # Custom hooks
│   ├── lib/               # API client and utilities
│   ├── upfyn/             # Upfyn-specific components and contexts
│   ├── stores/            # Zustand stores
│   ├── services/          # Persistence services
│   └── assets/            # Static assets (fonts, images)
├── shared/                # Shared modules (models, integrations)
├── cc_agents/             # Pre-built agent definitions
└── .github/               # CI, templates, community files
```

### Development Commands

```bash
npm run dev       # Start dev server with hot reload
npm run build     # Production build
npm run preview   # Preview production build
npx tsc --noEmit  # Type check
```

## Contributing

We welcome contributions from developers around the world! Whether it is a bug fix, new feature, translation, or documentation improvement — every contribution matters.

**Quick links:**

- [Contributing Guide](CONTRIBUTING.md) — Full guide on how to contribute
- [Good First Issues](https://github.com/AnitChaudhry/Upfyn-Code-App/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) — Great starting points
- [Help Wanted](https://github.com/AnitChaudhry/Upfyn-Code-App/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) — Issues where we need community help
- [Discussions](https://github.com/AnitChaudhry/Upfyn-Code-App/discussions) — Ask questions and share ideas

### How to Contribute

```bash
# Fork -> Clone -> Branch -> Code -> PR
git clone https://github.com/YOUR_USERNAME/Upfyn-Code-App.git
cd Upfyn-Code-App
git checkout -b feature/your-feature-name
# ... make changes ...
git push origin feature/your-feature-name
# Open a PR on GitHub
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

## Community

| Resource | Link |
|----------|------|
| Bug Reports | [Open an issue](https://github.com/AnitChaudhry/Upfyn-Code-App/issues/new?template=bug_report.yml) |
| Feature Requests | [Request a feature](https://github.com/AnitChaudhry/Upfyn-Code-App/issues/new?template=feature_request.yml) |
| Discussions | [Join the conversation](https://github.com/AnitChaudhry/Upfyn-Code-App/discussions) |
| Security | [Security Policy](SECURITY.md) |
| Code of Conduct | [Community Standards](CODE_OF_CONDUCT.md) |
| Changelog | [Release History](CHANGELOG.md) |

## Security

Found a security vulnerability? Please report it responsibly — see our [Security Policy](SECURITY.md) for details. **Do not open a public issue for security vulnerabilities.**

## License

This project is licensed under the **GNU Affero General Public License v3.0** — see the [LICENSE](LICENSE) file for details.

## Author

**Anit Chaudhry** — Creator and Lead Developer

- GitHub: [@AnitChaudhry](https://github.com/AnitChaudhry)
- Website: [upfyn.com](https://upfyn.com)

## Acknowledgments

- [Claude](https://claude.ai) by Anthropic
- Built with [React](https://react.dev), [Vite](https://vitejs.dev), and [Tailwind CSS](https://tailwindcss.com)
- UI components from [shadcn/ui](https://ui.shadcn.com) and [Radix UI](https://www.radix-ui.com)

---

<div align="center">
  <p><strong>Made with care by <a href="https://upfyn.com">Upfyn</a></strong></p>
  <p><sub>If you find this project useful, please consider giving it a star!</sub></p>
</div>

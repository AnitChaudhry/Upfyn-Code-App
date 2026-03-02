<div align="center">
  <img src="src/assets/nfo/upfyn-logo.png" alt="Upfyn Code Logo" width="120" height="120">

  <h1>Upfyn Code</h1>

  <p>
    <strong>A powerful GUI toolkit for AI-powered code agents</strong>
  </p>
  <p>
    <strong>Create custom agents, manage interactive Claude Code sessions, run secure background agents, and more.</strong>
  </p>

  <p>
    <a href="#features"><img src="https://img.shields.io/badge/Features-✨-blue?style=for-the-badge" alt="Features"></a>
    <a href="#installation"><img src="https://img.shields.io/badge/Install-🚀-green?style=for-the-badge" alt="Installation"></a>
    <a href="#usage"><img src="https://img.shields.io/badge/Usage-📖-purple?style=for-the-badge" alt="Usage"></a>
    <a href="#development"><img src="https://img.shields.io/badge/Develop-🛠️-orange?style=for-the-badge" alt="Development"></a>
  </p>
</div>

> [!NOTE]
> This project is not affiliated with, endorsed by, or sponsored by Anthropic. Claude is a trademark of Anthropic, PBC. This is an independent developer project using Claude.

## Overview

**Upfyn Code** is a powerful application that transforms how you interact with AI code agents. It provides a beautiful GUI for managing your Claude Code sessions, creating custom agents, tracking usage, and much more.

Think of Upfyn Code as your command center for AI-assisted development — bridging the gap between the command-line and a visual experience that makes development more intuitive and productive.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Usage](#usage)
- [Installation](#installation)
- [Development](#development)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## Features

### Project & Session Management
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

### Timeline & Checkpoints
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

## Usage

### Getting Started

1. **Launch Upfyn Code**: Open the application after installation
2. **Login**: Sign in with your cli.upfyn.com credentials
3. **Welcome Screen**: Choose between CC Agents or Projects

### Managing Projects

```
Projects -> Select Project -> View Sessions -> Resume or Start New
```

### Creating Agents

```
CC Agents -> Create Agent -> Configure -> Execute
```

1. **Design Your Agent**: Set name, icon, and system prompt
2. **Configure Model**: Choose between available Claude models
3. **Set Permissions**: Configure file read/write and network access
4. **Execute Tasks**: Run your agent on any project

### Tracking Usage

```
Menu -> Usage Dashboard -> View Analytics
```

### Working with MCP Servers

```
Menu -> MCP Manager -> Add Server -> Configure
```

## Installation

### Prerequisites

- **Node.js** (18+ with npm) or **Bun**
- **Claude Code CLI**: Install from [Claude's official site](https://claude.ai/code)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/AnitChaudhry/Upfyn-Code-App.git
cd Upfyn-Code-App

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:1420`

### Production Build

```bash
npm run build
npm run preview
```

## Development

### Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 6
- **UI Framework**: Tailwind CSS v4 + shadcn/ui + Radix UI
- **State Management**: Zustand + React Context
- **Code Editor**: CodeMirror 6
- **Charts**: Recharts
- **Markdown**: react-markdown + MDX Editor
- **Internationalization**: i18next

### Project Structure

```
Upfyn-Code-App/
├── src/                   # React frontend
│   ├── components/        # UI components
│   ├── contexts/          # React contexts (auth, tabs, theme)
│   ├── hooks/             # Custom hooks
│   ├── lib/               # API client & utilities
│   ├── upfyn/             # Upfyn-specific components & contexts
│   ├── stores/            # Zustand stores
│   ├── services/          # Persistence services
│   └── assets/            # Static assets
├── shared/                # Shared modules (models, integrations)
└── cc_agents/             # Pre-built agent definitions
```

### Development Commands

```bash
# Start development server with hot reload
npm run dev

# Type checking
npm run check

# Production build
npm run build
```

## Security

Upfyn Code prioritizes your privacy and security:

1. **Process Isolation**: Agents run in separate processes
2. **Permission Control**: Configure file and network access per agent
3. **Auth Gate**: Login required before app usage
4. **JWT Auth**: Secure token-based authentication

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Areas for Contribution

- Bug fixes and improvements
- New features and enhancements
- Documentation improvements
- UI/UX enhancements
- Test coverage

## License

This project is licensed under the AGPL License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Claude](https://claude.ai) by Anthropic
- Built with React, Vite, and Tailwind CSS

---

<div align="center">
  <p>
    <strong>Made with care by <a href="https://upfyn.com">Upfyn</a></strong>
  </p>
</div>

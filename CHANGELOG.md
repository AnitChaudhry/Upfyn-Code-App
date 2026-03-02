# Changelog

All notable changes to Upfyn Code will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-02

### Added

#### Project & Session Management
- Visual project browser for `~/.claude/projects/`
- Session history with full context viewing and resuming
- Smart search across projects and sessions
- Session insights with first messages, timestamps, and metadata

#### CC Agents
- Custom AI agent creation with configurable system prompts
- Agent library for building purpose-built agent collections
- Background agent execution in separate processes
- Execution history with detailed logs and performance metrics

#### Usage Analytics Dashboard
- Real-time Claude API usage and cost tracking
- Token analytics with breakdowns by model, project, and time period
- Visual charts for usage trends
- Data export for accounting and analysis

#### MCP Server Management
- Central UI for managing Model Context Protocol servers
- Add servers via UI or import from existing configurations
- Connection testing and verification
- Claude Desktop configuration import

#### BYOK Chat
- Multi-provider support: Anthropic, OpenAI, OpenRouter, Google, Groq, DeepSeek, Mistral, XAI
- Real-time streaming chat responses
- Bring-your-own-key architecture

#### Timeline & Checkpoints
- Session versioning with checkpoint creation
- Visual branching timeline navigator
- One-click checkpoint restore
- Session forking from existing checkpoints

#### CLAUDE.md Management
- Built-in CLAUDE.md file editor
- Live markdown preview
- Project-wide CLAUDE.md file scanner

#### Multi-language Support
- English, Japanese, Korean, and Chinese (Simplified) translations
- i18next-based internationalization framework

#### Developer Experience
- React 18 + TypeScript + Vite 6 frontend
- Tailwind CSS v4 + shadcn/ui component library
- CodeMirror 6 code editor integration
- Zustand state management
- Comprehensive PR and issue templates
- CI pipeline with type checking and build verification

[1.0.0]: https://github.com/AnitChaudhry/Upfyn-Code-App/releases/tag/v1.0.0

# AutoPrivacy CLI

[![Book Live Demo](https://img.shields.io/badge/Book%20Live%20Demo-%F0%9F%9A%80-indigo)](https://autoprivacy.dev/demo)

> **Automated GDPR compliance for SaaS companies** - Generate professional DSAR evidence packs in minutes, not hours.

[![npm version](https://badge.fury.io/js/autopv-cli.svg)](https://www.npmjs.com/package/autopv-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI/CD](https://github.com/teamautoprivacy/autopv-cli/workflows/Release%20Pipeline/badge.svg)](https://github.com/teamautoprivacy/autopv-cli/actions)

## 🚀 Quick Start

```bash
# Install globally via npm
npm install -g autopv-cli

# Configure API keys (interactive setup)
autopv login

# Generate DSAR evidence pack
autopv generate -e user@company.com -g github-org
```

**Result:** Professional PDF evidence pack + CSV mapping + encrypted archive ready for delivery to data subjects.

## 📦 Installation Options

### Option 1: npm (Recommended)
```bash
npm install -g autopv-cli@latest
```

### Option 2: Single-file binaries
```bash
# macOS
curl -L https://github.com/teamautoprivacy/autopv-cli/releases/latest/download/autopv-macos -o autopv
chmod +x autopv

# Linux
curl -L https://github.com/teamautoprivacy/autopv-cli/releases/latest/download/autopv-linux -o autopv
chmod +x autopv

# Windows
curl -L https://github.com/teamautoprivacy/autopv-cli/releases/latest/download/autopv-win.exe -o autopv.exe
```

### Option 3: Homebrew (Coming Soon)
```bash
brew install autopv
```

## 🔐 Configuration

AutoPrivacy CLI supports two configuration methods:

### Interactive Setup (Recommended)
```bash
autopv login
```
This creates an encrypted `~/.autopv/config.json` with your API keys.

### Environment Variables
```bash
export GITHUB_TOKEN="ghp_your_token_here"
export OPENAI_API_KEY="sk-your_openai_key"
export STRIPE_SECRET_KEY="sk_your_stripe_key"  # optional
export ARCHIVE_PW="secure_password_123"
```

## 🎯 Usage Examples

### Basic DSAR Generation
```bash
autopv generate -e john.doe@company.com -g my-github-org
```

### Check Configuration
```bash
autopv login --show
```

### Reset All Secrets
```bash
autopv login --reset
```

### Help & Documentation
```bash
autopv --help
autopv generate --help
autopv login --help
```

## 📋 What Gets Generated

AutoPrivacy CLI creates a complete DSAR evidence package:

### 1. Professional PDF Evidence Pack
- **Cover Page**: Company branding, data subject info, export metadata
- **Executive Summary**: Data overview, processing activities, retention periods
- **Data Inventory**: Structured breakdown by data source (GitHub, Stripe, etc.)
- **PII Scrubbing Report**: Security measures and data sanitization statistics
- **GDPR Compliance Analysis**: Article mappings with AI-powered reasoning
- **Appendices**: Technical details, data lineage, processing purposes

### 2. CSV Mapping File
- Flattened data structure for technical analysis
- GDPR article classifications for each field
- Data sensitivity levels and processing lawful bases
- Cross-references to evidence pack sections

### 3. Encrypted Archive
- Password-protected ZIP containing all evidence files
- Integrity verification and compression statistics
- Secure delivery format for data subjects

## 🔧 Supported Data Sources

| Provider | Data Exported | API Requirements |
|----------|---------------|------------------|
| **GitHub** | User events, org audit logs | Personal Access Token (repo:read, admin:org) |
| **Stripe** | Customer data, charges, payment methods | Secret Key (optional) |
| **OpenAI** | GDPR classification via GPT-4o | API Key for intelligent analysis |

### Coming Soon
- Google Workspace (Gmail, Drive, Calendar)
- HubSpot (Contacts, Deals, Communications)
- PostgreSQL (Read-only queries)
- Zendesk (Tickets, User data, Communications)

## 🛡️ Security & Privacy

- **PII Protection**: Automatic redaction before AI processing
- **Encrypted Storage**: All secrets encrypted at rest (AES-256-CBC)
- **Secure Delivery**: Password-protected archives
- **Data Minimization**: Automatic cleanup of old files (>24h)
- **No Data Retention**: CLI processes data locally, nothing stored remotely

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Data Sources  │    │  AutoPrivacy CLI │    │   Deliverables  │
│                 │    │                  │    │                 │
│ • GitHub API    │───▶│ 1. Data Export   │───▶│ • evidence.pdf  │
│ • Stripe API    │    │ 2. PII Scrubbing │    │ • mapping.csv   │
│ • Future APIs   │    │ 3. GDPR Analysis │    │ • encrypted.zip │
│                 │    │ 4. Pack Builder  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Pipeline Steps
1. **Data Export**: Fetch user data from configured providers
2. **Pipeline Wiring**: Merge data into unified JSON structure  
3. **PII Scrubbing**: Sanitize sensitive information for AI processing
4. **GDPR Classification**: Map data fields to GDPR articles using GPT-4o
5. **Evidence Pack Builder**: Generate professional PDF and CSV files
6. **Encrypted Archive**: Create password-protected delivery package
7. **Cleanup**: Remove temporary files and maintain system hygiene

## 🚦 Requirements

- **Node.js**: 20+ (for npm installation)
- **Memory**: <300MB RAM (optimized for large datasets)
- **Storage**: Minimal (automatic cleanup after 24h)
- **Network**: HTTPS access to provider APIs

## 🔍 Troubleshooting

### Common Issues

**"GitHub token not found"**
```bash
autopv login  # Configure interactively
# OR
export GITHUB_TOKEN="ghp_your_token_here"
```

**"Command not found: autopv"**
```bash
# If installed via npm
npm install -g autopv-cli
# If using binary, ensure it's in PATH or use ./autopv
```

**"Archive creation failed"**
```bash
autopv login  # Set archive password
# OR
export ARCHIVE_PW="your_secure_password"
```

### Debug Mode
```bash
DEBUG=autopv:* autopv generate -e user@company.com -g org
```

## 📊 Performance

- **Small org** (<100 events): ~30 seconds
- **Medium org** (1K events): ~2 minutes  
- **Large org** (10K+ events): ~5 minutes
- **Memory usage**: <300MB peak RAM
- **Output size**: 2-50MB depending on data volume

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/teamautoprivacy/autopv-cli.git
cd autopv-cli
pnpm install
pnpm run dev
```

### Running Tests
```bash
pnpm test          # Watch mode
pnpm test:run      # Single run
pnpm test:coverage # With coverage
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.autoprivacy.com](https://docs.autoprivacy.com)
- **Issues**: [GitHub Issues](https://github.com/teamautoprivacy/autopv-cli/issues)
- **Discussions**: [GitHub Discussions](https://github.com/teamautoprivacy/autopv-cli/discussions)
- **Email**: support@autoprivacy.com

## 🗺️ Roadmap

### v0.3.0 - Performance & Scale
- [ ] Stream processing for large datasets
- [ ] Parallel provider data fetching
- [ ] Memory optimization (<300MB guarantee)

### v0.4.0 - Extended Connectors  
- [ ] Google Workspace integration
- [ ] HubSpot CRM connector
- [ ] PostgreSQL read-only queries
- [ ] Zendesk support portal

### v0.5.0 - Enterprise Features
- [ ] Multi-tenant support
- [ ] Custom branding options
- [ ] Audit trail exports
- [ ] SOC 2 compliance

---

**Made with ❤️ by the AutoPrivacy team**

*Automating GDPR compliance so you can focus on building great products.*

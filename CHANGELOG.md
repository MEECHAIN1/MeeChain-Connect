# Changelog

All notable changes to MeeChain project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- ✅ **Complete JSDoc Documentation** - 100% coverage for all endpoints and functions
  - 18 API endpoints in `server.js` with full JSDoc comments
  - 40+ functions in `src/js/app.js` with Thai descriptions
  - 5 functions in `src/js/price-widget.js` documented
  - Auto-generated HTML documentation using JSDoc + Docdash template
  - Added `npm run docs` and `npm run docs:watch` scripts
  - Created comprehensive documentation guide in `docs/README.md`
  - JSDoc configuration file (`jsdoc.json`) for easy customization
- ✅ **Production Deployment Files** - Ready for meebot.io deployment
  - Automated deployment script (`scripts/deploy.sh`)
  - Quick update script (`scripts/quick-deploy.sh`)
  - Nginx configuration with SSL (`nginx/meebot.io.conf`)
  - PM2 ecosystem configuration (`ecosystem.config.js`)
  - Production environment template (`.env.production`)
  - 5 comprehensive deployment guides:
    - `DEPLOYMENT_MEEBOT_IO.md` - Main deployment guide
    - `DEPLOY_STEP_BY_STEP.md` - Detailed step-by-step
    - `DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist
    - `QUICK_DEPLOY_GUIDE.md` - 5-minute quick guide
    - `DEPLOYMENT_SUMMARY.md` - Overview and status
    - `READY_TO_DEPLOY.md` - Getting started guide
- ✅ **Post-Deployment QA** - Complete testing and monitoring
  - `POST_DEPLOYMENT_QA.md` - Comprehensive QA checklist
  - `scripts/test-production.sh` - Automated testing script
  - `PRODUCTION_QUICK_REFERENCE.md` - Quick reference card
  - Tests for: Infrastructure, API endpoints, Security, Performance, Documentation
- Complete QA checklist for contributors
- Automated infrastructure startup scripts
- RPC endpoint testing suite
- Comprehensive documentation (API, MetaMask setup, Contributing guide)
- Quick start guide for new developers

### Changed
- Updated RPC URL to use HTTPS (SSL-secured via Nginx)
- Changed from `http://rpc.meechain.run.place` to `https://rpc.meechain.run.place:5005`
- Updated all documentation to reflect new RPC endpoint
- Improved error handling in Web3 connection

### Fixed
- RPC connection issues with plain HTTP to HTTPS port
- Chain ID verification (13390 = 0x344e)
- SSL certificate handling with `--insecure` flag for testing

---

## [1.0.0] - 2024-03-05

### Added
- Initial release of MeeChain Dashboard
- MeeBot AI Assistant with Thai language support
- Web3 integration with MetaMask
- NFT Marketplace (mint, buy, sell)
- Staking & Mining features (3 pools)
- Wallet Management (send, receive, swap)
- Block Explorer
- Smart Contract integration (Token, NFT, Staking)
- OpenAI GPT-5-mini integration
- Server-Sent Events (SSE) for streaming chat
- Environment configuration with .env
- CORS support for cross-origin requests

### Smart Contracts
- MEE Token (MCT) - ERC20
- MeeBot NFT - ERC721
- Staking Contract

### Infrastructure
- Express.js server
- Hardhat development environment
- Nginx SSL proxy
- Local Ethereum node support

### Documentation
- README.md with project overview
- .env.example for environment setup
- Basic project structure documentation

---

## [0.1.0] - 2024-02-01

### Added
- Project initialization
- Basic HTML/CSS/JS structure
- Dashboard layout
- Navigation system

---

## Release Notes

### Version 1.0.0 Highlights

🎉 **First stable release of MeeChain Dashboard!**

This release includes:
- Full-featured Web3 dashboard
- AI-powered assistant (MeeBot)
- Complete NFT marketplace
- Staking and mining capabilities
- Wallet management
- Block explorer

### Breaking Changes

None (initial release)

### Migration Guide

For users upgrading from pre-release versions:

1. Update RPC URL in MetaMask:
   - Old: `http://rpc.meechain.run.place`
   - New: `https://rpc.meechain.run.place:5005`

2. Update environment variables:
   ```bash
   cp .env.example .env
   # Add your OPENAI_API_KEY
   ```

3. Restart infrastructure:
   ```bash
   ./scripts/stop.sh
   ./scripts/start.sh
   ```

### Known Issues

- [ ] SSL certificate is self-signed (use `--insecure` for testing)
- [ ] Block explorer pagination not implemented
- [ ] NFT metadata caching not optimized
- [ ] Mobile responsive design needs improvement

### Upcoming Features

See [README.md](./README.md) for full roadmap.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

---

## Support

- Discord: <https://discord.gg/meechain>
- GitHub Issues: <https://github.com/MEECHAIN1/MeeChain-Connect/issues>
- Email: support@meechain.run.place

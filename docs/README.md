# 📚 MeeChain Documentation

Welcome to MeeChain documentation! This directory contains all technical documentation for the MeeChain platform.

---

## 📁 Directory Structure

```
docs/
├── README.md                 # This file
├── API.md                    # API endpoints documentation
├── ARCHITECTURE.md           # System architecture overview
├── DEPLOYMENT.md             # Deployment guide
├── METAMASK_SETUP.md         # MetaMask setup instructions
└── jsdoc/                    # Auto-generated JSDoc documentation
    ├── index.html            # JSDoc homepage
    ├── global.html           # Global functions
    ├── server.js.html        # Backend API docs
    └── src_js_app.js.html    # Frontend functions docs
```

---

## 🚀 Quick Links

### For Developers
- **[JSDoc Documentation](jsdoc/index.html)** - Complete API and function reference (auto-generated)
- **[API Documentation](API.md)** - REST API endpoints and usage
- **[Architecture](ARCHITECTURE.md)** - System design and components

### For Deployment
- **[Deployment Guide](DEPLOYMENT.md)** - How to deploy MeeChain
- **[MetaMask Setup](METAMASK_SETUP.md)** - Configure MetaMask for MeeChain

---

## 📖 JSDoc Documentation

### Generate Documentation

```bash
# Generate JSDoc documentation
npm run docs

# Watch mode (auto-regenerate on file changes)
npm run docs:watch
```

### View Documentation

After generating, open `docs/jsdoc/index.html` in your browser:

```bash
# Windows
start docs/jsdoc/index.html

# macOS
open docs/jsdoc/index.html

# Linux
xdg-open docs/jsdoc/index.html
```

### What's Included

The JSDoc documentation includes:

#### Backend (`server.js`)
- ✅ 18 API endpoints with full descriptions
- ✅ Request/response formats
- ✅ Parameter types and validation
- ✅ Helper functions

#### Frontend (`src/js/app.js`)
- ✅ 40+ functions with descriptions
- ✅ Parameter types and return values
- ✅ Usage examples
- ✅ Component initialization

---

## 📊 Documentation Coverage

| File | Items | JSDoc Coverage |
|------|-------|----------------|
| `server.js` | 18 endpoints + 1 helper | ✅ 100% |
| `src/js/app.js` | 40+ functions | ✅ 100% |
| `src/js/price-widget.js` | 5 functions | ✅ 100% |
| **Total** | **64+ items** | **✅ 100%** |

---

## 🔧 Configuration

JSDoc configuration is in `jsdoc.json`:

```json
{
  "source": {
    "include": ["server.js", "src/js"],
    "includePattern": ".+\\.js(doc|x)?$"
  },
  "opts": {
    "destination": "./docs/jsdoc",
    "recurse": true,
    "template": "node_modules/docdash"
  }
}
```

---

## 📝 Writing JSDoc

### API Endpoint Example

```javascript
/**
 * @route GET /api/health
 * @description Health check endpoint สำหรับตรวจสอบสถานะ MeeChain application
 * @returns {Object} JSON object ที่มี status, model, bot, web3, chainId
 */
app.get('/api/health', (req, res) => {
  // ...
});
```

### Function Example

```javascript
/**
 * แสดง Toast notification บนหน้าจอชั่วคราว
 * 
 * @param {string} message - ข้อความที่ต้องการแสดง
 * @param {'info'|'success'|'error'|'warning'} [type='info'] - ประเภทของ toast
 * @returns {void}
 */
function showToast(message, type = 'info') {
  // ...
}
```

### Async Function Example

```javascript
/**
 * ดึงข้อมูลสถานะเครือข่าย Web3
 * 
 * @async
 * @returns {Promise<void>}
 */
async function checkWeb3Status() {
  // ...
}
```

---

## 🎯 Best Practices

1. **Always document public APIs** - Every endpoint and exported function should have JSDoc
2. **Use Thai for descriptions** - Makes it easier for Thai developers
3. **Include parameter types** - Use `@param {type} name - description`
4. **Document return values** - Use `@returns {type} description`
5. **Add examples when helpful** - Use `@example` tag for complex functions
6. **Keep it up to date** - Update JSDoc when changing function signatures

---

## 🔄 CI/CD Integration

To auto-generate docs on every commit:

### GitHub Actions

```yaml
name: Generate Docs
on: [push]
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run docs
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/jsdoc
```

---

## 📞 Support

For questions or issues with documentation:

1. Check the [JSDoc documentation](jsdoc/index.html) first
2. Review the [API documentation](API.md)
3. Open an issue on GitHub
4. Contact the development team

---

**Last Updated:** March 6, 2026  
**JSDoc Version:** 4.0.5  
**Template:** Docdash 2.0.2

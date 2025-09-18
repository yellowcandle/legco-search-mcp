# LegCo Search MCP Server - Suggested Commands

## Development Commands

### Core Development
```bash
# Start development server (local testing)
npm run dev
# Alternative using wrangler directly
wrangler dev

# Deploy to staging environment
npm run deploy:staging

# Deploy to production environment  
npm run deploy:production

# View live logs from deployed worker
npm run tail

# Alternative tail command with wrangler
wrangler tail
```

### Testing & Validation
```bash
# Run unit tests with vitest
npx vitest

# Run all tests in specific directory
npx vitest tests/unit/

# Test health endpoint locally
curl http://localhost:8787/health

# Test MCP initialization locally
curl -X POST http://localhost:8787/sse \
  -H "Content-Type: application/json" \
  -d '{"method": "initialize", "params": {"protocolVersion": "2025-06-18", "capabilities": {}}, "id": 1}'

# Test production health endpoint
curl https://legco-search-mcp.herballemon.workers.dev/health

# Test production MCP tools
curl -X POST https://legco-search-mcp.herballemon.workers.dev/mcp-http \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list", "id": 1}'
```

### Build & Configuration
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Check wrangler configuration
wrangler dev --dry-run

# View wrangler version
wrangler --version

# Login to Cloudflare (if needed)
wrangler login
```

### Debugging & Monitoring
```bash
# Real-time log streaming
wrangler tail --format=pretty

# View deployment details
wrangler deployments list

# Check environment variables
wrangler secret list

# View worker analytics
wrangler pages deployment list
```

## Git Commands (macOS)
```bash
# Standard git operations
git status
git add .
git commit -m "commit message"
git push origin main

# Branch management
git checkout -b feature-branch
git merge feature-branch
git branch -d feature-branch

# View recent commits
git log --oneline -10
```

## macOS System Commands
```bash
# File operations
ls -la                    # List files with details
find . -name "*.ts"       # Find TypeScript files
grep -r "search term" .   # Search in files
cat file.txt             # View file contents
tail -f logfile.log      # Follow log file

# Process management
ps aux | grep node       # Find Node processes
kill -9 <pid>           # Kill process by ID
lsof -i :8787           # Check what's using port 8787

# Network testing
curl -I <url>           # Check HTTP headers
ping hostname           # Test connectivity
netstat -an | grep 8787 # Check port status
```

## Package Management
```bash
# NPM operations
npm install              # Install dependencies
npm update              # Update packages
npm audit               # Check for vulnerabilities
npm audit fix           # Fix vulnerabilities

# View installed packages
npm list --depth=0      # Top-level packages
npm outdated            # Check for updates

# Clean operations
npm cache clean --force # Clear npm cache
rm -rf node_modules     # Remove node_modules
npm install             # Reinstall fresh
```

## Utility Commands
```bash
# View file sizes
du -sh *                # Size of each item in current directory
df -h                   # Disk space usage

# Find and count
find . -name "*.ts" | wc -l    # Count TypeScript files
grep -r "TODO" . | wc -l       # Count TODO comments

# Text processing
sed 's/old/new/g' file.txt     # Replace text in file
sort file.txt | uniq           # Sort and remove duplicates
head -20 file.txt              # First 20 lines
tail -20 file.txt              # Last 20 lines
```

## Performance Testing
```bash
# Load testing with curl
for i in {1..10}; do curl -w "%{time_total}\n" -o /dev/null -s https://legco-search-mcp.herballemon.workers.dev/health; done

# Concurrent requests testing
ab -n 100 -c 10 https://legco-search-mcp.herballemon.workers.dev/health

# Network timing
curl -w "@curl-format.txt" -o /dev/null -s https://legco-search-mcp.herballemon.workers.dev/health
```

## Development Workflow Commands
```bash
# Complete development cycle
git checkout -b feature-branch    # Create feature branch
npm run dev                       # Start development
# ... make changes ...
npx tsc --noEmit                 # Check TypeScript
curl http://localhost:8787/health # Test locally
npm run deploy:staging           # Deploy to staging
# ... test staging ...
npm run deploy:production        # Deploy to production
git add . && git commit -m "..." # Commit changes
git push origin feature-branch   # Push to remote
```

## Emergency Commands
```bash
# Quick rollback (if needed)
wrangler rollback

# Check worker status
curl -I https://legco-search-mcp.herballemon.workers.dev/health

# View recent deployments
wrangler deployments list

# Emergency log check
wrangler tail --format=json | grep ERROR
```
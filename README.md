# WhatsApp Backend

A modern NestJS-based backend application for WhatsApp-related services, built with TypeScript and Fastify.

## Architecture

This project follows a modular, enterprise-ready architecture with:

### 🏗️ Core Structure
- **Framework**: NestJS with TypeScript
- **HTTP Server**: Fastify for high performance
- **Package Manager**: pnpm
- **Code Quality**: ESLint + Prettier with strict rules

### 📁 Directory Structure
```
src/
├── infra/           # Infrastructure layer (main.ts, app.module.ts)
├── modules/         # Feature modules (health, etc.)
├── shared/          # Shared utilities and configurations
│   ├── config/      # Application configuration
│   ├── constants/   # Application constants
│   ├── dto/         # Data Transfer Objects
│   ├── exceptions/  # Exception filters
│   └── interfaces/  # Shared interfaces
└── test/            # E2E tests
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 24.*
- pnpm package manager

### Installation
```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
```

### Development Commands
```bash
# Start development server with hot reload
pnpm run start:dev

# Build for production
pnpm run build

# Start production server
pnpm run start:prod

# Code quality
pnpm run lint          # Lint and auto-fix
pnpm run format        # Format code with Prettier

# Testing
pnpm run test          # Unit tests
pnpm run test:watch    # Watch mode
pnpm run test:e2e      # End-to-end tests
pnpm run test:cov      # Coverage report
```

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

### Code Quality
- **ESLint**: Strict TypeScript rules with comprehensive plugins
- **Prettier**: Consistent code formatting
- **Husky**: Git hooks for quality gates
- **Commitlint**: Conventional commit messages

## 🏥 Health Checks

The application includes built-in health checks available at:
- `GET /health` - Basic health status

## 🔒 Type Safety

This project enforces strict TypeScript configuration:
- Strict null checks
- No implicit any
- Strict bind/call/apply
- No fallthrough cases

## 📦 Dependencies

### Core
- **@nestjs/core**: NestJS framework
- **@nestjs/platform-fastify**: Fastify integration
- **@nestjs/config**: Configuration management
- **class-validator**: Input validation
- **class-transformer**: Object transformation

### Development
- **TypeScript**: Type-safe JavaScript
- **ESLint**: Code linting with strict rules
- **Prettier**: Code formatting
- **Vitest**: Fast unit testing
- **Husky**: Git hooks

## 🤝 Contributing

1. Follow the conventional commit format
2. Run `pnpm run lint` before committing
3. Ensure all tests pass with `pnpm run test`
4. Maintain code coverage standards

## 📄 License

UNLICENSED - Private project
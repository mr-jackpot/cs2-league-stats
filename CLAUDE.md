# CS2 League Stats API - Development Guide

## Project Overview
A TypeScript Node.js API built with Koa for tracking and serving Counter-Strike 2 league statistics.

## Tech Stack
- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Koa
- **Package Manager**: npm

## Commands
```bash
npm install          # Install dependencies
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm start            # Run production build
npm test             # Run tests
npm run lint         # Run ESLint
npm run lint:fix     # Fix auto-fixable lint issues
```

## Project Structure
```
src/
├── index.ts         # Application entry point
├── routes/          # Route definitions
├── controllers/     # Request handlers
├── services/        # Business logic
├── models/          # Data models/types
├── middleware/      # Koa middleware
└── utils/           # Helper functions
```

## Code Conventions
- Use `async/await` over raw promises
- Prefer named exports over default exports
- Use TypeScript strict mode
- Keep controllers thin - business logic goes in services
- Use descriptive variable names (no abbreviations except common ones like `ctx`, `req`, `res`)

## API Design
- RESTful endpoints
- JSON request/response bodies
- Use appropriate HTTP status codes
- Validate request input at the controller level

## Error Handling
- Throw typed errors from services
- Catch and format errors in middleware
- Never expose internal error details in production responses

## Environment Variables
- Copy `.env.example` to `.env` for local development
- Never commit `.env` files

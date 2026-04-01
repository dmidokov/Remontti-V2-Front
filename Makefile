.PHONY: help install dev build preview type-check clean api-docs api-validate swagger

## Help
help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

## Install
install: ## Install npm dependencies
	npm install

## Development
dev: ## Start development server
	npm run dev

## Build
build: ## Build for production (includes type check)
	npm run build

## Preview
preview: ## Preview production build
	npm run preview

## Type Check
type-check: ## Run TypeScript type check
	npm run type-check

## API Documentation
api-docs: ## Serve API documentation (Swagger UI)
	@echo "Opening API docs at http://localhost:8080"
	npx http-server ./docs -p 8080 -c-1

## Swagger
swagger: ## Open Swagger UI in browser
	@echo "Opening Swagger UI at http://localhost:5173/api-docs.html"
	open http://localhost:5173/api-docs.html

## API Validate
api-validate: ## Validate OpenAPI schema
	npx @redocly/cli lint docs/openapi.yaml

## Clean
clean: ## Remove node_modules and dist directories
	rm -rf node_modules dist

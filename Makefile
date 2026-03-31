.PHONY: help install dev build preview clean

## Help
help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

## Install
install: ## Install npm dependencies
	npm install

## Development
dev: ## Start development server
	npm run dev

## Build
build: ## Build for production
	npm run build

## Preview
preview: ## Preview production build
	npm run preview

## Clean
clean: ## Remove node_modules and dist directories
	rm -rf node_modules dist

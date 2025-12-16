---
slug: shopify_ops
name: Shopify Operations
summary: AI-driven Shopify store configuration system for product management, theme
  setup, and store automation
description: Complete Shopify store management skill that automates product creation,
  theme configuration, and store setup using the Shopify Admin GraphQL API. Reduces
  store setup time from hours to minutes with programmatic control over products,
  themes, and settings.
version: 1.0.0
tags:
- shopify
- e-commerce
- product-management
- theme-configuration
- store-automation
- graphql
triggers:
- shopify
- store
- product
- e-commerce
- theme
- shop setup
- catalog
priority: default
author: FF-Terminal AI Agent
assets:
- scripts/shop_manager.py
- templates/.env.example
- templates/base_theme.json
recommended_tools:
- run_command
- read_file
- write_file
- edit_file
---

# Shopify Operations Skill

## Overview
This skill provides comprehensive Shopify store management capabilities through the Shopify Admin GraphQL API. It enables automated product creation, theme configuration, and store initialization.

## Core Capabilities

### 1. Product Management
- Create products with variants, pricing, and metadata
- Bulk product upload and catalog management
- Product image and media attachment
- Inventory and pricing management

### 2. Theme Configuration
- Apply JSON-based settings to active themes
- Configure colors, typography, and layout
- Update theme assets without manual Liquid editing
- Theme switching and customization

### 3. Store Operations
- Initialize store settings and policies
- Configure shipping zones and tax settings
- Set up navigation menus
- Manage store metadata and SEO

## Prerequisites

### Environment Setup
- Python 3.7+ with `requests` and `python-dotenv` packages
- Shopify Admin API access token (starts with `shpat_`)
- Store URL (format: `your-shop.myshopify.com`)

### Required Environment Variables
```bash
SHOPIFY_STORE_URL=your-shop.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_your_access_token_here
```

### Installation
```bash
pip install requests python-dotenv
```

## Usage Instructions

### Product Creation
```python
# Basic product creation
python3 scripts/shop_manager.py create_product \
  --title "Classic T-Shirt" \
  --price "29.99" \
  --vendor "MyBrand" \
  --tags "clothing,cotton" \
  --description "Comfortable 100% organic cotton t-shirt"
```

### Theme Configuration
```python
# Update theme settings
python3 scripts/shop_manager.py update_theme \
  --settings '{"colors": {"button": "#000000", "background": "#ffffff"}}'
```

### Store Information Update
```python
# Update shop settings
python3 scripts/shop_manager.py update_shop \
  --name "My Store" \
  --email "contact@mystore.com" \
  --currency "USD"
```

## Advanced Features

### Bulk Operations
For large-scale operations, use the bulk operations API:
- Product bulk creation (100+ products)
- Inventory updates
- Price adjustments

### Rate Limiting
The script includes intelligent retry logic:
- Automatic backoff on rate limits
- Exponential retry with jitter
- Request queuing for bulk operations

### Error Handling
- Comprehensive error reporting
- Transaction rollback support
- Validation before API calls

## Safety and Best Practices

### Live Store Warning
⚠️ **All operations affect the live store immediately**
- Always verify `SHOPIFY_STORE_URL` before execution
- Test in development stores first
- Use dry-run mode when available

### Data Protection
- Never commit API tokens to version control
- Use environment variables for sensitive data
- Implement proper access controls

### Backup Recommendations
- Export data before bulk operations
- Maintain theme backups
- Document all automated changes

## Progressive Disclosure

### For Basic Operations
Use the simple CLI commands for common tasks like product creation and theme updates.

### For Advanced Integration
Refer to the full Shopify Admin GraphQL API documentation for complex mutations and queries.

### Troubleshooting
- Check API token permissions
- Verify store URL format
- Monitor rate limit headers
- Review GraphQL error responses

## API Version Compatibility
- Current API version: 2024-10
- Backward compatibility maintained
- Regular version updates recommended

## Support and Documentation
- Shopify Admin API docs: https://shopify.dev/docs/api/admin-graphql
- GraphQL best practices: https://shopify.dev/docs/apps/build/graphql-optimization
- Rate limiting guide: https://shopify.dev/docs/api/usage/rate-limits
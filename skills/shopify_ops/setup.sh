#!/bin/bash

# Shopify Ops Skill - CLI Setup Script
# This script configures the shopify_ops skill using Shopify CLI

set -e

echo "=========================================="
echo "Shopify Ops Skill - CLI Setup"
echo "=========================================="
echo ""

# Check if Shopify CLI is installed
if ! command -v shopify &> /dev/null; then
    echo "❌ Shopify CLI is not installed"
    echo "   Install it with: npm install -g @shopify/cli"
    exit 1
fi

echo "✅ Shopify CLI found: $(shopify version)"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found"
    echo "   Creating .env from template..."
    if [ -f "templates/.env.example" ]; then
        cp templates/.env.example .env
        echo "✅ Created .env from template"
        echo "   Please edit .env with your credentials"
    fi
fi

echo ""
echo "📋 Current Configuration:"
echo "   Store URL: $(grep SHOPIFY_STORE_URL .env | cut -d'=' -f2)"
echo ""

# Verify the app is configured
if [ -f "shopify.app.toml" ]; then
    echo "✅ shopify.app.toml exists"
else
    echo "❌ shopify.app.toml not found - creating..."
    cat > shopify.app.toml << 'EOF'
scopes = "write_products,read_products,write_inventory,read_inventory,write_orders,read_orders,write_fulfillments,read_fulfillments,write_customers,read_customers,write_discounts,read_discounts,write_files,read_files,write_themes,read_themes,write_locations,read_locations,write_content,read_content,read_metaobjects,write_metaobjects,read_publications,write_publications,read_analytics,read_reports"

[store]
shop_url = "the-drop-shop-10066.myshopify.com"

[api]
version = "2024-10"

[webhooks]
api_version = "2024-10"
EOF
    echo "✅ Created shopify.app.toml"
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "  1. Run tests: python3 test_both_apis.py"
echo "  2. Use shop_manager.py: python3 scripts/shop_manager.py [command]"
echo ""

#!/bin/bash

# Shopify CLI Wrapper for shopify_ops Skill
# Provides CLI commands for common Shopify operations

set -e

STORE_URL="${SHOPIFY_STORE_URL:-the-drop-shop-10066.myshopify.com}"
API_VERSION="2024-10"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function print_header() {
    echo -e "${BLUE}==================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}==================================${NC}"
}

function print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

function print_error() {
    echo -e "${RED}✗ $1${NC}"
}

function print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Function to verify setup
function verify_setup() {
    print_header "Verifying Setup"

    if ! command -v shopify &> /dev/null; then
        print_error "Shopify CLI not installed"
        return 1
    fi
    print_success "Shopify CLI installed"

    if [ ! -f ".env" ]; then
        print_error ".env file not found"
        return 1
    fi
    print_success ".env file found"

    if [ ! -f "shopify.app.toml" ]; then
        print_error "shopify.app.toml not found"
        return 1
    fi
    print_success "shopify.app.toml configured"

    print_success "Setup verified!"
    return 0
}

# Function to run tests
function run_tests() {
    print_header "Running Shopify API Tests"

    if [ ! -f "test_both_apis.py" ]; then
        print_error "test_both_apis.py not found"
        return 1
    fi

    python3 test_both_apis.py
}

# Function to create product
function create_product() {
    local title="$1"
    local price="$2"
    local description="${3:-}"
    local vendor="${4:-}"

    if [ -z "$title" ] || [ -z "$price" ]; then
        print_error "Usage: create_product <title> <price> [description] [vendor]"
        return 1
    fi

    print_header "Creating Product: $title"

    python3 scripts/shop_manager.py create_product \
        --title "$title" \
        --price "$price" \
        --description "$description" \
        --vendor "$vendor"
}

# Function to list products
function list_products() {
    local limit="${1:-10}"

    print_header "Listing Products (limit: $limit)"

    python3 scripts/shop_manager.py list_products --limit "$limit"
}

# Function to upload image
function upload_image() {
    local image_path="$1"
    local alt_text="${2:-}"

    if [ -z "$image_path" ]; then
        print_error "Usage: upload_image <image_path> [alt_text]"
        return 1
    fi

    if [ ! -f "$image_path" ]; then
        print_error "Image file not found: $image_path"
        return 1
    fi

    print_header "Uploading Image: $image_path"

    python3 scripts/shop_manager.py upload_image \
        --image-path "$image_path" \
        --alt-text "$alt_text"
}

# Function to get shop info
function shop_info() {
    print_header "Shop Information"

    python3 scripts/shop_manager.py shop_info
}

# Function to upload and attach image
function upload_and_attach_image() {
    local product_id="$1"
    local image_path="$2"
    local alt_text="${3:-}"

    if [ -z "$product_id" ] || [ -z "$image_path" ]; then
        print_error "Usage: upload_and_attach_image <product_id> <image_path> [alt_text]"
        return 1
    fi

    if [ ! -f "$image_path" ]; then
        print_error "Image file not found: $image_path"
        return 1
    fi

    print_header "Upload & Attach Image"

    python3 scripts/image_handler.py upload-and-attach \
        --product-id "$product_id" \
        --image-path "$image_path" \
        --alt-text "$alt_text"
}

# Function to upload image
function upload_image_only() {
    local image_path="$1"
    local alt_text="${2:-}"

    if [ -z "$image_path" ]; then
        print_error "Usage: upload_image <image_path> [alt_text]"
        return 1
    fi

    if [ ! -f "$image_path" ]; then
        print_error "Image file not found: $image_path"
        return 1
    fi

    print_header "Upload Image"

    python3 scripts/image_handler.py upload \
        --image-path "$image_path" \
        --alt-text "$alt_text"
}

# Function to attach image
function attach_image_only() {
    local product_id="$1"
    local image_url="$2"
    local alt_text="${3:-}"

    if [ -z "$product_id" ] || [ -z "$image_url" ]; then
        print_error "Usage: attach_image <product_id> <image_url> [alt_text]"
        return 1
    fi

    print_header "Attach Image"

    python3 scripts/image_handler.py attach \
        --product-id "$product_id" \
        --image-url "$image_url" \
        --alt-text "$alt_text"
}

# Function to show help
function show_help() {
    cat << EOF
${BLUE}Shopify CLI Wrapper for shopify_ops Skill${NC}

${YELLOW}Usage:${NC}
    $0 [command] [options]

${YELLOW}Commands:${NC}
    verify                      Verify setup and configuration
    test                        Run comprehensive Shopify API tests
    shop_info                   Get store information
    list_products               List recent products
    create_product              Create a new product
    upload_image                Upload an image to store
    attach_image                Attach existing image to product
    upload_and_attach_image     Upload image and attach to product (recommended)
    help                        Show this help message

${YELLOW}Examples:${NC}
    # Verify setup is correct
    $0 verify

    # Run all tests
    $0 test

    # Get shop info
    $0 shop_info

    # List products (default: 10)
    $0 list_products 20

    # Create a product
    $0 create_product "My Product" "29.99" "Product description" "My Vendor"

    # Upload an image (get URL for reuse)
    $0 upload_image ./path/to/image.jpg "Product image"

    # Attach existing image URL to product
    $0 attach_image "gid://shopify/Product/123456" "https://..." "Alt text"

    # Upload AND attach image (recommended - one command)
    $0 upload_and_attach_image "gid://shopify/Product/123456" ./image.jpg "Alt text"

EOF
}

# Main
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

cd "$SCRIPT_DIR"

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | xargs)
fi

case "$1" in
    verify)
        verify_setup
        ;;
    test)
        run_tests
        ;;
    shop_info)
        shop_info
        ;;
    list_products)
        list_products "${2:-10}"
        ;;
    create_product)
        create_product "$2" "$3" "$4" "$5"
        ;;
    upload_image)
        upload_image_only "$2" "$3"
        ;;
    attach_image)
        attach_image_only "$2" "$3" "$4"
        ;;
    upload_and_attach_image|upload-and-attach)
        upload_and_attach_image "$2" "$3" "$4"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac

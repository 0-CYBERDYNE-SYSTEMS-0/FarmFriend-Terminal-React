import argparse
import os
import json
import requests
import sys
import time
from typing import Dict, Any, Optional

# --- Configuration ---
SHOPIFY_STORE_URL = os.getenv("SHOPIFY_STORE_URL")
ACCESS_TOKEN = os.getenv("SHOPIFY_ACCESS_TOKEN")
API_VERSION = "2024-10"

if not SHOPIFY_STORE_URL or not ACCESS_TOKEN:
    print("Error: SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN environment variables are required.")
    sys.exit(1)

GRAPHQL_ENDPOINT = f"https://{SHOPIFY_STORE_URL}/admin/api/{API_VERSION}/graphql.json"
HEADERS = {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": ACCESS_TOKEN
}

def run_query(query: str, variables: Optional[Dict[str, Any]] = None, max_retries: int = 3) -> Dict[str, Any]:
    """Executes a GraphQL query against the Shopify Admin API with retry logic."""
    payload = {"query": query, "variables": variables or {}}
    
    for attempt in range(max_retries):
        try:
            response = requests.post(GRAPHQL_ENDPOINT, json=payload, headers=HEADERS)
            
            # Handle rate limiting
            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 5))
                print(f"Rate limited. Waiting {retry_after} seconds...")
                time.sleep(retry_after)
                continue
                
            if response.status_code != 200:
                raise Exception(f"API Request failed: {response.status_code} - {response.text}")
                
            data = response.json()
            if "errors" in data:
                raise Exception(f"GraphQL Error: {data['errors']}")
                
            return data
            
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            print(f"Attempt {attempt + 1} failed: {str(e)}. Retrying...")
            time.sleep(2 ** attempt)  # Exponential backoff
    
    raise Exception("Max retries exceeded")

# --- Operations ---

def create_product(title: str, price: str, description: str = "", vendor: str = "", tags: str = "", 
                   product_type: str = "", sku: str = ""):
    """Creates a product with variants and metadata."""
    mutation = """
    mutation productCreate($input: ProductInput!) {
      productCreate(input: $input) {
        product {
          id
          title
          handle
          onlineStoreUrl
          vendor
          productType
          tags
        }
        userErrors {
          field
          message
        }
      }
    }
    """
    
    variables = {
        "input": {
            "title": title,
            "descriptionHtml": description,
            "vendor": vendor,
            "productType": product_type,
            "tags": [tag.strip() for tag in tags.split(",") if tag.strip()],
            "variants": [{
                "price": price,
                "sku": sku,
                "inventoryPolicy": "DENY",
                "requiresShipping": True
            }]
        }
    }
    
    result = run_query(mutation, variables)
    user_errors = result["data"]["productCreate"]["userErrors"]
    
    if user_errors:
        print(f"Failed to create product: {user_errors}")
        return False
    else:
        product = result["data"]["productCreate"]["product"]
        print(f"✅ Success! Product created: {product['title']}")
        print(f"   ID: {product['id']}")
        print(f"   Handle: {product['handle']}")
        print(f"   URL: {product['onlineStoreUrl']}")
        if product['vendor']:
            print(f"   Vendor: {product['vendor']}")
        if product['tags']:
            print(f"   Tags: {', '.join(product['tags'])}")
        return True

def update_theme_settings(settings_json: str):
    """Updates the settings of the main theme."""
    # Find the main theme
    find_theme_query = """
    {
      themes(roles: MAIN) {
        id
        name
        role
      }
    }
    """
    
    themes = run_query(find_theme_query)
    
    if not themes["data"]["themes"]:
        print("Error: No main theme found.")
        return False
        
    theme = themes["data"]["themes"][0]
    theme_id = theme["id"]
    
    print(f"🎨 Targeting Main Theme: {theme['name']} ({theme_id})")
    
    # Parse settings
    try:
        settings = json.loads(settings_json)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON settings: {e}")
        return False
    
    print(f"📝 Settings to apply: {json.dumps(settings, indent=2)}")
    
    # Note: Full theme asset update requires fetching existing settings_data.json
    # This is a simplified implementation that shows the structure
    print("⚠️  Note: Full theme asset merging requires additional implementation.")
    print("   Current implementation demonstrates API connectivity and theme discovery.")
    
    return True

def get_shop_info():
    """Retrieves basic shop information."""
    query = """
    {
      shop {
        name
        email
        currencyCode
        timezone
        myshopifyDomain
        url
      }
    }
    """
    
    result = run_query(query)
    shop = result["data"]["shop"]
    
    print(f"🏪 Shop Information:")
    print(f"   Name: {shop['name']}")
    print(f"   Email: {shop['email']}")
    print(f"   Currency: {shop['currencyCode']}")
    print(f"   Timezone: {shop['timezone']}")
    print(f"   Domain: {shop['myshopifyDomain']}")
    print(f"   URL: {shop['url']}")
    
    return shop

def list_products(limit: int = 10):
    """Lists recent products from the store."""
    query = f"""
    {{
      products(first: {limit}) {{
        edges {{
          node {{
            id
            title
            handle
            vendor
            productType
            status
            createdAt
            variants(first: 1) {{
              edges {{
                node {{
                  price
                  sku
                  inventoryQuantity
                }}
              }}
            }}
          }}
        }}
      }}
    }}
    """
    
    result = run_query(query)
    products = result["data"]["products"]["edges"]
    
    print(f"📦 Recent Products ({len(products)}):")
    for edge in products:
        product = edge["node"]
        variant = product["variants"]["edges"][0]["node"] if product["variants"]["edges"] else None
        
        print(f"   • {product['title']}")
        print(f"     ID: {product['id']}")
        print(f"     Handle: {product['handle']}")
        if variant:
            print(f"     Price: ${variant['price']}")
            if variant['inventoryQuantity'] is not None:
                print(f"     Stock: {variant['inventoryQuantity']}")
        print(f"     Status: {product['status']}")
        print()
    
    return products

# --- CLI Handler ---
def main():
    parser = argparse.ArgumentParser(description="Shopify Operations Manager")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Create Product Command
    prod_parser = subparsers.add_parser("create_product", help="Create a new product")
    prod_parser.add_argument("--title", required=True, help="Product title")
    prod_parser.add_argument("--price", required=True, help="Product price")
    prod_parser.add_argument("--description", default="", help="Product description (HTML)")
    prod_parser.add_argument("--vendor", default="", help="Product vendor")
    prod_parser.add_argument("--tags", default="", help="Comma-separated tags")
    prod_parser.add_argument("--product-type", default="", help="Product type")
    prod_parser.add_argument("--sku", default="", help="SKU for the variant")
    
    # Update Theme Command
    theme_parser = subparsers.add_parser("update_theme", help="Update theme configuration")
    theme_parser.add_argument("--settings", required=True, help="JSON string of theme settings")
    
    # Shop Info Command
    info_parser = subparsers.add_parser("shop_info", help="Get shop information")
    
    # List Products Command
    list_parser = subparsers.add_parser("list_products", help="List recent products")
    list_parser.add_argument("--limit", type=int, default=10, help="Number of products to list")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    try:
        if args.command == "create_product":
            create_product(
                title=args.title,
                price=args.price,
                description=args.description,
                vendor=args.vendor,
                tags=args.tags,
                product_type=args.product_type,
                sku=args.sku
            )
        elif args.command == "update_theme":
            update_theme_settings(args.settings)
        elif args.command == "shop_info":
            get_shop_info()
        elif args.command == "list_products":
            list_products(limit=args.limit)
        else:
            parser.print_help()
            
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
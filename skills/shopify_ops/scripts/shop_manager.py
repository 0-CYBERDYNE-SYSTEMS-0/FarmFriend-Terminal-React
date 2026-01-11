import argparse
import os
import json
import requests
import sys
import time
import mimetypes
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

# --- Image Upload Functions ---

def staged_uploads_create(filename: str, mime_type: str, resource: str = "PRODUCT_IMAGE") -> Dict[str, Any]:
    """
    Creates a staged upload target for files like images.
    Returns upload URL, resource URL, and parameters for the upload.
    """
    mutation = """
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters {
            name
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }
    """

    variables = {
        "input": [{
            "filename": filename,
            "mimeType": mime_type,
            "resource": resource
        }]
    }
    
    result = run_query(mutation, variables)
    user_errors = result["data"]["stagedUploadsCreate"]["userErrors"]
    
    if user_errors:
        raise Exception(f"Failed to create staged upload: {user_errors}")
    
    target = result["data"]["stagedUploadsCreate"]["stagedTargets"][0]
    return {
        "upload_url": target["url"],
        "resource_url": target["resourceUrl"],
        "parameters": target["parameters"]
    }

def upload_file_to_staged_url(upload_url: str, file_path: str, parameters: list) -> bool:
    """
    Uploads a local file to the staged upload URL using a PUT request.
    """
    if not os.path.exists(file_path):
        raise Exception(f"File not found: {file_path}")
    
    # Read file content
    with open(file_path, "rb") as f:
        file_content = f.read()
    
    # Build headers from parameters
    headers = {"Content-Type": mimetypes.guess_type(file_path)[0] or "application/octet-stream"}
    for param in parameters:
        headers[param["name"]] = param["value"]
    
    # Upload using PUT request
    response = requests.put(upload_url, data=file_content, headers=headers)
    
    if response.status_code not in (200, 201, 204):
        raise Exception(f"Upload failed: {response.status_code} - {response.text}")
    
    return True

def attach_image_to_product(product_id: str, image_url: str, alt_text: str = "") -> bool:
    """
    Attaches an image to an existing product using REST API.
    Works with Shopify Admin API 2024-10+
    """
    # Extract numeric ID from GraphQL ID (gid://shopify/Product/123456 -> 123456)
    numeric_id = product_id.split("/")[-1]

    rest_endpoint = f"https://{SHOPIFY_STORE_URL}/admin/api/2024-10/products/{numeric_id}/images.json"

    rest_headers = {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": ACCESS_TOKEN
    }

    payload = {
        "image": {
            "src": image_url,
            "alt": alt_text or "Product image"
        }
    }

    response = requests.post(rest_endpoint, json=payload, headers=rest_headers)

    if response.status_code not in (200, 201):
        raise Exception(f"REST API Error: {response.status_code} - {response.text}")

    data = response.json()
    image = data.get("image", {})

    print(f"✅ Image attached to product successfully")
    print(f"   Image ID: {image.get('id')}")
    print(f"   URL: {image.get('src')}")

    return True

def upload_image(image_path: str, alt_text: str = "") -> Optional[str]:
    """
    Uploads an image file to Shopify and returns the resource URL.
    """
    if not os.path.exists(image_path):
        raise Exception(f"File not found: {image_path}")
    
    filename = os.path.basename(image_path)
    mime_type = mimetypes.guess_type(image_path)[0] or "image/jpeg"
    
    print(f"📤 Uploading image: {filename}")
    
    # Stage the upload
    staged = staged_uploads_create(filename, mime_type)
    print(f"   Staged upload target created")
    
    # Upload the file
    upload_file_to_staged_url(staged["upload_url"], image_path, staged["parameters"])
    print(f"   File uploaded successfully")
    
    resource_url = staged["resource_url"]
    print(f"   Image URL: {resource_url}")
    
    return resource_url

def create_product_with_image(title: str, price: str, image_path: str, 
                               description: str = "", vendor: str = "", 
                               tags: str = "", product_type: str = "", 
                               sku: str = "", alt_text: str = "") -> bool:
    """
    Creates a product with an image attached. Handles the complete workflow:
    1. Upload image to Shopify
    2. Create product with the image
    """
    # Upload image first
    image_url = upload_image(image_path, alt_text)
    
    if not image_url:
        raise Exception("Failed to upload image")
    
    # Create product without variants first
    create_mutation = """
    mutation productCreate($input: ProductInput!) {
      productCreate(input: $input) {
        product {
          id
          title
          handle
          onlineStoreUrl
          media(first: 10) {
            edges {
              node {
                ... on MediaImage {
                  id
                  image {
                    url
                  }
                }
              }
            }
          }
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
            "media": [{
                "mediaContentType": "IMAGE",
                "originalSource": image_url,
                "alt": alt_text or title
            }]
        }
    }
    
    result = run_query(create_mutation, variables)
    user_errors = result["data"]["productCreate"]["userErrors"]
    
    if user_errors:
        print(f"Failed to create product: {user_errors}")
        return False
    
    product = result["data"]["productCreate"]["product"]
    product_id = product["id"]
    
    print(f"✅ Product created with image: {product['title']}")
    print(f"   ID: {product_id}")
    print(f"   Handle: {product['handle']}")
    
    # Now add the variant
    if price or sku:
        variant_mutation = """
        mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkCreate(productId: $productId, variants: $variants) {
            productVariants {
              id
              price
              sku
            }
            userErrors {
              field
              message
            }
          }
        }
        """
        
        variants_input = []
        if price:
            variants_input.append({
                "price": price,
                "sku": sku or "",
                "inventoryPolicy": "DENY",
                "requiresShipping": True
            })
        
        if variants_input:
            var_result = run_query(variant_mutation, {
                "productId": product_id,
                "variants": variants_input
            })
            var_errors = var_result["data"]["productVariantsBulkCreate"]["userErrors"]
            
            if var_errors:
                print(f"⚠️  Variant creation failed: {var_errors}")
            else:
                variant = var_result["data"]["productVariantsBulkCreate"]["productVariants"][0]
                print(f"   Price: ${variant['price']}")
    
    if product.get('onlineStoreUrl'):
        print(f"   URL: {product['onlineStoreUrl']}")
    
    return True

# --- Operations ---

def create_product(title: str, price: str, description: str = "", vendor: str = "", tags: str = "", 
                   product_type: str = "", sku: str = ""):
    """Creates a product with variants and metadata."""
    # First create the product without variants
    create_mutation = """
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
            "tags": [tag.strip() for tag in tags.split(",") if tag.strip()]
        }
    }
    
    result = run_query(create_mutation, variables)
    user_errors = result["data"]["productCreate"]["userErrors"]
    
    if user_errors:
        print(f"Failed to create product: {user_errors}")
        return False
    
    product = result["data"]["productCreate"]["product"]
    product_id = product["id"]
    
    print(f"✅ Product created: {product['title']}")
    print(f"   ID: {product_id}")
    print(f"   Handle: {product['handle']}")
    
    # Now add the variant
    if price or sku:
        variant_mutation = """
        mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkCreate(productId: $productId, variants: $variants) {
            productVariants {
              id
              price
              sku
            }
            userErrors {
              field
              message
            }
          }
        }
        """
        
        variants_input = []
        if price:
            variants_input.append({
                "price": price
            })
        
        if variants_input:
            var_result = run_query(variant_mutation, {
                "productId": product_id,
                "variants": variants_input
            })
            var_errors = var_result["data"]["productVariantsBulkCreate"]["userErrors"]
            
            if var_errors:
                print(f"⚠️  Variant creation failed: {var_errors}")
            else:
                variant = var_result["data"]["productVariantsBulkCreate"]["productVariants"][0]
                print(f"   Price: ${variant['price']}")
                # Add SKU separately if provided
                if sku:
                    sku_mutation = """
                    mutation productVariantUpdate($input: ProductVariantInput!) {
                      productVariantUpdate(input: $input) {
                        productVariant {
                          sku
                        }
                        userErrors {
                          field
                          message
                        }
                      }
                    }
                    """
                    run_query(sku_mutation, {
                        "input": {
                            "id": variant["id"],
                            "sku": sku
                        }
                    })
                    print(f"   SKU: {sku}")
    
    if product.get('onlineStoreUrl'):
        print(f"   URL: {product['onlineStoreUrl']}")
    
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
        ianaTimezone
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
    print(f"   Timezone: {shop['ianaTimezone']}")
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
    
    # Upload Image Command
    upload_parser = subparsers.add_parser("upload_image", help="Upload an image to Shopify")
    upload_parser.add_argument("--image-path", required=True, help="Path to the image file")
    upload_parser.add_argument("--alt-text", default="", help="Alt text for the image")
    
    # Create Product with Image Command
    prod_img_parser = subparsers.add_parser("create_product_with_image", help="Create a product with an image")
    prod_img_parser.add_argument("--title", required=True, help="Product title")
    prod_img_parser.add_argument("--price", required=True, help="Product price")
    prod_img_parser.add_argument("--image-path", required=True, help="Path to the image file")
    prod_img_parser.add_argument("--description", default="", help="Product description (HTML)")
    prod_img_parser.add_argument("--vendor", default="", help="Product vendor")
    prod_img_parser.add_argument("--tags", default="", help="Comma-separated tags")
    prod_img_parser.add_argument("--product-type", default="", help="Product type")
    prod_img_parser.add_argument("--sku", default="", help="SKU for the variant")
    prod_img_parser.add_argument("--alt-text", default="", help="Alt text for the image")
    
    # Attach Image to Product Command
    attach_parser = subparsers.add_parser("attach_image", help="Attach an image to an existing product")
    attach_parser.add_argument("--product-id", required=True, help="Product ID (gid://shopify/Product/...)")
    attach_parser.add_argument("--image-path", required=True, help="Path to the image file")
    attach_parser.add_argument("--alt-text", default="", help="Alt text for the image")
    
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
        elif args.command == "upload_image":
            url = upload_image(args.image_path, args.alt_text)
            if url:
                print(f"\n📎 Image URL for reuse: {url}")
        elif args.command == "create_product_with_image":
            create_product_with_image(
                title=args.title,
                price=args.price,
                image_path=args.image_path,
                description=args.description,
                vendor=args.vendor,
                tags=args.tags,
                product_type=args.product_type,
                sku=args.sku,
                alt_text=args.alt_text
            )
        elif args.command == "attach_image":
            # First upload the image
            image_url = upload_image(args.image_path, args.alt_text)
            if image_url:
                attach_image_to_product(args.product_id, image_url, args.alt_text)
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
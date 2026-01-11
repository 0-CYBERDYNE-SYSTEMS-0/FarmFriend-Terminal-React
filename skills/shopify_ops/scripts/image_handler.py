#!/usr/bin/env python3
"""
Shopify Image Handler - Upload and attach images to products
Provides unified interface for all image operations
Works with Shopify Admin GraphQL API 2024-10+
"""

import os
import requests
import json
import mimetypes
import argparse
from dotenv import load_dotenv

load_dotenv()

SHOPIFY_STORE_URL = os.getenv("SHOPIFY_STORE_URL")
ACCESS_TOKEN = os.getenv("SHOPIFY_ACCESS_TOKEN")
API_VERSION = "2024-10"

if not SHOPIFY_STORE_URL or not ACCESS_TOKEN:
    print("Error: SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN environment variables are required.")
    exit(1)

GRAPHQL_ENDPOINT = f"https://{SHOPIFY_STORE_URL}/admin/api/{API_VERSION}/graphql.json"
GRAPHQL_HEADERS = {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": ACCESS_TOKEN
}

REST_HEADERS = {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": ACCESS_TOKEN
}

# ============================================================================
# GraphQL Operations
# ============================================================================

def run_query(query, variables=None):
    """Execute GraphQL query"""
    payload = {"query": query, "variables": variables or {}}
    response = requests.post(GRAPHQL_ENDPOINT, json=payload, headers=GRAPHQL_HEADERS)
    data = response.json()
    if "errors" in data:
        raise Exception(f"GraphQL Error: {json.dumps(data['errors'], indent=2)}")
    return data

def stage_image_upload(file_path):
    """Stage image for upload - returns staging URL and resource URL"""
    filename = os.path.basename(file_path)
    mime_type = mimetypes.guess_type(file_path)[0] or "image/jpeg"

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
            "resource": "PRODUCT_IMAGE"
        }]
    }

    result = run_query(mutation, variables)
    errors = result["data"]["stagedUploadsCreate"]["userErrors"]

    if errors:
        raise Exception(f"Failed to stage upload: {errors}")

    target = result["data"]["stagedUploadsCreate"]["stagedTargets"][0]
    return {
        "upload_url": target["url"],
        "resource_url": target["resourceUrl"],
        "parameters": target["parameters"]
    }

# ============================================================================
# File Upload Operations
# ============================================================================

def upload_file_to_staging(upload_url, file_path, parameters):
    """Upload file to staging URL"""
    if not os.path.exists(file_path):
        raise Exception(f"File not found: {file_path}")

    with open(file_path, "rb") as f:
        file_content = f.read()

    headers = {"Content-Type": mimetypes.guess_type(file_path)[0] or "image/jpeg"}
    for param in parameters:
        headers[param["name"]] = param["value"]

    response = requests.put(upload_url, data=file_content, headers=headers)

    if response.status_code not in (200, 201, 204):
        raise Exception(f"Upload failed: {response.status_code} - {response.text}")

    return True

# ============================================================================
# REST API Operations (More reliable for image attachment)
# ============================================================================

def attach_image_rest(product_id, image_url, alt_text=""):
    """Attach image to product using REST API"""
    # Extract numeric ID from GraphQL ID (gid://shopify/Product/123456 -> 123456)
    numeric_id = product_id.split("/")[-1]

    rest_endpoint = f"https://{SHOPIFY_STORE_URL}/admin/api/{API_VERSION}/products/{numeric_id}/images.json"

    payload = {
        "image": {
            "src": image_url,
            "alt": alt_text or "Product image"
        }
    }

    response = requests.post(rest_endpoint, json=payload, headers=REST_HEADERS)

    if response.status_code not in (200, 201):
        raise Exception(f"REST API failed: {response.status_code} - {response.text}")

    data = response.json()
    return data.get("image", {})

# ============================================================================
# High-Level Operations
# ============================================================================

def upload_image(image_path, alt_text=""):
    """Upload image and return permanent URL"""
    print(f"📤 Uploading image: {os.path.basename(image_path)}")

    # Stage upload
    print("   Staging upload...")
    staged = stage_image_upload(image_path)
    print("   ✅ Staging URL ready")

    # Upload file
    print("   Uploading to CDN...")
    upload_file_to_staging(staged["upload_url"], image_path, staged["parameters"])
    print("   ✅ File uploaded")

    return staged["resource_url"]

def attach_image_to_product(product_id, image_url, alt_text=""):
    """Attach image to product"""
    print(f"📎 Attaching image to product...")

    image = attach_image_rest(product_id, image_url, alt_text)

    print(f"   ✅ Image attached!")
    print(f"   Image ID: {image.get('id')}")
    print(f"   URL: {image.get('src')}")

    return image

def upload_and_attach_image(product_id, image_path, alt_text=""):
    """Complete workflow: upload and attach image to product"""
    print(f"📸 Complete Image Workflow")
    print(f"   Product: {product_id}")
    print(f"   Image: {image_path}")
    print()

    # Upload
    image_url = upload_image(image_path, alt_text)
    print()

    # Attach
    image = attach_image_to_product(product_id, image_url, alt_text)
    print()

    return image

# ============================================================================
# CLI Interface
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Shopify Image Handler")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Upload image
    upload_parser = subparsers.add_parser("upload", help="Upload image and get URL")
    upload_parser.add_argument("--image-path", required=True, help="Path to image file")
    upload_parser.add_argument("--alt-text", default="", help="Alt text for image")

    # Attach image
    attach_parser = subparsers.add_parser("attach", help="Attach image to product")
    attach_parser.add_argument("--product-id", required=True, help="Product ID (gid://shopify/Product/...)")
    attach_parser.add_argument("--image-url", required=True, help="Image URL")
    attach_parser.add_argument("--alt-text", default="", help="Alt text for image")

    # Upload and attach
    combo_parser = subparsers.add_parser("upload-and-attach", help="Upload image and attach to product")
    combo_parser.add_argument("--product-id", required=True, help="Product ID (gid://shopify/Product/...)")
    combo_parser.add_argument("--image-path", required=True, help="Path to image file")
    combo_parser.add_argument("--alt-text", default="", help="Alt text for image")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    try:
        if args.command == "upload":
            url = upload_image(args.image_path, args.alt_text)
            print(f"\n📎 Image URL for reuse:")
            print(f"   {url}")

        elif args.command == "attach":
            attach_image_to_product(args.product_id, args.image_url, args.alt_text)

        elif args.command == "upload-and-attach":
            upload_and_attach_image(args.product_id, args.image_path, args.alt_text)
            print(f"\n✅ Image successfully attached to product!")

    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
        exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        exit(1)

if __name__ == "__main__":
    main()

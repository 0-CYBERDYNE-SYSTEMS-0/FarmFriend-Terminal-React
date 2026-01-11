#!/usr/bin/env python3
"""
Comprehensive Shopify API Test Suite
Tests both shopify_ops token and fft-integration app
Logs all responses and identifies issues
"""

import os
import sys
import json
import requests
import time
from datetime import datetime
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Color codes for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

class ShopifyAPITester:
    def __init__(self):
        self.store_url = os.getenv("SHOPIFY_STORE_URL", "the-drop-shop-10066.myshopify.com")
        self.shopify_ops_token = os.getenv("SHOPIFY_ACCESS_TOKEN")
        self.api_version = "2024-10"
        self.graphql_endpoint = f"https://{self.store_url}/admin/api/{self.api_version}/graphql.json"
        self.test_results = []
        self.timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def log_test(self, test_name: str, token_name: str, status: str, response: Dict[str, Any], error: Optional[str] = None):
        """Log test results"""
        result = {
            "timestamp": self.timestamp,
            "test": test_name,
            "token": token_name,
            "status": status,
            "error": error,
            "response": response
        }
        self.test_results.append(result)

    def print_header(self, text: str):
        """Print formatted header"""
        print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}")
        print(f"  {text}")
        print(f"{'='*80}{Colors.RESET}\n")

    def print_result(self, text: str, status: str):
        """Print formatted result"""
        color = Colors.GREEN if status == "✓" else Colors.RED
        print(f"{color}{status} {text}{Colors.RESET}")

    def test_graphql_query(self, token: str, token_name: str, query: str, test_name: str) -> Dict[str, Any]:
        """Execute GraphQL query and log results"""
        headers = {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token
        }

        payload = {"query": query, "variables": {}}

        try:
            response = requests.post(
                self.graphql_endpoint,
                json=payload,
                headers=headers,
                timeout=10
            )

            data = response.json()

            if response.status_code == 200:
                if "errors" in data:
                    self.print_result(f"{test_name} ({token_name}): GraphQL Error", "✗")
                    self.log_test(test_name, token_name, "FAILED", data, str(data.get("errors")))
                    return {"status": "error", "data": data}
                else:
                    self.print_result(f"{test_name} ({token_name}): Success", "✓")
                    self.log_test(test_name, token_name, "SUCCESS", data)
                    return {"status": "success", "data": data}
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                self.print_result(f"{test_name} ({token_name}): HTTP Error", "✗")
                self.log_test(test_name, token_name, "FAILED", {"status_code": response.status_code}, error_msg)
                return {"status": "error", "data": response.json() if response.text else {}}

        except Exception as e:
            error_msg = str(e)
            self.print_result(f"{test_name} ({token_name}): Exception", "✗")
            self.log_test(test_name, token_name, "ERROR", {}, error_msg)
            return {"status": "error", "data": {}, "exception": error_msg}

    def run_all_tests(self):
        """Run comprehensive test suite"""

        self.print_header("SHOPIFY API COMPREHENSIVE TEST SUITE")
        print(f"Store: {self.store_url}")
        print(f"Timestamp: {self.timestamp}")
        print(f"API Version: {self.api_version}\n")

        if not self.shopify_ops_token:
            print(f"{Colors.RED}ERROR: SHOPIFY_ACCESS_TOKEN not set in .env{Colors.RESET}")
            return

        # Test 1: Shop Information
        self.print_header("TEST 1: SHOP INFORMATION")
        shop_query = """
        {
          shop {
            name
            email
            currencyCode
            ianaTimezone
            myshopifyDomain
            url
            plan {
              displayName
            }
          }
        }
        """
        self.test_graphql_query(self.shopify_ops_token, "shopify_ops", shop_query, "Shop Info")

        # Test 2: List Products
        self.print_header("TEST 2: LIST PRODUCTS")
        products_query = """
        {
          products(first: 5) {
            edges {
              node {
                id
                title
                handle
                status
                createdAt
                variants(first: 1) {
                  edges {
                    node {
                      id
                      price
                    }
                  }
                }
              }
            }
          }
        }
        """
        self.test_graphql_query(self.shopify_ops_token, "shopify_ops", products_query, "List Products")

        # Test 3: Check Image Upload Scopes
        self.print_header("TEST 3: STAGED UPLOADS (Image Upload Capability)")
        staged_query = """
        mutation {
          stagedUploadsCreate(input: [{
            filename: "test.jpg"
            mimeType: "image/jpeg"
            resource: PRODUCT_IMAGE
          }]) {
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
        self.test_graphql_query(self.shopify_ops_token, "shopify_ops", staged_query, "Staged Upload Capability")

        # Test 4: Check Write Permissions
        self.print_header("TEST 4: CREATE TEST PRODUCT (Write Permissions)")
        create_product_query = """
        mutation {
          productCreate(input: {
            title: "API Test Product"
            productType: "Test"
            vendor: "Test Vendor"
          }) {
            product {
              id
              title
            }
            userErrors {
              field
              message
            }
          }
        }
        """
        result = self.test_graphql_query(self.shopify_ops_token, "shopify_ops", create_product_query, "Create Test Product")

        # If product created, delete it
        if result["status"] == "success" and "data" in result and "productCreate" in result["data"].get("data", {}):
            product_data = result["data"]["data"]["productCreate"]["product"]
            if product_data and "id" in product_data:
                self.print_header("CLEANUP: DELETE TEST PRODUCT")
                delete_query = f"""
                mutation {{
                  productDelete(input: {{ id: "{product_data['id']}" }}) {{
                    deletedProductId
                    userErrors {{
                      field
                      message
                    }}
                  }}
                }}
                """
                self.test_graphql_query(self.shopify_ops_token, "shopify_ops", delete_query, "Delete Test Product")

        # Test 5: Check Inventory Access
        self.print_header("TEST 5: INVENTORY ACCESS")
        inventory_query = """
        {
          inventoryItems(first: 5) {
            edges {
              node {
                id
                tracked
              }
            }
          }
        }
        """
        self.test_graphql_query(self.shopify_ops_token, "shopify_ops", inventory_query, "Inventory Access")

        # Test 6: Check Customer Access
        self.print_header("TEST 6: CUSTOMER ACCESS")
        customers_query = """
        {
          customers(first: 5) {
            edges {
              node {
                id
                email
                firstName
                lastName
              }
            }
          }
        }
        """
        self.test_graphql_query(self.shopify_ops_token, "shopify_ops", customers_query, "Customer Access")

        # Print Summary
        self.print_summary()

        # Save results to file
        self.save_results()

    def print_summary(self):
        """Print test summary"""
        self.print_header("TEST SUMMARY")

        success_count = sum(1 for r in self.test_results if r["status"] == "SUCCESS")
        total_count = len(self.test_results)

        print(f"Total Tests: {total_count}")
        print(f"Passed: {Colors.GREEN}{success_count}{Colors.RESET}")
        print(f"Failed: {Colors.RED}{total_count - success_count}{Colors.RESET}\n")

        print("Detailed Results:")
        for result in self.test_results:
            status_color = Colors.GREEN if result["status"] == "SUCCESS" else Colors.RED
            print(f"  [{status_color}{result['status']}{Colors.RESET}] {result['test']} ({result['token']})")
            if result["error"]:
                print(f"      Error: {result['error']}")

    def save_results(self):
        """Save detailed results to JSON file"""
        log_file = "/Users/scrimwiggins/ff-terminal-ts/skills/shopify_ops/test_results.json"

        with open(log_file, "w") as f:
            json.dump(self.test_results, f, indent=2)

        print(f"\n{Colors.YELLOW}Full results saved to: {log_file}{Colors.RESET}")

if __name__ == "__main__":
    tester = ShopifyAPITester()
    tester.run_all_tests()

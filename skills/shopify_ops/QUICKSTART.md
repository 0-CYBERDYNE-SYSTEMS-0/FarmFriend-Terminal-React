# Shopify Ops Skill - Quick Start Guide

## Installation (One-time)

```bash
cd skills/shopify_ops
bash setup.sh
```

## Common Commands

### Verify Setup
```bash
bash shopify_cli_wrapper.sh verify
```

### Check Store
```bash
bash shopify_cli_wrapper.sh shop_info
```

### List Products (first 10)
```bash
bash shopify_cli_wrapper.sh list_products
```

### Create Product
```bash
bash shopify_cli_wrapper.sh create_product "Product Name" "19.99" "Description" "Vendor"
```

### **Upload Image & Attach to Product (Recommended)**
```bash
bash shopify_cli_wrapper.sh upload_and_attach_image \
  "gid://shopify/Product/14889202483572" \
  ./product.jpg \
  "Product image"
```

### Upload Image (get URL)
```bash
bash shopify_cli_wrapper.sh upload_image ./image.jpg "Image description"
```

### Attach Existing Image
```bash
bash shopify_cli_wrapper.sh attach_image \
  "gid://shopify/Product/14889202483572" \
  "https://cdn.shopify.com/.../image.jpg" \
  "Alt text"
```

### Run Tests
```bash
bash shopify_cli_wrapper.sh test
```

---

## Direct Python Usage

### List Products
```bash
python3 scripts/shop_manager.py list_products --limit 10
```

### Create Product
```bash
python3 scripts/shop_manager.py create_product \
  --title "Product Name" \
  --price "29.99" \
  --vendor "Vendor Name"
```

### Create Product with Image
```bash
python3 scripts/shop_manager.py create_product_with_image \
  --title "Product Name" \
  --price "29.99" \
  --image-path ./image.jpg \
  --alt-text "Image description"
```

### Get Shop Info
```bash
python3 scripts/shop_manager.py shop_info
```

---

## Using with Agents

Your agents can execute:

```bash
# Via shell
bash shopify_cli_wrapper.sh [command]

# Or directly with Python
python3 scripts/shop_manager.py [command]

# Or with bash piping
python3 scripts/shop_manager.py list_products | jq '.'
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Command not found | Run `bash setup.sh` first |
| Permission denied | `chmod +x shopify_cli_wrapper.sh` |
| .env not found | Create from `.env.example` |
| Token errors | Check `.env` has `SHOPIFY_ACCESS_TOKEN` |

---

## Next Steps

1. ✅ Setup complete
2. ✅ CLI working
3. ✅ Tests passing
4. → Start building agent workflows!

See `CLI_INTEGRATION.md` for full documentation.

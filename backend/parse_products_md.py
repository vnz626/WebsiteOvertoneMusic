import re

def parse_md(filepath=r"c:\Users\LENOVO\Downloads\data_produk_toko_kamera.md"):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Parse Brands section
    brands_section = re.search(r"## Referensi brand_id(.*?)(?=## [A-Z]|$)", content, re.DOTALL)
    brands = []
    if brands_section:
        for line in brands_section.group(1).strip().split("\n"):
            line = line.strip()
            if line.startswith("|") and not "brand_id" in line and not "---" in line:
                cols = [c.strip() for c in line.split("|")[1:-1]]
                if len(cols) >= 2 and cols[0].isdigit():
                    brands.append({"id": int(cols[0]), "name": cols[1]})

    # 2. Parse Products
    products = []
    # Split by section
    lines = content.split("\n")
    in_table = False
    current_category = ""

    for line in lines:
        line_s = line.strip()
        if line_s.startswith("## ") and "Referensi" not in line_s and "Catatan" not in line_s:
            current_category = line_s.replace("## ", "").strip()
            continue
        
        if line_s.startswith("| id | brand_id |"):
            in_table = True
            continue

        if in_table:
            if not line_s.startswith("|") or line_s.startswith("## "):
                in_table = False
                continue
            if line_s.startswith("|---"):
                continue

            cols = [c.strip() for c in line_s.split("|")[1:-1]]
            if len(cols) >= 15 and cols[0].isdigit():
                products.append({
                    "id": int(cols[0]),
                    "brand_id": int(cols[1]),
                    "branch_id": None if cols[2] == "NULL" else int(cols[2]),
                    "name": cols[3],
                    "sku_prefix": cols[4],
                    "instrument_type": cols[5],
                    "category": cols[6],
                    "description": cols[7],
                    "specifications": cols[8],
                    "warranty_months": int(cols[9]),
                    "image_url": None if cols[10] == "NULL" else cols[10],
                    "status": cols[11],
                    "created_by": int(cols[12]),
                    "created_at": cols[13],
                    "updated_at": cols[14],
                })

    return brands, products

if __name__ == "__main__":
    brands, products = parse_md()
    print(f"Total brands parsed: {len(brands)}")
    print(f"Total products parsed: {len(products)}")
    print("Sample brand:", brands[0])
    print("Sample product:", products[0]["id"], products[0]["name"], products[0]["category"])
    print("Last product:", products[-1]["id"], products[-1]["name"], products[-1]["category"])
    
    # Check completeness
    ids = [p["id"] for p in products]
    print(f"Product IDs min: {min(ids)}, max: {max(ids)}, unique count: {len(set(ids))}")


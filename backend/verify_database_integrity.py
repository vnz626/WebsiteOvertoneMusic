import sys
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from app import create_app
from app.models.models import (
    KMSBrandSupplier,
    TPSProduct,
    TPSProductVariant,
    TPSBranchStock,
    TPSBundle,
    TPSBundleItem,
    TPSOrder,
    TPSProductReview,
    KMSArticle,
    DSSSession,
    DSSTopsisResult,
)

def run_checks():
    app = create_app()
    with app.app_context():
        # 1. Brands Check
        brands = KMSBrandSupplier.query.all()
        brand_ids = sorted([b.id for b in brands])
        expected_bids = sorted([1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30])
        assert brand_ids == expected_bids, f"Brand IDs mismatch! Got: {brand_ids}"
        print(f"✓ Brands Check: {len(brands)} brands matching exact IDs: {brand_ids}")

        # 2. Products Check
        products = TPSProduct.query.all()
        prod_ids = sorted([p.id for p in products])
        assert prod_ids == list(range(1, 92)), f"Product IDs mismatch! Got count: {len(prod_ids)}"
        print(f"✓ Products Check: {len(products)} products with IDs 1 to 91.")

        # 3. Product Images Check
        for p in products:
            assert p.image_url is not None and len(p.image_url) > 0, f"Product {p.id} has NULL or empty image_url!"
            assert ".jpg" in p.image_url or ".png" in p.image_url, f"Product {p.id} image_url is not direct image: {p.image_url}"
        print(f"✓ Product Images Check: All 91 products have valid direct image URLs.")

        # 4. Variants Check
        variants = TPSProductVariant.query.all()
        assert len(variants) == 92, f"Expected 92 variants, got {len(variants)}"
        var_prod_ids = set(v.product_id for v in variants)
        assert var_prod_ids == set(range(1, 92)), "Every product must have at least 1 variant!"
        for v in variants:
            assert v.price > v.cost_price > 0, f"Invalid pricing on variant {v.id}: price={v.price}, cost={v.cost_price}"
            assert v.stock > 0, f"Invalid stock on variant {v.id}: {v.stock}"
            assert v.weight_kg > 0, f"Invalid weight on variant {v.id}: {v.weight_kg}"
        print(f"✓ Variants Check: 92 variants verified with valid price, cost, stock, and weight.")

        # 5. Multi-Branch Stock Check
        b_stocks = TPSBranchStock.query.all()
        assert len(b_stocks) == 92 * 6, f"Expected {92 * 6} branch stock rows, got {len(b_stocks)}"
        print(f"✓ Multi-Branch Stock Check: {len(b_stocks)} rows across 6 branches verified.")

        # 6. Bundles Check
        bundles = TPSBundle.query.all()
        assert len(bundles) == 3, f"Expected 3 bundles, got {len(bundles)}"
        bundle_items = TPSBundleItem.query.all()
        assert len(bundle_items) >= 6, f"Expected at least 6 bundle items, got {len(bundle_items)}"
        print(f"✓ Bundles Check: {len(bundles)} curated indie bundles verified.")

        # 7. Orders Check
        orders = TPSOrder.query.all()
        assert len(orders) == 20, f"Expected 20 orders, got {len(orders)}"
        print(f"✓ Orders Check: {len(orders)} omnichannel sample orders verified.")

        # 8. Reviews Check
        reviews = TPSProductReview.query.all()
        assert len(reviews) == 26, f"Expected 26 reviews, got {len(reviews)}"
        print(f"✓ Reviews Check: {len(reviews)} filmmaker reviews verified.")

        # 9. DSS TOPSIS Check
        sessions = DSSSession.query.all()
        assert len(sessions) >= 1, "Expected at least 1 DSS session"
        topsis_res = DSSTopsisResult.query.all()
        assert len(topsis_res) == 92, f"Expected 92 TOPSIS results, got {len(topsis_res)}"
        print(f"✓ DSS TOPSIS Check: 1 session with {len(topsis_res)} ranked variant results verified.")

        # 10. Check for old musical remnants in products
        musical_keywords = ["gitar", "guitar", "bass", "drum", "piano", "keyboard", "biola", "violin", "terompet", "saxophone"]
        found_remnants = []
        for p in products:
            for kw in musical_keywords:
                if kw in p.name.lower() or kw in p.category.lower():
                    found_remnants.append((p.id, p.name, kw))
        assert len(found_remnants) == 0, f"Found musical remnants in products: {found_remnants}"
        print("✓ Zero musical terms remnant check passed: All 91 products are cinema & broadcast equipment.")

        print("\n=======================================================")
        print("ALL 10 DATABASE INTEGRITY CHECKS PASSED PERFECTLY!")
        print("=======================================================")

if __name__ == "__main__":
    run_checks()


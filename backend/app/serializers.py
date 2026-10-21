"""Ubah objek model database Swee Lee Music Store jadi dictionary JSON yang rapi untuk Frontend."""


def branch_to_dict(b):
    if not b:
        return None
    return {
        "id": b.id,
        "name": b.name,
        "branch_type": getattr(b, "branch_type", "showroom"),
        "city": b.city,
        "address": b.address,
        "phone": b.phone,
        "map_url": b.map_url,
        "is_active": b.is_active,
    }


def brand_to_dict(br):
    if not br:
        return None
    return {
        "id": br.id,
        "name": br.name,
        "slug": br.slug,
        "country": br.country,
        "description": br.description,
        "logo_url": br.logo_url,
        "website": br.website,
        "contact_email": br.contact_email,
        "contact_phone": br.contact_phone,
        "is_active": br.is_active,
    }


def variant_to_dict(v):
    if not v:
        return None
    stock = getattr(v, "stock", getattr(v, "remaining_quota", 0))
    return {
        "id": v.id,
        "product_id": getattr(v, "product_id", getattr(v, "event_id", None)),
        "sku_code": getattr(v, "sku_code", f"SKU-{v.id}"),
        "variant_name": getattr(v, "variant_name", getattr(v, "tier_name", "Standard")),
        "tier_name": getattr(v, "variant_name", getattr(v, "tier_name", "Standard")),
        "color_finish": getattr(v, "color_finish", getattr(v, "variant_name", "Standard")),
        "cost_price": getattr(v, "cost_price", 0),
        "price": v.price,
        "stock": stock,
        "quota": stock,
        "remaining_quota": stock,
        "tickets_sold": 0,
        "weight_kg": float(getattr(v, "weight_kg", 1.0) or 1.0),
        "is_active": getattr(v, "is_active", True),
    }


def product_to_dict(p, detail=False):
    if not p:
        return None

    # Get variants safely
    raw_variants = p.variants if hasattr(p, "variants") else getattr(p, "tiers", [])
    if callable(raw_variants):
        raw_variants = raw_variants.all()
    variants_list = [variant_to_dict(v) for v in (raw_variants or [])]

    min_price = min([v["price"] for v in variants_list] or [p.price]) if variants_list else p.price
    total_stock = sum(v["stock"] for v in variants_list) if variants_list else getattr(p, "remaining_quota", 0)

    brand_obj = getattr(p, "brand", getattr(p, "brand_supplier", None))
    brand_name = brand_obj.name if brand_obj else getattr(p, "organizer", "Official Store")

    branch_obj = getattr(p, "branch", getattr(p, "venue_rel", None))
    location_name = branch_obj.name if branch_obj else getattr(p, "location", "Showroom Swee Lee")
    city_name = branch_obj.city if branch_obj else getattr(p, "city", "Jakarta")

    data = {
        "id": p.id,
        "name": p.name,
        "sku_prefix": getattr(p, "sku_prefix", None),
        "instrument_type": getattr(p, "instrument_type", "Electric Guitar"),
        "category": p.category or "Guitars",
        "warranty_months": getattr(p, "warranty_months", 12),
        "brand_id": getattr(p, "brand_id", getattr(p, "organizer_id", None)),
        "brand": brand_to_dict(brand_obj),
        "organizer": brand_name,
        "branch_id": getattr(p, "branch_id", getattr(p, "venue_id", None)),
        "branch": branch_to_dict(branch_obj),
        "venue": branch_to_dict(branch_obj),
        "location": location_name,
        "city": city_name,
        "image_url": p.image_url,
        "price": p.price,
        "min_price": min_price,
        "quota": total_stock,
        "stock": total_stock,
        "remaining_quota": total_stock,
        "status": p.status,
        "approval_status": getattr(p, "approval_status", p.status),
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "variants": variants_list,
        "tiers": variants_list,  # compatibility fallback for frontend
    }

    if detail:
        data.update(
            {
                "description": p.description,
                "specifications": getattr(p, "specifications", None),
                "created_by": p.created_by,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
        )
    return data


def order_to_dict(o, with_product=True):
    if not o:
        return None

    prod_obj = getattr(o, "product", getattr(o, "event", None))
    var_obj = getattr(o, "variant", getattr(o, "tier", None))
    branch_obj = getattr(o, "pickup_branch", getattr(o, "pickup_venue", None))
    staff_obj = getattr(o, "handled_by_staff", None)

    data = {
        "id": o.id,
        "invoice_code": o.invoice_code,
        "customer_id": getattr(o, "customer_id", getattr(o, "user_id", None)),
        "product_id": getattr(o, "product_id", getattr(o, "event_id", None)),
        "variant_id": getattr(o, "variant_id", getattr(o, "tier_id", None)),
        "variant": variant_to_dict(var_obj),
        "ticket_tier": variant_to_dict(var_obj),
        "quantity": o.quantity,
        "unit_price": getattr(o, "unit_price", 0),
        "total_price": o.total_price,
        "fulfillment_method": getattr(o, "fulfillment_method", "delivery"),
        "pickup_branch_id": getattr(o, "pickup_branch_id", None),
        "pickup_branch": branch_to_dict(branch_obj),
        "pickup_venue": branch_to_dict(branch_obj),
        "pickup_code": getattr(o, "pickup_code", getattr(o, "ticket_code", None)),
        "ticket_code": getattr(o, "pickup_code", getattr(o, "ticket_code", None)),
        "pickup_status": getattr(o, "pickup_status", "pending"),
        "ticket_status": getattr(o, "ticket_status", "valid"),
        "shipping_address": getattr(o, "shipping_address", None),
        "shipping_courier": getattr(o, "shipping_courier", "JNE Trucking"),
        "shipping_cost": getattr(o, "shipping_cost", 0),
        "tracking_number": getattr(o, "tracking_number", None),
        "payment_method": o.payment_method,
        "payment_status": getattr(o, "payment_status", getattr(o, "status", "paid")),
        "status": getattr(o, "payment_status", getattr(o, "status", "paid")),
        "order_status": getattr(o, "order_status", "processing"),
        "buyer_name": o.buyer_name,
        "buyer_email": o.buyer_email,
        "buyer_phone": o.buyer_phone,
        "handled_by_staff_id": getattr(o, "handled_by_staff_id", None),
        "handled_by_staff": staff_obj.name if staff_obj else None,
        "paid_at": o.paid_at.isoformat() if getattr(o, "paid_at", None) else None,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }

    if with_product and prod_obj:
        data["product"] = product_to_dict(prod_obj, detail=False)
        data["event"] = data["product"]

    return data


def purchase_order_to_dict(po):
    if not po:
        return None
    return {
        "id": po.id,
        "po_number": po.po_number,
        "supplier_id": po.supplier_id,
        "supplier": brand_to_dict(po.supplier),
        "destination_branch_id": po.destination_branch_id,
        "destination_branch": branch_to_dict(po.destination_branch),
        "product_id": po.product_id,
        "product": product_to_dict(po.product, detail=False) if po.product else None,
        "variant_id": po.variant_id,
        "variant": variant_to_dict(po.variant) if po.variant else None,
        "quantity": po.quantity,
        "unit_cost": po.unit_cost,
        "total_cost": po.total_cost,
        "status": po.status,
        "requested_by": po.requested_by,
        "requester_name": po.requester.name if po.requester else None,
        "approved_by": po.approved_by,
        "approver_name": po.approver.name if po.approver else None,
        "paid_by": po.paid_by,
        "payer_name": po.payer.name if po.payer else None,
        "received_by": po.received_by,
        "receiver_name": po.receiver.name if po.receiver else None,
        "notes": po.notes,
        "created_at": po.created_at.isoformat() if po.created_at else None,
        "updated_at": po.updated_at.isoformat() if po.updated_at else None,
    }


def inventory_log_to_dict(log):
    if not log:
        return None
    return {
        "id": log.id,
        "variant_id": log.variant_id,
        "variant_name": log.variant.variant_name if log.variant else "",
        "sku_code": log.variant.sku_code if log.variant else "",
        "product_name": log.variant.product_rel.name if (log.variant and log.variant.product_rel) else "",
        "branch_id": log.branch_id,
        "branch_name": log.branch.name if log.branch else "Pusat",
        "change_type": log.change_type,
        "quantity_change": log.quantity_change,
        "stock_before": log.stock_before,
        "stock_after": log.stock_after,
        "serial_number": log.serial_number,
        "notes": log.notes,
        "reference_id": log.reference_id,
        "logged_by": log.logged_by,
        "operator_name": log.staff.name if log.staff else "System",
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


def user_to_dict(u):
    if not u:
        return None
    return {
        "id": u.id,
        "name": u.name,
        "username": u.username,
        "email": u.email,
        "phone": u.phone,
        "role": getattr(u, "role", "user"),
        "branch_id": getattr(u, "branch_id", None),
        "address": getattr(u, "address", None),
        "is_active": bool(u.is_active),
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


# Compatibility Aliases
venue_to_dict = branch_to_dict
organizer_to_dict = brand_to_dict
tier_to_dict = variant_to_dict
event_to_dict = product_to_dict
transaction_to_dict = order_to_dict

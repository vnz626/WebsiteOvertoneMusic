from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models.models import Event, TicketTier, SavedEvent
from ..security import current_actor, roles_required, ROLE_CUSTOMER

bp = Blueprint('saved_tiers', __name__)

@bp.get('/events/<int:event_id>/tiers')
def tiers(event_id):
    rows = TicketTier.query.filter_by(event_id=event_id).all()
    return jsonify({'data':[{
        'id': x.id,
        'tier_name': x.tier_name,
        'price': x.price,
        'quota': x.quota,
        'tickets_sold': x.tickets_sold,
        'remaining_quota': x.remaining_quota
    } for x in rows]})

@bp.post('/events/<int:event_id>/save')
@roles_required(ROLE_CUSTOMER)
def save_event(event_id):
    _, user = current_actor()
    if SavedEvent.query.filter_by(user_id=user.id,event_id=event_id).first():
        return jsonify({'message':'Event sudah tersimpan'}),400
    db.session.add(SavedEvent(user_id=user.id,event_id=event_id)); db.session.commit()
    return jsonify({'message':'Event disimpan'})

@bp.delete('/events/<int:event_id>/save')
@roles_required(ROLE_CUSTOMER)
def unsave_event(event_id):
    _, user=current_actor()
    row=SavedEvent.query.filter_by(user_id=user.id,event_id=event_id).first()
    if row: db.session.delete(row); db.session.commit()
    return jsonify({'message':'Event dihapus dari simpanan'})

@bp.get('/users/saved-events')
@roles_required(ROLE_CUSTOMER)
def saved_list():
    _, user=current_actor()
    rows=SavedEvent.query.filter_by(user_id=user.id).all()
    return jsonify({'data':[{'id':x.event.id,'name':x.event.name,'image_url':x.event.image_url} for x in rows]})


@bp.get('/promoter/events/<int:event_id>/tier-sales')
@roles_required('admin', 'staff')
def tier_sales(event_id):
    tiers = TicketTier.query.filter_by(event_id=event_id).all()
    data = []
    for tier in tiers:
        data.append({
            "id": tier.id,
            "tier_name": tier.tier_name,
            "price": tier.price,
            "quota": tier.quota,
            "sold": tier.tickets_sold,
            "remaining_quota": tier.remaining_quota
        })
    return jsonify({"data": data})

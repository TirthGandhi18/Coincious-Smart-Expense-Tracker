# app/routes/group_routes.py
from flask import Blueprint, request, jsonify, g
from app.auth.decorators import auth_required
from app.services import group_service

# Note: The url_prefix='/groups' is set in app/__init__.py
# So '/' here actually means '/api/groups/'
group_bp = Blueprint('group_api', __name__)

@group_bp.route('/', methods=['GET'])
@auth_required
def get_groups():
    user_id = g.user.id
    response, status_code = group_service.get_user_groups(user_id)
    return jsonify(response), status_code

@group_bp.route('/', methods=['POST'])
@auth_required
def create_group():
    user_id = g.user.id
    data = request.get_json()
    group_name = data.get('name')
    response, status_code = group_service.create_new_group(user_id, group_name)
    return jsonify(response), status_code

@group_bp.route('/<group_id>/members', methods=['GET'])
@auth_required
def get_group_members(group_id):
    user_id = g.user.id
    response, status_code = group_service.get_group_members(group_id, user_id)
    return jsonify(response), status_code

@group_bp.route('/<group_id>', methods=['GET'])
@auth_required
def get_group_detail(group_id):
    user_id = g.user.id
    response, status_code = group_service.get_group_detail(group_id, user_id)
    return jsonify(response), status_code

@group_bp.route('/<group_id>', methods=['DELETE'])
@auth_required
def delete_group(group_id):
    user_id = g.user.id
    response, status_code = group_service.delete_group(group_id, user_id)
    return jsonify(response), status_code

@group_bp.route('/<group_id>/add-member', methods=['POST'])
@auth_required
def add_group_member(group_id):
    requesting_user = g.user
    data = request.get_json()
    response, status_code = group_service.add_group_member(group_id, requesting_user, data)
    return jsonify(response), status_code

@group_bp.route('/<group_id>/balances', methods=['GET'])
@auth_required
def get_group_balances(group_id):
    user_id = g.user.id
    response, status_code = group_service.get_group_balances(group_id, user_id)
    return jsonify(response), status_code

@group_bp.route('/<group_id>/settle', methods=['POST'])
@auth_required
def settle_up(group_id):
    user_id = g.user.id
    data = request.get_json()
    response, status_code = group_service.settle_group_balance(group_id, user_id, data)
    return jsonify(response), status_code
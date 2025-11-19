from flask import Blueprint, request, jsonify, g
from app.auth.decorators import auth_required
from app.services import expense_service
from datetime import datetime
from app.extensions import supabase

exp_bp = Blueprint('expense_api', __name__)

@exp_bp.route('/expenses', methods=['GET'])
@auth_required
def get_expenses():
    group_id = request.args.get('group_id')
    if not group_id:
        return jsonify({'error': 'Missing group_id parameter'}), 400
    
    user_id = g.user.id
    response, status_code = expense_service.get_group_expenses(group_id, user_id)
    return jsonify(response), status_code

@exp_bp.route("/expense_monthly_donut", methods=["POST"])
@auth_required
def api_expense_monthly_donut():
    user_id = g.user.id
    data = request.get_json(silent=True) or {}
    period = data.get("period")
    
    response, status_code = expense_service.get_monthly_donut_data(user_id, period)
    return jsonify(response), status_code

@exp_bp.route('/current-month-total', methods=['GET'])
@auth_required
def get_current_month_total():
    try:
        user_id = g.user.id
        today = datetime.today()
        start_of_month = today.replace(day=1).strftime('%Y-%m-%d')
        response = supabase.table('expenses')\
            .select('amount')\
            .eq('payer_id', user_id)\
            .gte('date', start_of_month)\
            .execute()
        expenses = response.data
        total_amount = sum(float(item['amount']) for item in expenses)

        return jsonify({'total': total_amount}), 200

    except Exception as e:
        print(f"Error calculating monthly total: {e}")
        return jsonify({'error': str(e)}), 500
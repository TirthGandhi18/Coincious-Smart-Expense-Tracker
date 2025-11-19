from flask import Blueprint, request, jsonify, g
from app.auth.decorators import auth_required
from app.services.categorizer_service import categorizer
import json

cat_bp = Blueprint('categorizer_api', __name__)

@cat_bp.route('/categorize', methods=['POST'])
@auth_required
def api_categorize():
    user = g.user
    
    form_data = request.form
    description = form_data.get('description', '').strip()

    if not description:
        return jsonify({'error': 'Description cannot be empty.'}), 400
    
    manual_category = form_data.get('category', '').strip()
    
    if manual_category:
        categorizer.learn_new_rule(user.id, description, manual_category)
        return jsonify({'status': 'learning_successful', 'learned': {description: manual_category}})
    else:
        result = categorizer.find_category(user.id, description)
        return jsonify(result)


@cat_bp.route('/parse-bill', methods=['POST'])
@auth_required
def api_parse_bill():

    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided. Use form-data with key "image".'}), 400

    image_file = request.files['image']
    if image_file.filename == '':
        return jsonify({'error': 'Empty filename for uploaded image.'}), 400

    try:
        image_bytes = image_file.read()
        mime_type = image_file.mimetype or 'image/jpeg'

        parsed = categorizer.parse_bill_image(image_bytes, mime_type)
        
        return jsonify({'parsed': parsed})
    except json.JSONDecodeError:
        return jsonify({'error': 'Model returned non-JSON or invalid JSON response.'}), 502
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to parse bill: {str(e)}'}), 500
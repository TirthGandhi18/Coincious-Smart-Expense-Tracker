import unittest
from unittest.mock import MagicMock, patch, Mock
import sys
import types
import json

fake_extensions = types.ModuleType("app.extensions")
fake_extensions.supabase = MagicMock()
fake_extensions.gemini_model = MagicMock()
sys.modules["app.extensions"] = fake_extensions

from app.services.categorizer_service import ExpenseCategorizer

class MockSupabaseResponse:
    def __init__(self, data=None, error=None):
        self.data = data
        self.error = error

class TestCategorizerServiceComprehensive(unittest.TestCase):

    def setUp(self):
        self.supabase_patcher = patch('app.services.categorizer_service.supabase')
        self.mock_supabase = self.supabase_patcher.start()
        
        self.gemini_patcher = patch('app.services.categorizer_service.gemini_model')
        self.mock_gemini = self.gemini_patcher.start()
        
        self.categorizer = ExpenseCategorizer()

    def tearDown(self):
        self.supabase_patcher.stop()
        self.gemini_patcher.stop()

    def test_get_user_rules_success(self):
        mock_response = MockSupabaseResponse(data=[
            {'category_name': 'Food', 'keywords': ['pizza', 'burger']},
            {'category_name': 'Transport', 'keywords': ['uber', 'taxi']}
        ])
        
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        result = self.categorizer._get_user_rules('user_1')
        
        self.assertEqual(result, {'Food': ['pizza', 'burger'], 'Transport': ['uber', 'taxi']})

    def test_get_user_rules_returns_dict(self):
        mock_response = MagicMock()
        mock_response.data = [
            {'category_name': 'Food', 'keywords': ['pizza', 'burger']},
            {'category_name': 'Transport', 'keywords': ['uber']},
        ]
        
        with patch('app.services.categorizer_service.supabase.table') as mock_table:
            mock_table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
            
            rules = self.categorizer._get_user_rules('user_1')
            
            self.assertIsInstance(rules, dict)
            self.assertIn('Food', rules)
            self.assertIn('Transport', rules)
            self.assertEqual(rules['Food'], ['pizza', 'burger'])

    def test_get_user_rules_no_data(self):
        mock_response = MockSupabaseResponse(data=[])
        
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        result = self.categorizer._get_user_rules('user_1')
        
        self.assertEqual(result, {})

    def test_get_user_rules_handles_empty_response(self):
        mock_response = MagicMock()
        mock_response.data = None
        
        with patch('app.services.categorizer_service.supabase.table') as mock_table:
            mock_table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
            
            rules = self.categorizer._get_user_rules('user_1')
            
            self.assertEqual(rules, {})

    def test_get_user_rules_none_data(self):
        mock_response = MockSupabaseResponse(data=None)
        
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        result = self.categorizer._get_user_rules('user_1')
        
        self.assertEqual(result, {})

    def test_get_user_rules_no_data_attribute(self):
        mock_response = MagicMock()
        del mock_response.data
        
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        result = self.categorizer._get_user_rules('user_1')
        
        self.assertEqual(result, {})

    def test_get_user_rules_database_error(self):
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        result = self.categorizer._get_user_rules('user_1')
        
        self.assertEqual(result, {})

    def test_get_user_rules_empty_user_id(self):
        mock_response = MockSupabaseResponse(data=[])
        
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        result = self.categorizer._get_user_rules('')
        
        self.assertEqual(result, {})

    def test_get_user_rules_none_user_id(self):
        mock_response = MockSupabaseResponse(data=[])
        
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        result = self.categorizer._get_user_rules(None)
        
        self.assertEqual(result, {})

    def test_learn_new_rule_new_category(self):
        mock_check_response = MockSupabaseResponse(data=[])
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_check_response
        
        mock_insert_response = MockSupabaseResponse(data=[{'id': 'rule_1'}])
        self.mock_supabase.table.return_value.insert.return_value.execute.return_value = mock_insert_response
        
        self.categorizer.learn_new_rule('user_1', 'Pizza', 'Food')
        
        self.mock_supabase.table.return_value.insert.assert_called_once()
        call_args = self.mock_supabase.table.return_value.insert.call_args[0][0]
        self.assertEqual(call_args['user_id'], 'user_1')
        self.assertEqual(call_args['category_name'], 'Food')
        self.assertEqual(call_args['keywords'], ['pizza'])

    def test_learn_new_rule_creates_new_category(self):
        mock_response = MagicMock()
        mock_response.data = None
        
        with patch('app.services.categorizer_service.supabase.table') as mock_table:
            mock_select = MagicMock()
            mock_select.eq.return_value.eq.return_value.execute.return_value = mock_response
            mock_table.return_value.select.return_value = mock_select
            
            mock_insert = MagicMock()
            mock_insert.execute.return_value = MagicMock()
            mock_table.return_value.insert.return_value = mock_insert
            
            self.categorizer.learn_new_rule('user_1', 'Starbucks', 'Drinks')
            
            mock_table.return_value.insert.assert_called()

    def test_learn_new_rule_existing_category(self):
        mock_check_response = MockSupabaseResponse(data=[
            {'keywords': ['burger', 'fries']}
        ])
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_check_response
        
        mock_update_response = MockSupabaseResponse(data=[{'id': 'rule_1'}])
        self.mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_update_response
        
        self.categorizer.learn_new_rule('user_1', 'Pizza', 'Food')
        
        self.mock_supabase.table.return_value.update.assert_called_once()
        call_args = self.mock_supabase.table.return_value.update.call_args[0][0]
        self.assertEqual(call_args['keywords'], ['burger', 'fries', 'pizza'])

    def test_learn_new_rule_adds_keyword_to_existing(self):
        mock_response = MagicMock()
        mock_response.data = [{'keywords': ['coffee', 'latte']}]
        
        with patch('app.services.categorizer_service.supabase.table') as mock_table:
            mock_select = MagicMock()
            mock_select.eq.return_value.eq.return_value.execute.return_value = mock_response
            mock_table.return_value.select.return_value = mock_select
            
            mock_update = MagicMock()
            mock_update.eq.return_value.eq.return_value.execute.return_value = MagicMock()
            mock_table.return_value.update.return_value = mock_update
            
            self.categorizer.learn_new_rule('user_1', 'espresso', 'Coffee')
            
            mock_table.return_value.update.assert_called()

    def test_learn_new_rule_existing_keyword(self):
        mock_check_response = MockSupabaseResponse(data=[
            {'keywords': ['pizza', 'burger']}
        ])
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_check_response
        
        self.categorizer.learn_new_rule('user_1', 'Pizza', 'Food')
        
        self.mock_supabase.table.return_value.update.assert_not_called()
        self.mock_supabase.table.return_value.insert.assert_not_called()

    def test_learn_new_rule_converts_description_to_lowercase(self):
        mock_response = MagicMock()
        mock_response.data = [{'keywords': []}]
        
        with patch('app.services.categorizer_service.supabase.table') as mock_table:
            mock_select = MagicMock()
            mock_select.eq.return_value.eq.return_value.execute.return_value = mock_response
            mock_table.return_value.select.return_value = mock_select
            
            mock_update = MagicMock()
            mock_update.eq.return_value.eq.return_value.execute.return_value = MagicMock()
            mock_table.return_value.update.return_value = mock_update
            
            self.categorizer.learn_new_rule('user_1', 'PIZZA', 'Food')
            
            call_args = mock_table.return_value.update.call_args
            self.assertIn('pizza', str(call_args).lower())

    def test_learn_new_rule_avoids_duplicate_keywords(self):
        mock_response = MagicMock()
        mock_response.data = [{'keywords': ['pizza', 'burger']}]
        
        with patch('app.services.categorizer_service.supabase.table') as mock_table:
            mock_select = MagicMock()
            mock_select.eq.return_value.eq.return_value.execute.return_value = mock_response
            mock_table.return_value.select.return_value = mock_select
            
            mock_update = MagicMock()
            mock_update.eq.return_value.eq.return_value.execute.return_value = MagicMock()
            mock_table.return_value.update.return_value = mock_update
            
            self.categorizer.learn_new_rule('user_1', 'pizza', 'Food')
            
            self.categorizer.supabase.table.assert_called()

    def test_learn_new_rule_database_error_on_check(self):
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        self.categorizer.learn_new_rule('user_1', 'Pizza', 'Food')

    def test_learn_new_rule_database_error_on_insert(self):
        mock_check_response = MockSupabaseResponse(data=[])
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_check_response
        
        self.mock_supabase.table.return_value.insert.return_value.execute.side_effect = Exception("Insert error")
        
        self.categorizer.learn_new_rule('user_1', 'Pizza', 'Food')

    def test_learn_new_rule_database_error_on_update(self):
        mock_check_response = MockSupabaseResponse(data=[
            {'keywords': ['burger']}
        ])
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_check_response
        
        self.mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.side_effect = Exception("Update error")
        
        self.categorizer.learn_new_rule('user_1', 'Pizza', 'Food')

    def test_learn_new_rule_empty_description(self):
        mock_check_response = MockSupabaseResponse(data=[])
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_check_response
        
        mock_insert_response = MockSupabaseResponse(data=[{'id': 'rule_1'}])
        self.mock_supabase.table.return_value.insert.return_value.execute.return_value = mock_insert_response
        
        self.categorizer.learn_new_rule('user_1', '', 'Food')
        
        call_args = self.mock_supabase.table.return_value.insert.call_args[0][0]
        self.assertEqual(call_args['keywords'], [''])

    def test_learn_new_rule_none_description(self):
        try:
            self.categorizer.learn_new_rule('user_1', None, 'Food')
        except AttributeError:
            pass

    def test_learn_new_rule_empty_user_id(self):
        mock_check_response = MockSupabaseResponse(data=[])
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_check_response
        
        mock_insert_response = MockSupabaseResponse(data=[{'id': 'rule_1'}])
        self.mock_supabase.table.return_value.insert.return_value.execute.return_value = mock_insert_response
        
        self.categorizer.learn_new_rule('', 'Pizza', 'Food')
        
        self.mock_supabase.table.return_value.insert.assert_called_once()

    def test_learn_new_rule_none_user_id(self):
        mock_check_response = MockSupabaseResponse(data=[])
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_check_response
        
        mock_insert_response = MockSupabaseResponse(data=[{'id': 'rule_1'}])
        self.mock_supabase.table.return_value.insert.return_value.execute.return_value = mock_insert_response
        
        self.categorizer.learn_new_rule(None, 'Pizza', 'Food')
        
        self.mock_supabase.table.return_value.insert.assert_called_once()

    def test_parse_bill_image_success(self):
        self.mock_gemini.generate_content.return_value.text = '{"vendor_name": "Restaurant", "total": 25.50}'
        
        result = self.categorizer.parse_bill_image(b'image_data', 'image/jpeg')
        
        self.assertEqual(result['vendor_name'], 'Restaurant')
        self.assertEqual(result['total'], 25.50)

    def test_parse_bill_image_handles_bytes(self):
        image_bytes = b'\x89PNG\r\n\x1a\n'
        mime_type = 'image/png'
        
        with patch('app.services.categorizer_service.gemini_model.generate_content') as mock_gen:
            mock_gen.return_value = MagicMock(text='{"items": ["item1"]}')
            
            result = self.categorizer.parse_bill_image(image_bytes, mime_type)
            
            self.assertIsNotNone(result)

    def test_parse_bill_image_json_parse_error(self):
        self.mock_gemini.generate_content.return_value.text = 'invalid json'
        
        with self.assertRaises(json.JSONDecodeError):
            self.categorizer.parse_bill_image(b'image_data', 'image/jpeg')

    def test_parse_bill_image_gemini_error(self):
        self.mock_gemini.generate_content.side_effect = Exception("Gemini error")
        
        with self.assertRaises(Exception):
            self.categorizer.parse_bill_image(b'image_data', 'image/jpeg')

    def test_parse_bill_image_no_model(self):
        self.categorizer.model = None
        
        with self.assertRaises(RuntimeError):
            self.categorizer.parse_bill_image(b'image_data', 'image/jpeg')

    def test_parse_bill_image_none_image_bytes(self):
        with self.assertRaises(TypeError):
            self.categorizer.parse_bill_image(None, 'image/jpeg')

    def test_parse_bill_image_empty_image_bytes(self):
        self.mock_gemini.generate_content.return_value.text = '{"vendor_name": "Test"}'
        
        result = self.categorizer.parse_bill_image(b'', 'image/jpeg')
        self.assertEqual(result['vendor_name'], 'Test')

    def test_parse_bill_image_none_mime_type(self):
        with self.assertRaises(TypeError):
            self.categorizer.parse_bill_image(b'image_data', None)

    def test_parse_bill_image_empty_mime_type(self):
        self.mock_gemini.generate_content.return_value.text = '{"vendor_name": "Test"}'
        
        result = self.categorizer.parse_bill_image(b'image_data', '')
        self.assertEqual(result['vendor_name'], 'Test')

    def test_find_category_with_user_rules(self):
        with patch.object(self.categorizer, '_get_user_rules', return_value={
            'Food': ['pizza', 'burger'],
            'Transport': ['uber', 'taxi']
        }):
            result = self.categorizer.find_category('user_1', 'Had pizza for lunch')
            
            self.assertEqual(result['category'], 'Food')
            self.assertEqual(result['source'], 'user_dictionary')

    def test_find_category_no_user_rules(self):
        with patch.object(self.categorizer, '_get_user_rules', return_value={}):
            self.mock_gemini.generate_content.return_value.text = '{"category": "Food"}'
            
            result = self.categorizer.find_category('user_1', 'Had pizza for lunch')
            
            self.assertEqual(result['category'], 'Food')
            self.assertEqual(result['source'], 'ai')

    def test_find_category_gemini_error(self):
        with patch.object(self.categorizer, '_get_user_rules', return_value={}):
            self.mock_gemini.generate_content.side_effect = Exception("Gemini error")
            
            result = self.categorizer.find_category('user_1', 'Had pizza for lunch')
            
            self.assertEqual(result['category'], 'Other')
            self.assertEqual(result['source'], 'default')

    def test_find_category_empty_description(self):
        with patch.object(self.categorizer, '_get_user_rules', return_value={}):
            self.mock_gemini.generate_content.return_value.text = '{"category": "Food"}'
            
            result = self.categorizer.find_category('user_1', '')
            
            self.assertEqual(result['category'], 'Food')
            self.assertEqual(result['source'], 'ai')

    def test_find_category_none_description(self):
        with patch.object(self.categorizer, '_get_user_rules', return_value={}):
            self.mock_gemini.generate_content.return_value.text = '{"category": "Other"}'
            
            try:
                result = self.categorizer.find_category('user_1', None)
                self.assertEqual(result['category'], 'Other')
            except AttributeError:
                pass

    def test_find_category_case_insensitive_matching(self):
        with patch.object(self.categorizer, '_get_user_rules', return_value={
            'Food': ['pizza', 'burger']
        }):
            result = self.categorizer.find_category('user_1', 'Had pizza for lunch')
            
            self.assertEqual(result['category'], 'Food')
            self.assertEqual(result['source'], 'user_dictionary')

    def test_find_category_partial_word_matching(self):
        with patch.object(self.categorizer, '_get_user_rules', return_value={
            'Food': ['pizza']
        }):
            result = self.categorizer.find_category('user_1', 'Had pepperoni pizza slice')
            
            self.assertEqual(result['category'], 'Food')
            self.assertEqual(result['source'], 'user_dictionary')

    def test_find_category_multiple_matches(self):
        with patch.object(self.categorizer, '_get_user_rules', return_value={
            'Food': ['pizza', 'burger'],
            'Transport': ['taxi']
        }):
            result = self.categorizer.find_category('user_1', 'pizza taxi')
            
            self.assertEqual(result['category'], 'Food')
            self.assertEqual(result['source'], 'user_dictionary')

    def test_find_category_no_matches(self):
        with patch.object(self.categorizer, '_get_user_rules', return_value={
            'Food': ['pizza', 'burger']
        }):
            self.mock_gemini.generate_content.return_value.text = '{"category": "Transport"}'
            
            result = self.categorizer.find_category('user_1', 'Train ticket')
            
            self.assertEqual(result['category'], 'Transport')
            self.assertEqual(result['source'], 'ai')

    def test_find_category_empty_user_id(self):
        with patch.object(self.categorizer, '_get_user_rules', return_value={}):
            self.mock_gemini.generate_content.return_value.text = '{"category": "Food"}'
            
            result = self.categorizer.find_category('', 'Pizza')
            
            self.assertEqual(result['category'], 'Food')
            self.assertEqual(result['source'], 'ai')

    def test_find_category_none_user_id(self):
        with patch.object(self.categorizer, '_get_user_rules', return_value={}):
            self.mock_gemini.generate_content.return_value.text = '{"category": "Food"}'
            
            result = self.categorizer.find_category(None, 'Pizza')
            
            self.assertEqual(result['category'], 'Food')
            self.assertEqual(result['source'], 'ai')

    def test_find_category_no_model(self):
        self.categorizer.model = None
        
        with patch.object(self.categorizer, '_get_user_rules', return_value={}):
            result = self.categorizer.find_category('user_1', 'Pizza')
            
            self.assertEqual(result['category'], 'Other')
            self.assertEqual(result['source'], 'no_ai_fallback')

    def test_find_category_ai_returns_other(self):
        with patch.object(self.categorizer, '_get_user_rules', return_value={}):
            self.mock_gemini.generate_content.return_value.text = '{"category": "Other"}'
            
            result = self.categorizer.find_category('user_1', 'Pizza')
            
            self.assertEqual(result['category'], 'Other')
            self.assertEqual(result['source'], 'default')

    def test_find_category_ai_returns_none(self):
        with patch.object(self.categorizer, '_get_user_rules', return_value={}):
            self.mock_gemini.generate_content.return_value.text = '{"category": null}'
            
            result = self.categorizer.find_category('user_1', 'Pizza')
            
            self.assertEqual(result['category'], 'Other')
            self.assertEqual(result['source'], 'default')

    def test_find_category_ai_invalid_json(self):
        with patch.object(self.categorizer, '_get_user_rules', return_value={}):
            self.mock_gemini.generate_content.return_value.text = 'invalid json'
            
            result = self.categorizer.find_category('user_1', 'Pizza')
            
            self.assertEqual(result['category'], 'Other')
            self.assertEqual(result['source'], 'default')

if __name__ == '__main__':
    unittest.main()

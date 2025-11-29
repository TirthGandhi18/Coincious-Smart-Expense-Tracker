import sys
import types

fake_extensions = types.ModuleType("app.extensions")
fake_extensions.supabase = __import__('unittest.mock', fromlist=['MagicMock']).MagicMock()
sys.modules["app.extensions"] = fake_extensions

fake_config = types.ModuleType("app.config")
fake_config.Config = __import__('unittest.mock', fromlist=['MagicMock']).MagicMock(GROQ_API_KEY='test-key')
sys.modules["app.config"] = fake_config

fake_groq = __import__('unittest.mock', fromlist=['MagicMock']).MagicMock()
sys.modules["groq"] = fake_groq
sys.modules["groq.Groq"] = fake_groq

import unittest
from unittest.mock import MagicMock, patch, call
from datetime import datetime, timedelta
import json

from app.services.ai_service import get_financial_context, chat_with_groq


class TestAIServiceMutations(unittest.TestCase):
    def setUp(self):
        self.mock_supabase = MagicMock()
        self.patcher_supabase = patch('app.services.ai_service.supabase', self.mock_supabase)
        self.mock_groq = MagicMock()
        self.patcher_groq = patch('app.services.ai_service.client', self.mock_groq)
        self.patcher_cache = patch('app.services.ai_service.context_cache', {})
        
        self.patcher_supabase.start()
        self.patcher_groq.start()
        self.mock_cache = self.patcher_cache.start()

    def tearDown(self):

        self.patcher_supabase.stop()
        self.patcher_groq.stop()
        self.patcher_cache.stop()

    def test_cache_hit(self):

        with patch('app.services.ai_service.context_cache', {'user_1': 'cached_data'}):
            result = get_financial_context('user_1')
            self.assertEqual(result, 'cached_data')
            self.mock_supabase.table.assert_not_called()

    def test_no_expenses(self):

        expenses_resp = MagicMock()
        expenses_resp.data = None
        
        groups_resp = MagicMock()
        groups_resp.data = None
        
        budget_resp = MagicMock()
        budget_resp.data = None
        
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = expenses_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = groups_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = budget_resp
        
        result = get_financial_context('user_1')
        data = json.loads(result)
        
        self.assertIsNotNone(data)
        self.assertEqual(data['recent_expenses'], [])
        self.assertEqual(data['group_balances'], [])
        self.assertIsNone(data['monthly_budget'])

    def test_no_groups(self):
        """Test with user having no groups"""
        expenses_resp = MagicMock()
        expenses_resp.data = [{'amount': 100, 'category': 'Food', 'description': 'lunch', 'created_at': datetime.now().isoformat(), 'group_id': None}]
        
        groups_resp = MagicMock()
        groups_resp.data = None
        
        budget_resp = MagicMock()
        budget_resp.data = None
        
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = expenses_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = groups_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = budget_resp
        
        result = get_financial_context('user_1')
        data = json.loads(result)
        
        self.assertEqual(len(data['recent_expenses']), 1)
        self.assertEqual(data['group_balances'], [])

    def test_group_with_zero_balance(self):
        """Test group with zero balance (should not be included)"""
        expenses_resp = MagicMock()
        expenses_resp.data = []
        
        groups_resp = MagicMock()
        groups_resp.data = [{'group_id': 'grp_1', 'groups': {'name': 'Friends'}}]
        
        budget_resp = MagicMock()
        budget_resp.data = None
        
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = expenses_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = groups_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = budget_resp
        
        with patch('app.services.ai_service.get_group_balances') as mock_balances:
            mock_balances.return_value = ({'balances': [{'user_id': 'user_1', 'balance': 0}]}, 200)
            result = get_financial_context('user_1')
            data = json.loads(result)
            
            self.assertEqual(data['group_balances'], [])

    def test_group_with_positive_balance(self):
        expenses_resp = MagicMock()
        expenses_resp.data = []
        
        groups_resp = MagicMock()
        groups_resp.data = [{'group_id': 'grp_1', 'groups': {'name': 'Trip'}}]
        
        budget_resp = MagicMock()
        budget_resp.data = None
        
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = expenses_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = groups_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = budget_resp
        
        with patch('app.services.ai_service.get_group_balances') as mock_balances:
            mock_balances.return_value = ({'balances': [{'user_id': 'user_1', 'balance': 50.25}]}, 200)
            result = get_financial_context('user_1')
            data = json.loads(result)
            
            self.assertEqual(len(data['group_balances']), 1)
            self.assertEqual(data['group_balances'][0]['my_net_balance'], 50.25)

    def test_group_with_negative_balance(self):
        expenses_resp = MagicMock()
        expenses_resp.data = []
        
        groups_resp = MagicMock()
        groups_resp.data = [{'group_id': 'grp_1', 'groups': {'name': 'House'}}]
        
        budget_resp = MagicMock()
        budget_resp.data = None
        
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = expenses_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = groups_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = budget_resp
        
        with patch('app.services.ai_service.get_group_balances') as mock_balances:
            mock_balances.return_value = ({'balances': [{'user_id': 'user_1', 'balance': -100.50}]}, 200)
            result = get_financial_context('user_1')
            data = json.loads(result)
            
            self.assertEqual(len(data['group_balances']), 1)
            self.assertEqual(data['group_balances'][0]['my_net_balance'], -100.50)

    def test_multiple_groups(self):

        expenses_resp = MagicMock()
        expenses_resp.data = []
        
        groups_resp = MagicMock()
        groups_resp.data = [
            {'group_id': 'grp_1', 'groups': {'name': 'Friends'}},
            {'group_id': 'grp_2', 'groups': {'name': 'Work'}},
            {'group_id': 'grp_3', 'groups': {'name': 'Family'}}
        ]
        
        budget_resp = MagicMock()
        budget_resp.data = None
        
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = expenses_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = groups_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = budget_resp
        
        with patch('app.services.ai_service.get_group_balances') as mock_balances:
            mock_balances.side_effect = [
                ({'balances': [{'user_id': 'user_1', 'balance': 10}]}, 200),
                ({'balances': [{'user_id': 'user_1', 'balance': -20}]}, 200),
                ({'balances': [{'user_id': 'user_1', 'balance': 0}]}, 200)
            ]
            result = get_financial_context('user_1')
            data = json.loads(result)

            self.assertEqual(len(data['group_balances']), 2)

    def test_budget_set(self):

        expenses_resp = MagicMock()
        expenses_resp.data = []
        
        groups_resp = MagicMock()
        groups_resp.data = None
        
        budget_resp = MagicMock()
        budget_resp.data = {'amount_limit': 5000.00}
        
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = expenses_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = groups_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = budget_resp
        
        result = get_financial_context('user_1')
        data = json.loads(result)
        
        self.assertEqual(data['monthly_budget'], 5000.00)

    def test_budget_fetch_exception(self):

        expenses_resp = MagicMock()
        expenses_resp.data = []
        
        groups_resp = MagicMock()
        groups_resp.data = None
        
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = expenses_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = groups_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.side_effect = Exception('Budget fetch error')
        
        result = get_financial_context('user_1')
        data = json.loads(result)
        
        self.assertIsNone(data['monthly_budget'])

    def test_date_range_ninety_days(self):

        expenses_resp = MagicMock()
        expenses_resp.data = []
        
        groups_resp = MagicMock()
        groups_resp.data = None
        
        budget_resp = MagicMock()
        budget_resp.data = None
        
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = expenses_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = groups_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = budget_resp
        
        result = get_financial_context('user_1')
        data = json.loads(result)
        
        analysis_date = datetime.fromisoformat(data['analysis_date'])
        start_date = datetime.fromisoformat(data['data_start_date'])
        delta = analysis_date - start_date
        
        self.assertEqual(delta.days, 90)

    def test_group_without_name(self):
        expenses_resp = MagicMock()
        expenses_resp.data = []
        
        groups_resp = MagicMock()
        groups_resp.data = [{'group_id': 'grp_1', 'groups': {}}]  
        
        budget_resp = MagicMock()
        budget_resp.data = None
        
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = expenses_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = groups_resp
        self.mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = budget_resp
        
        with patch('app.services.ai_service.get_group_balances') as mock_balances:
            mock_balances.return_value = ({'balances': [{'user_id': 'user_1', 'balance': 50}]}, 200)
            result = get_financial_context('user_1')
            data = json.loads(result)
            
            self.assertEqual(data['group_balances'][0]['group_name'], 'Unknown Group')

    def test_exception_on_expenses_fetch(self):

        self.mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.side_effect = Exception('DB error')
        
        result = get_financial_context('user_1')
        
        self.assertEqual(result, '{}')


    def test_chat_simple_message(self):

        with patch('app.services.ai_service.get_financial_context') as mock_context:
            mock_context.return_value = '{"recent_expenses": []}'
            
            mock_response = MagicMock()
            mock_response.choices[0].message.content = 'Hello, how can I help?'
            self.mock_groq.chat.completions.create.return_value = mock_response
            
            result = chat_with_groq('user_1', 'Hello')
            
            self.assertEqual(result, 'Hello, how can I help?')
            self.mock_groq.chat.completions.create.assert_called_once()

    def test_chat_with_history(self):
        with patch('app.services.ai_service.get_financial_context') as mock_context:
            mock_context.return_value = '{"recent_expenses": []}'
            
            history = [
                {'role': 'user', 'content': 'What is my balance?'},
                {'role': 'assistant', 'content': 'You have $100'}
            ]
            
            mock_response = MagicMock()
            mock_response.choices[0].message.content = 'Your balance is $100'
            self.mock_groq.chat.completions.create.return_value = mock_response
            
            result = chat_with_groq('user_1', 'Tell me again', history=history)
            
            self.assertEqual(result, 'Your balance is $100')

    def test_chat_limits_history_to_5(self):

        with patch('app.services.ai_service.get_financial_context') as mock_context:
            mock_context.return_value = '{"recent_expenses": []}'
            
            history = [
                {'role': 'user', 'content': f'msg_{i}'} for i in range(10)
            ]
            
            mock_response = MagicMock()
            mock_response.choices[0].message.content = 'Response'
            self.mock_groq.chat.completions.create.return_value = mock_response
            
            chat_with_groq('user_1', 'New message', history=history)
            
            call_args = self.mock_groq.chat.completions.create.call_args
            messages = call_args[1]['messages']
            
            self.assertEqual(len(messages), 7)

    def test_chat_api_error(self):
        """Test error handling when Groq API fails"""
        with patch('app.services.ai_service.get_financial_context') as mock_context:
            mock_context.return_value = '{"recent_expenses": []}'
            
            self.mock_groq.chat.completions.create.side_effect = Exception('API error')
            
            result = chat_with_groq('user_1', 'Hello')
            
            self.assertIn('trouble connecting', result.lower())

    def test_chat_includes_financial_data(self):

        financial_data = '{"monthly_budget": 5000, "recent_expenses": []}'
        
        with patch('app.services.ai_service.get_financial_context') as mock_context:
            mock_context.return_value = financial_data
            
            mock_response = MagicMock()
            mock_response.choices[0].message.content = 'Response'
            self.mock_groq.chat.completions.create.return_value = mock_response
            
            chat_with_groq('user_1', 'What is my budget?')
  
            call_args = self.mock_groq.chat.completions.create.call_args
            messages = call_args[1]['messages']
            system_prompt = messages[0]['content']
            
            self.assertIn('5000', system_prompt)

    def test_chat_temperature_and_tokens(self):

        with patch('app.services.ai_service.get_financial_context') as mock_context:
            mock_context.return_value = '{}'
            
            mock_response = MagicMock()
            mock_response.choices[0].message.content = 'Response'
            self.mock_groq.chat.completions.create.return_value = mock_response
            
            chat_with_groq('user_1', 'Test')
            
            call_args = self.mock_groq.chat.completions.create.call_args
            
            self.assertEqual(call_args[1]['temperature'], 0.5)
            self.assertEqual(call_args[1]['max_tokens'], 800)
            self.assertEqual(call_args[1]['model'], 'llama-3.3-70b-versatile')

    def test_chat_empty_history(self):

        with patch('app.services.ai_service.get_financial_context') as mock_context:
            mock_context.return_value = '{}'
            
            mock_response = MagicMock()
            mock_response.choices[0].message.content = 'Response'
            self.mock_groq.chat.completions.create.return_value = mock_response
            
            result = chat_with_groq('user_1', 'Hello', history=[])
            
            self.assertEqual(result, 'Response')


if __name__ == '__main__':
    unittest.main()

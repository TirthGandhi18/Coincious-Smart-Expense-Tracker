"""
Comprehensive tests for expense service functions.
Merges tests from test_expense_service_edge_cases.py and test_expense_utils.py.
Targets: get_group_expenses, get_monthly_donut_data.
"""
import unittest
from unittest.mock import MagicMock, patch, Mock
from datetime import datetime, timezone
import sys
import types

# Stub app.extensions
fake_extensions = types.ModuleType("app.extensions")
fake_extensions.supabase = MagicMock()
fake_extensions.gemini_model = None
sys.modules["app.extensions"] = fake_extensions

from app.services.expense_service import get_group_expenses, get_monthly_donut_data

class MockSupabaseResponse:
    def __init__(self, data, error=None):
        self.data = data
        self.error = error

class TestExpenseServiceComprehensiveMerged(unittest.TestCase):

    def setUp(self):
        self.supabase_patcher = patch('app.services.expense_service.supabase')
        self.mock_supabase = self.supabase_patcher.start()

    def tearDown(self):
        self.supabase_patcher.stop()

    def test_get_group_expenses_not_member(self):
        """Mutation Target: Kills mutation that removes authorization check."""
        (self.mock_supabase.table.return_value
         .select.return_value
         .eq.return_value
         .eq.return_value
         .maybe_single.return_value
         .execute.return_value) = MockSupabaseResponse(data=None)

        result, status = get_group_expenses('group_1', 'user_1')
        
        self.assertEqual(status, 403)
        self.assertEqual(result, {'error': 'You are not a member of this group'})

    def test_get_group_expenses_db_error(self):
        """Mutation Target: Kills mutation that ignores DB errors."""
        table_mock = self.mock_supabase.table
        
        # Auth Success
        auth_query = table_mock.return_value.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute
        auth_query.return_value = MockSupabaseResponse(data={'user_id': 'user_1'})

        # Expenses Query Failure
        exp_query = table_mock.return_value.select.return_value.eq.return_value.order.return_value.execute
        exp_query.return_value = MockSupabaseResponse(data=None, error="DB Connection Failed")

        result, status = get_group_expenses('group_1', 'user_1')

        self.assertEqual(status, 500)
        self.assertIn('DB Connection Failed', result['error'])

    def test_get_group_expenses_success_flow(self):
        """Mutation Target: Kills logic errors in data formatting."""
        table_mock = self.mock_supabase.table
        
        # Auth Check
        (table_mock.return_value.select.return_value
         .eq.return_value.eq.return_value
         .maybe_single.return_value.execute.return_value) = MockSupabaseResponse(data={'user_id': 'u1'})

        # Expense Fetch
        mock_expense_data = [{
            'id': 101,
            'description': 'Lunch',
            'amount': 50,
            'total_amount': 100,
            'created_at': '2023-01-01T12:00:00',
            'payer_id': 'u2',
            'category': 'Food'
        }]
        (table_mock.return_value.select.return_value
         .eq.return_value.order.return_value
         .execute.return_value) = MockSupabaseResponse(data=mock_expense_data)

        # Payer User Fetch
        mock_user_response = MagicMock()
        mock_user_response.user.user_metadata = {'full_name': 'Alice'}
        self.mock_supabase.auth.admin.get_user_by_id.return_value = mock_user_response

        # Splits Fetch
        (table_mock.return_value.select.return_value
         .eq.return_value.execute.return_value) = MockSupabaseResponse(data=[{'user_id': 'u1'}, {'user_id': 'u2'}])

        result, status = get_group_expenses('group_1', 'u1')

        self.assertEqual(status, 200)
        expenses = result['expenses']
        self.assertEqual(len(expenses), 1)
        self.assertEqual(expenses[0]['amount'], 100.0) 
        self.assertEqual(expenses[0]['paid_by']['name'], 'Alice')

    def test_get_group_expenses_empty_split(self):
        """Mutation Target: Kills mutations in empty data handling."""
        table_mock = self.mock_supabase.table
        
        (table_mock.return_value.select.return_value
         .eq.return_value.eq.return_value
         .maybe_single.return_value.execute.return_value) = MockSupabaseResponse(data={'user_id': 'u1'})

        mock_expense_data = [{
            'id': 101,
            'description': 'Solo Expense',
            'amount': 50,
            'total_amount': 50,
            'created_at': '2023-01-01T12:00:00',
            'payer_id': 'u1',
            'category': 'Food'
        }]
        (table_mock.return_value.select.return_value
         .eq.return_value.order.return_value
         .execute.return_value) = MockSupabaseResponse(data=mock_expense_data)

        mock_user_response = MagicMock()
        mock_user_response.user.user_metadata = {'full_name': 'Bob'}
        self.mock_supabase.auth.admin.get_user_by_id.return_value = mock_user_response

        (table_mock.return_value.select.return_value
         .eq.return_value.execute.return_value) = MockSupabaseResponse(data=[])

        result, status = get_group_expenses('group_1', 'u1')

        self.assertEqual(status, 200)
        self.assertEqual(len(result['expenses']), 1)
        self.assertEqual(result['expenses'][0]['split_among'], [])

    # ==========================================
    # get_group_expenses - Edge Cases
    # ==========================================

    def test_get_group_expenses_negative_amount(self):
        """Mutation Target: Kills mutations in amount validation."""
        table_mock = self.mock_supabase.table
        
        (table_mock.return_value.select.return_value
         .eq.return_value.eq.return_value
         .maybe_single.return_value.execute.return_value) = MockSupabaseResponse(data={'user_id': 'u1'})

        mock_expense_data = [{
            'id': 101,
            'description': 'Refund',
            'amount': -50.0,
            'total_amount': -50.0,
            'created_at': '2023-01-01T12:00:00',
            'payer_id': 'u2',
            'category': 'Refund'
        }]
        (table_mock.return_value.select.return_value
         .eq.return_value.order.return_value
         .execute.return_value) = MockSupabaseResponse(data=mock_expense_data)

        mock_user_response = MagicMock()
        mock_user_response.user.user_metadata = {'full_name': 'User'}
        self.mock_supabase.auth.admin.get_user_by_id.return_value = mock_user_response

        (table_mock.return_value.select.return_value
         .eq.return_value.execute.return_value) = MockSupabaseResponse(data=[])

        result, status = get_group_expenses('group_1', 'u1')

        self.assertEqual(status, 200)
        self.assertEqual(result['expenses'][0]['amount'], -50.0)

    def test_get_group_expenses_zero_amount(self):
        """Mutation Target: Kills mutations in zero handling."""
        table_mock = self.mock_supabase.table
        
        (table_mock.return_value.select.return_value
         .eq.return_value.eq.return_value
         .maybe_single.return_value.execute.return_value) = MockSupabaseResponse(data={'user_id': 'u1'})

        mock_expense_data = [{
            'id': 101,
            'description': 'Zero expense',
            'amount': 0,
            'total_amount': 0,
            'created_at': '2023-01-01T12:00:00',
            'payer_id': 'u2',
            'category': 'Other'
        }]
        (table_mock.return_value.select.return_value
         .eq.return_value.order.return_value
         .execute.return_value) = MockSupabaseResponse(data=mock_expense_data)

        mock_user_response = MagicMock()
        mock_user_response.user.user_metadata = {'full_name': 'User'}
        self.mock_supabase.auth.admin.get_user_by_id.return_value = mock_user_response

        (table_mock.return_value.select.return_value
         .eq.return_value.execute.return_value) = MockSupabaseResponse(data=[])

        result, status = get_group_expenses('group_1', 'u1')

        self.assertEqual(status, 200)
        self.assertEqual(result['expenses'][0]['amount'], 0.0)

    def test_get_group_expenses_many_splits(self):
        """Mutation Target: Kills mutations in loop iteration."""
        table_mock = self.mock_supabase.table
        
        (table_mock.return_value.select.return_value
         .eq.return_value.eq.return_value
         .maybe_single.return_value.execute.return_value) = MockSupabaseResponse(data={'user_id': 'u1'})

        mock_expense_data = [{
            'id': 101,
            'description': 'Group dinner',
            'amount': 100,
            'total_amount': 100,
            'created_at': '2023-01-01T12:00:00',
            'payer_id': 'u1',
            'category': 'Food'
        }]
        (table_mock.return_value.select.return_value
         .eq.return_value.order.return_value
         .execute.return_value) = MockSupabaseResponse(data=mock_expense_data)

        mock_user_response = MagicMock()
        mock_user_response.user.user_metadata = {'full_name': 'Payer'}
        self.mock_supabase.auth.admin.get_user_by_id.return_value = mock_user_response

        splits = [{'user_id': f'u{i}'} for i in range(2, 12)]
        (table_mock.return_value.select.return_value
         .eq.return_value.execute.return_value) = MockSupabaseResponse(data=splits)

        result, status = get_group_expenses('group_1', 'u1')

        self.assertEqual(status, 200)
        self.assertEqual(len(result['expenses'][0]['split_among']), 10)

    def test_get_group_expenses_large_amount(self):
        """Mutation Target: Kills mutations in large number handling."""
        table_mock = self.mock_supabase.table
        
        (table_mock.return_value.select.return_value
         .eq.return_value.eq.return_value
         .maybe_single.return_value.execute.return_value) = MockSupabaseResponse(data={'user_id': 'u1'})

        mock_expense_data = [{
            'id': 101,
            'description': 'House rent',
            'amount': 999999.99,
            'total_amount': 999999.99,
            'created_at': '2023-01-01T12:00:00',
            'payer_id': 'u2',
            'category': 'Housing'
        }]
        (table_mock.return_value.select.return_value
         .eq.return_value.order.return_value
         .execute.return_value) = MockSupabaseResponse(data=mock_expense_data)

        mock_user_response = MagicMock()
        mock_user_response.user.user_metadata = {'full_name': 'User'}
        self.mock_supabase.auth.admin.get_user_by_id.return_value = mock_user_response

        (table_mock.return_value.select.return_value
         .eq.return_value.execute.return_value) = MockSupabaseResponse(data=[])

        result, status = get_group_expenses('group_1', 'u1')

        self.assertEqual(status, 200)
        self.assertEqual(result['expenses'][0]['amount'], 999999.99)

    # ==========================================
    # get_group_expenses - Field Handling
    # ==========================================

    def test_get_group_expenses_multiple_payer_fields(self):
        """Mutation Target: Kills mutations in payer field detection."""
        table_mock = self.mock_supabase.table
        
        (table_mock.return_value.select.return_value
         .eq.return_value.eq.return_value
         .maybe_single.return_value.execute.return_value) = MockSupabaseResponse(data={'user_id': 'u1'})

        mock_expense_data = [{
            'id': 101,
            'description': 'Expense',
            'amount': 50,
            'total_amount': 50,
            'created_at': '2023-01-01T12:00:00',
            'payer_id': None,
            'paid_by': 'u2',
            'category': 'Food'
        }]
        (table_mock.return_value.select.return_value
         .eq.return_value.order.return_value
         .execute.return_value) = MockSupabaseResponse(data=mock_expense_data)

        mock_user_response = MagicMock()
        mock_user_response.user.user_metadata = {'full_name': 'Charlie'}
        self.mock_supabase.auth.admin.get_user_by_id.return_value = mock_user_response

        (table_mock.return_value.select.return_value
         .eq.return_value.execute.return_value) = MockSupabaseResponse(data=[])

        result, status = get_group_expenses('group_1', 'u1')

        self.assertEqual(status, 200)
        self.assertEqual(result['expenses'][0]['paid_by']['name'], 'Charlie')

    def test_get_group_expenses_amount_conversion(self):
        """Mutation Target: Kills mutations in float conversion logic."""
        table_mock = self.mock_supabase.table
        
        (table_mock.return_value.select.return_value
         .eq.return_value.eq.return_value
         .maybe_single.return_value.execute.return_value) = MockSupabaseResponse(data={'user_id': 'u1'})

        mock_expense_data = [{
            'id': 101,
            'description': 'String Amount',
            'amount': '100.50',
            'total_amount': '200.75',
            'created_at': '2023-01-01T12:00:00',
            'payer_id': 'u2',
            'category': 'Food'
        }]
        (table_mock.return_value.select.return_value
         .eq.return_value.order.return_value
         .execute.return_value) = MockSupabaseResponse(data=mock_expense_data)

        mock_user_response = MagicMock()
        mock_user_response.user.user_metadata = {'full_name': 'User'}
        self.mock_supabase.auth.admin.get_user_by_id.return_value = mock_user_response

        (table_mock.return_value.select.return_value
         .eq.return_value.execute.return_value) = MockSupabaseResponse(data=[])

        result, status = get_group_expenses('group_1', 'u1')

        self.assertEqual(status, 200)
        self.assertEqual(result['expenses'][0]['amount'], 200.75)
        self.assertIsInstance(result['expenses'][0]['amount'], float)

    def test_get_group_expenses_uses_total_amount_not_amount(self):
        """Mutation Target: Kills mutations that use 'amount' instead of 'total_amount'."""
        table_mock = self.mock_supabase.table
        
        (table_mock.return_value.select.return_value
         .eq.return_value.eq.return_value
         .maybe_single.return_value.execute.return_value) = MockSupabaseResponse(data={'user_id': 'u1'})

        mock_expense_data = [{
            'id': 101,
            'description': 'Both Amounts',
            'amount': 50.0,
            'total_amount': 100.0,
            'created_at': '2023-01-01T12:00:00',
            'payer_id': 'u2',
            'category': 'Food'
        }]
        (table_mock.return_value.select.return_value
         .eq.return_value.order.return_value
         .execute.return_value) = MockSupabaseResponse(data=mock_expense_data)

        mock_user_response = MagicMock()
        mock_user_response.user.user_metadata = {'full_name': 'User'}
        self.mock_supabase.auth.admin.get_user_by_id.return_value = mock_user_response

        (table_mock.return_value.select.return_value
         .eq.return_value.execute.return_value) = MockSupabaseResponse(data=[])

        result, status = get_group_expenses('group_1', 'u1')

        self.assertEqual(result['expenses'][0]['amount'], 100.0)

    def test_get_group_expenses_with_payer_metadata(self):
        """Mutation Target: Kills mutations in metadata handling."""
        table_mock = self.mock_supabase.table
        
        (table_mock.return_value.select.return_value
         .eq.return_value.eq.return_value
         .maybe_single.return_value.execute.return_value) = MockSupabaseResponse(data={'user_id': 'u1'})

        mock_expense_data = [{
            'id': 101,
            'description': 'Expense',
            'amount': 100,
            'total_amount': 100,
            'created_at': '2023-01-01T12:00:00',
            'payer_id': 'u2',
            'category': 'Food'
        }]
        (table_mock.return_value.select.return_value
         .eq.return_value.order.return_value
         .execute.return_value) = MockSupabaseResponse(data=mock_expense_data)

        mock_user_response = MagicMock()
        mock_user_response.user.user_metadata = {
            'full_name': 'Alice Smith',
            'avatar_url': 'https://example.com/alice.png',
            'phone': '+1234567890'
        }
        self.mock_supabase.auth.admin.get_user_by_id.return_value = mock_user_response

        (table_mock.return_value.select.return_value
         .eq.return_value.execute.return_value) = MockSupabaseResponse(data=[])

        result, status = get_group_expenses('group_1', 'u1')

        self.assertEqual(status, 200)
        self.assertEqual(result['expenses'][0]['paid_by']['name'], 'Alice Smith')

    # ==========================================
    # get_monthly_donut_data - Basic Tests
    # ==========================================

    def test_donut_data_current_month(self):
        """Mutation Target: Kills logic errors in date window or summation."""
        mock_rows = [
            {'amount': 10, 'category': 'Food', 'date': '2023-10-05T10:00:00Z'},
            {'amount': 20, 'category': 'Food', 'date': '2023-10-06T10:00:00Z'},
            {'amount': 5, 'category': 'Transport', 'date': '2023-10-07T10:00:00Z'},
        ]
        
        (self.mock_supabase.table.return_value
         .select.return_value
         .eq.return_value
         .gte.return_value
         .lte.return_value
         .execute.return_value) = MockSupabaseResponse(data=mock_rows)

        data, status = get_monthly_donut_data('u1', 'current')

        self.assertEqual(status, 200)
        self.assertEqual(data[0]['category'], 'Food')
        self.assertEqual(data[0]['total'], 30.0)
        self.assertEqual(data[1]['category'], 'Transport')
        self.assertEqual(data[1]['total'], 5.0)

    def test_donut_data_exception(self):
        """Mutation Target: Kills missing error handling."""
        self.mock_supabase.table.side_effect = Exception("API Down")
        
        result, status = get_monthly_donut_data('u1', 'current')
        
        self.assertEqual(status, 500)
        self.assertEqual(result['error'], 'Failed to fetch data')

    def test_donut_data_default_period(self):
        """Mutation Target: Kills mutations in period defaulting logic."""
        (self.mock_supabase.table.return_value
         .select.return_value
         .eq.return_value
         .gte.return_value
         .lte.return_value
         .execute.return_value) = MockSupabaseResponse(data=[
            {'amount': 100, 'category': 'Food', 'date': '2023-10-05T10:00:00Z'},
        ])

        data, status = get_monthly_donut_data('u1', None)
        self.assertEqual(status, 200)
        self.assertIsNotNone(data)

        data, status = get_monthly_donut_data('u1', '')
        self.assertEqual(status, 200)
        self.assertIsNotNone(data)

    def test_donut_data_previous_month(self):
        """Mutation Target: Kills mutations in month calculation."""
        mock_rows = [
            {'amount': 50, 'category': 'Food', 'date': '2023-09-15T10:00:00Z'},
        ]
        
        (self.mock_supabase.table.return_value
         .select.return_value
         .eq.return_value
         .gte.return_value
         .lte.return_value
         .execute.return_value) = MockSupabaseResponse(data=mock_rows)

        data, status = get_monthly_donut_data('u1', 'previous')

        self.assertEqual(status, 200)
        self.assertEqual(data[0]['category'], 'Food')
        self.assertEqual(data[0]['total'], 50.0)

    # ==========================================
    # get_monthly_donut_data - Edge Cases
    # ==========================================

    def test_donut_data_single_category(self):
        """Mutation Target: Kills mutations in single-item handling."""
        mock_rows = [
            {'amount': 50.0, 'category': 'Food', 'date': '2023-10-05T10:00:00Z'},
            {'amount': 30.0, 'category': 'Food', 'date': '2023-10-06T10:00:00Z'},
        ]
        
        (self.mock_supabase.table.return_value
         .select.return_value
         .eq.return_value
         .gte.return_value
         .lte.return_value
         .execute.return_value) = MockSupabaseResponse(data=mock_rows)

        data, status = get_monthly_donut_data('u1', 'current')

        self.assertEqual(status, 200)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['category'], 'Food')
        self.assertEqual(data[0]['total'], 80.0)

    def test_donut_data_many_categories(self):
        """Mutation Target: Kills mutations in large list handling."""
        mock_rows = [
            {'amount': 10.0, 'category': f'Cat{i}', 'date': '2023-10-05T10:00:00Z'}
            for i in range(20)
        ]
        
        (self.mock_supabase.table.return_value
         .select.return_value
         .eq.return_value
         .gte.return_value
         .lte.return_value
         .execute.return_value) = MockSupabaseResponse(data=mock_rows)

        data, status = get_monthly_donut_data('u1', 'current')

        self.assertEqual(status, 200)
        self.assertEqual(len(data), 20)
        for item in data:
            self.assertEqual(item['total'], 10.0)

    def test_donut_data_sums_correctly(self):
        """Mutation Target: Kills mutations in summation logic."""
        mock_rows = [
            {'amount': 10.5, 'category': 'Food', 'date': '2023-10-05T10:00:00Z'},
            {'amount': 20.25, 'category': 'Food', 'date': '2023-10-06T10:00:00Z'},
            {'amount': 5.25, 'category': 'Transport', 'date': '2023-10-07T10:00:00Z'},
        ]
        
        (self.mock_supabase.table.return_value
         .select.return_value
         .eq.return_value
         .gte.return_value
         .lte.return_value
         .execute.return_value) = MockSupabaseResponse(data=mock_rows)

        data, status = get_monthly_donut_data('u1', 'current')

        self.assertEqual(status, 200)
        self.assertEqual(data[0]['total'], 30.75)
        self.assertEqual(data[1]['total'], 5.25)

    def test_donut_data_sorted_by_value_descending(self):
        """Mutation Target: Kills mutations in sort logic."""
        mock_rows = [
            {'amount': 5.0, 'category': 'Transport', 'date': '2023-10-05T10:00:00Z'},
            {'amount': 100.0, 'category': 'Food', 'date': '2023-10-06T10:00:00Z'},
            {'amount': 50.0, 'category': 'Entertainment', 'date': '2023-10-07T10:00:00Z'},
        ]
        
        (self.mock_supabase.table.return_value
         .select.return_value
         .eq.return_value
         .gte.return_value
         .lte.return_value
         .execute.return_value) = MockSupabaseResponse(data=mock_rows)

        data, status = get_monthly_donut_data('u1', 'current')

        self.assertEqual(status, 200)
        self.assertEqual(data[0]['category'], 'Food')
        self.assertEqual(data[0]['total'], 100.0)
        self.assertEqual(data[1]['category'], 'Entertainment')
        self.assertEqual(data[1]['total'], 50.0)
        self.assertEqual(data[2]['category'], 'Transport')
        self.assertEqual(data[2]['total'], 5.0)

if __name__ == '__main__':
    unittest.main()

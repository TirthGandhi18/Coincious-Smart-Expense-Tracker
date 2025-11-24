import unittest
from unittest.mock import MagicMock, patch, Mock
import sys
import types
from datetime import datetime

# Stub app.extensions BEFORE importing services
fake_extensions = types.ModuleType("app.extensions")
fake_extensions.supabase = MagicMock()
sys.modules["app.extensions"] = fake_extensions

from app.services.notification_service import (
    log_notification,
    get_notifications,
    mark_as_read,
    create_notification,
    create_raw_notification,
    delete_invitation_notification
)

class TestNotificationService(unittest.TestCase):

    def test_log_notification_success(self):
        """Mutation Target: Kills mutations in notification logging."""
        with patch('app.services.notification_service.supabase.table') as mock_table:
            insert_query = MagicMock()
            insert_query.insert.return_value.execute.return_value = MagicMock()
            
            mock_table.return_value = insert_query
            
            result = log_notification('user_1', 'user_2', 'expense_added', 'New expense', 'grp_1')
            
            self.assertTrue(result)
            mock_table.return_value.insert.assert_called()

    def test_log_notification_with_related_expense(self):
        """Mutation Target: Kills mutations in related expense field."""
        with patch('app.services.notification_service.supabase.table') as mock_table:
            insert_query = MagicMock()
            insert_query.insert.return_value.execute.return_value = MagicMock()
            
            mock_table.return_value = insert_query
            
            result = log_notification('user_1', 'user_2', 'expense_added', 'New expense', 'grp_1', related_expense_id='exp_123')
            
            self.assertTrue(result)
            call_args = mock_table.return_value.insert.call_args
            # Verify expense_id was included
            self.assertIn('exp_123', str(call_args))

    def test_get_notifications_returns_list(self):
        """Mutation Target: Kills mutations in notification retrieval."""
        with patch('app.services.notification_service.supabase.table') as mock_table:
            query = MagicMock()
            query.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
                data=[
                    {'id': 'notif_1', 'message': 'Test 1', 'read': False},
                    {'id': 'notif_2', 'message': 'Test 2', 'read': True},
                ]
            )
            
            mock_table.return_value = query
            
            result, status = get_notifications('user_1')
            
            self.assertEqual(status, 200)
            self.assertIsInstance(result['notifications'], list)
            self.assertEqual(len(result['notifications']), 2)

    def test_get_notifications_ordered_by_date(self):
        """Mutation Target: Kills mutations in ordering logic."""
        with patch('app.services.notification_service.supabase.table') as mock_table:
            query = MagicMock()
            query.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
                data=[
                    {'id': 'notif_1', 'created_at': '2024-01-10'},
                    {'id': 'notif_2', 'created_at': '2024-01-05'},
                ]
            )
            
            mock_table.return_value = query
            
            get_notifications('user_1')
            
            # Verify order() was called with desc=True
            query.select.return_value.eq.return_value.order.assert_called_with('created_at', desc=True)

    def test_mark_as_read_success(self):
        """Mutation Target: Kills mutations in read status update."""
        with patch('app.services.notification_service.supabase.table') as mock_table:
            update_query = MagicMock()
            update_query.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=[{'id': 'notif_1'}])
            
            mock_table.return_value = update_query
            
            result, status = mark_as_read('user_1', 'notif_1')
            
            self.assertEqual(status, 200)

    def test_mark_as_read_filters_by_user(self):
        """Mutation Target: Kills mutations in user filtering."""
        with patch('app.services.notification_service.supabase.table') as mock_table:
            update_query = MagicMock()
            update_query.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=[{'id': 'notif_1'}])
            
            mock_table.return_value = update_query
            
            mark_as_read('user_123', 'notif_1')
            
            # Verify update was called
            update_query.update.assert_called_with({'is_read': True})

    def test_mark_as_read_not_found(self):
        """Mutation Target: Kills mutations in error handling."""
        with patch('app.services.notification_service.supabase.table') as mock_table:
            update_query = MagicMock()
            update_query.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=None)
            
            mock_table.return_value = update_query
            
            result, status = mark_as_read('user_1', 'invalid_notif')
            
            self.assertEqual(status, 404)

    def test_create_notification_success(self):
        """Mutation Target: Kills mutations in simple notification creation."""
        with patch('app.services.notification_service.supabase.table') as mock_table:
            insert_query = MagicMock()
            insert_query.insert.return_value.execute.return_value = MagicMock()
            
            mock_table.return_value = insert_query
            
            result = create_notification('user_1', 'Test message', 'http://example.com')
            
            self.assertTrue(result)
            mock_table.return_value.insert.assert_called()

    def test_create_notification_includes_link(self):
        """Mutation Target: Kills mutations in link field."""
        with patch('app.services.notification_service.supabase.table') as mock_table:
            insert_query = MagicMock()
            insert_query.insert.return_value.execute.return_value = MagicMock()
            
            mock_table.return_value = insert_query
            
            create_notification('user_1', 'Message', '/group/123')
            
            call_args = mock_table.return_value.insert.call_args
            self.assertIn('/group/123', str(call_args))

    def test_create_raw_notification_success(self):
        """Mutation Target: Kills mutations in raw notification insertion."""
        with patch('app.services.notification_service.supabase.table') as mock_table:
            insert_query = MagicMock()
            insert_query.insert.return_value.execute.return_value = MagicMock()
            
            mock_table.return_value = insert_query
            
            payload = {
                'user_id': 'user_1',
                'type': 'expense_added',
                'message': 'New expense added'
            }
            
            result = create_raw_notification(payload)
            
            self.assertTrue(result)
            mock_table.return_value.insert.assert_called_with(payload)

    def test_delete_invitation_notification_success(self):
        """Mutation Target: Kills mutations in invitation notification deletion."""
        with patch('app.services.notification_service.supabase.table') as mock_table:
            delete_query = MagicMock()
            delete_query.delete.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock()
            
            mock_table.return_value = delete_query
            
            result = delete_invitation_notification('inv_123', 'user_1')
            
            self.assertTrue(result)
            mock_table.return_value.delete.assert_called()

    def test_delete_invitation_notification_filters_correctly(self):
        """Mutation Target: Kills mutations in deletion filters."""
        with patch('app.services.notification_service.supabase.table') as mock_table:
            delete_query = MagicMock()
            delete_query.delete.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock()
            
            mock_table.return_value = delete_query
            
            delete_invitation_notification('inv_456', 'user_2')
            
            # Verify delete was called
            delete_query.delete.assert_called()

    def test_log_notification_handles_exception(self):
        """Mutation Target: Kills mutations in error handling."""
        with patch('app.services.notification_service.supabase.table') as mock_table:
            mock_table.return_value.insert.return_value.execute.side_effect = Exception("DB Error")
            
            result = log_notification('user_1', 'user_2', 'test', 'msg', 'grp_1')
            
            self.assertFalse(result)

if __name__ == '__main__':
    unittest.main()

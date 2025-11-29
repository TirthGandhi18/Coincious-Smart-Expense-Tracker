import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chatbot } from './Chatbot';
import { BrowserRouter } from 'react-router-dom';

// --- Hoisted Mocks ---
const mocks = vi.hoisted(() => ({
    navigate: vi.fn(),
    getSession: vi.fn(),
    scrollIntoView: vi.fn(),
    useAuth: vi.fn(),
    useSettings: vi.fn(),
}));

// --- Mock Modules ---

vi.mock('../../App', () => ({
    useAuth: mocks.useAuth,
}));

vi.mock('../ui/SettingContext', () => ({
    useSettings: mocks.useSettings,
}));

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: () => mocks.navigate,
        BrowserRouter: actual.BrowserRouter,
    };
});

vi.mock('../../utils/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: mocks.getSession,
        },
    },
}));

vi.mock('lucide-react', () => ({
    Send: () => <span data-testid="icon-send">Send</span>,
    Brain: () => <span data-testid="icon-brain">Brain</span>,
    User: () => <span data-testid="icon-user">User</span>,
    Lightbulb: () => <span data-testid="icon-lightbulb">Lightbulb</span>,
    TrendingUp: () => <span data-testid="icon-trending">TrendingUp</span>,
    PieChart: () => <span data-testid="icon-pie">PieChart</span>,
    DollarSign: () => <span data-testid="icon-dollar">DollarSign</span>,
    Users: () => <span data-testid="icon-users">Users</span>,
    Shield: () => <span data-testid="icon-shield">Shield</span>,
}));

vi.mock('react-markdown', () => ({
    default: ({ children }: any) => <div data-testid="markdown">{children}</div>,
}));

// Mock import.meta.env using vi.stubEnv
vi.stubEnv('VITE_API_URL', 'http://localhost:3000');

// Mock scrollIntoView
Element.prototype.scrollIntoView = mocks.scrollIntoView;

describe('Chatbot Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.useAuth.mockReturnValue({
            user: { id: 'test-user-123', email: 'test@example.com' },
        });

        mocks.useSettings.mockReturnValue({
            dataSharing: true,
        });

        mocks.getSession.mockResolvedValue({
            data: { session: { access_token: 'test-token' } }
        });

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ response: 'This is an AI response' }),
        });
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <Chatbot />
            </BrowserRouter>
        );
    };

    describe('Component Rendering', () => {
        it('renders without crashing', () => {
            renderComponent();
            expect(screen.getByRole('heading', { name: /AI Assistant/i })).toBeInTheDocument();
        });

        it('renders header with title and description', () => {
            renderComponent();
            expect(screen.getByText('AI Assistant')).toBeInTheDocument();
            expect(screen.getByText('Your smart financial companion')).toBeInTheDocument();
        });

        it('renders initial bot message', () => {
            renderComponent();
            expect(screen.getByText(/Hi! I'm your AI financial assistant/i)).toBeInTheDocument();
        });

        it('renders exact initial bot message content', () => {
            renderComponent();
            expect(screen.getByText(/I can help you analyze your spending, provide insights, and answer questions about your expenses/i)).toBeInTheDocument();
        });

        it('renders all quick action buttons', () => {
            renderComponent();
            expect(screen.getByText('Spending Breakdown')).toBeInTheDocument();
            expect(screen.getByText('Spending Trends')).toBeInTheDocument();
            expect(screen.getByText('Monthly Budget')).toBeInTheDocument();
            expect(screen.getByText('Group Expenses')).toBeInTheDocument();
        });

        it('renders message input field with correct placeholder', () => {
            renderComponent();
            expect(screen.getByPlaceholderText(/Ask me about your expenses, budgets, or financial insights/i)).toBeInTheDocument();
        });

        it('renders send button', () => {
            renderComponent();
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            expect(sendButton).toBeInTheDocument();
        });

        it('renders all initial suggestions', () => {
            renderComponent();
            expect(screen.getByText('How much did I spend on food this month?')).toBeInTheDocument();
            expect(screen.getByText('Show me my spending trends')).toBeInTheDocument();
            expect(screen.getByText("What's my biggest expense category?")).toBeInTheDocument();
            expect(screen.getByText('Give me savings tips')).toBeInTheDocument();
        });

        it('renders helper text below input', () => {
            renderComponent();
            expect(screen.getByText(/Try asking about spending trends, budget analysis, or savings tips/i)).toBeInTheDocument();
        });
    });

    describe('Message Input', () => {
        it('updates input value when typing', () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i) as HTMLInputElement;

            fireEvent.change(input, { target: { value: 'Test message' } });

            expect(input.value).toBe('Test message');
        });

        it('disables send button when input is empty', () => {
            renderComponent();
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));

            expect(sendButton).toBeDisabled();
        });

        it('enables send button when input has text', () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));

            fireEvent.change(input, { target: { value: 'Test message' } });

            expect(sendButton).not.toBeDisabled();
        });

        it('clears input after sending message', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i) as HTMLInputElement;

            fireEvent.change(input, { target: { value: 'Test message' } });
            expect(input.value).toBe('Test message');

            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(input.value).toBe('');
            });
        });

        it('disables input while typing indicator is shown', async () => {
            global.fetch = vi.fn().mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve({
                    ok: true,
                    json: async () => ({ response: 'AI response' })
                }), 100))
            );

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i) as HTMLInputElement;

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(input).toBeDisabled();
            });
        });
    });

    describe('Sending Messages', () => {
        it('adds user message to chat when sent', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'How much did I spend?' } });

            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('How much did I spend?')).toBeInTheDocument();
            });
        });

        it('shows typing indicator while waiting for response', async () => {
            global.fetch = vi.fn().mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve({
                    ok: true,
                    json: async () => ({ response: 'AI response' })
                }), 100))
            );

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                const typingDots = document.querySelectorAll('.animate-bounce');
                expect(typingDots.length).toBeGreaterThan(0);
            });
        });

        it('displays AI response after successful API call', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Tell me about my spending' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('This is an AI response')).toBeInTheDocument();
            });
        });

        it('handles empty/whitespace messages', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: '   ' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            // Should not make API call
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('trims whitespace from message content', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: '  Test message  ' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('Test message')).toBeInTheDocument();
            });
        });

        it('sends correct API request with message and history', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test query' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
                const fetchCall = (global.fetch as any).mock.calls[0];
                expect(fetchCall[1].method).toBe('POST');
                expect(fetchCall[1].headers['Authorization']).toBe('Bearer test-token');
                expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
            });
        });

        it('includes message history in API request', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            // Send first message
            fireEvent.change(input, { target: { value: 'First message' } });
            let sendButtons = screen.getAllByRole('button');
            let sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('First message')).toBeInTheDocument();
            });

            // Send second message
            fireEvent.change(input, { target: { value: 'Second message' } });
            sendButtons = screen.getAllByRole('button');
            sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                const fetchCalls = (global.fetch as any).mock.calls;
                const lastCall = fetchCalls[fetchCalls.length - 1];
                const body = JSON.parse(lastCall[1].body);
                expect(body.history).toBeDefined();
                expect(body.history.length).toBeGreaterThan(0);
            });
        });

        it('limits history to last 6 messages', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            // Send multiple messages
            for (let i = 1; i <= 8; i++) {
                fireEvent.change(input, { target: { value: `Message ${i}` } });
                const sendButtons = screen.getAllByRole('button');
                const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
                fireEvent.click(sendButton!);
                await waitFor(() => screen.getByText(`Message ${i}`));
            }

            const fetchCalls = (global.fetch as any).mock.calls;
            const lastCall = fetchCalls[fetchCalls.length - 1];
            const body = JSON.parse(lastCall[1].body);
            expect(body.history.length).toBeLessThanOrEqual(6);
        });
    });

    describe('Quick Actions', () => {
        it('sends message when clicking spending breakdown button', async () => {
            renderComponent();

            const button = screen.getByText('Spending Breakdown');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/Show me my spending breakdown by category this month/i)).toBeInTheDocument();
            });
        });

        it('sends message when clicking spending trends button', async () => {
            renderComponent();

            const button = screen.getByText('Spending Trends');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/What are my spending trends over the last 3 months?/i)).toBeInTheDocument();
            });
        });

        it('sends message when clicking monthly budget button', async () => {
            renderComponent();

            const button = screen.getByText('Monthly Budget');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/How am I doing against my monthly budget?/i)).toBeInTheDocument();
            });
        });

        it('sends message when clicking group expenses button', async () => {
            renderComponent();

            const button = screen.getByText('Group Expenses');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/Show me my group expense summary/i)).toBeInTheDocument();
            });
        });

        it('makes API call when quick action is clicked', async () => {
            renderComponent();

            const button = screen.getByText('Spending Breakdown');
            fireEvent.click(button);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
            });
        });
    });

    describe('Suggestion Buttons', () => {
        it('sends message when clicking a suggestion', async () => {
            renderComponent();

            const suggestion = screen.getByText('How much did I spend on food this month?');
            fireEvent.click(suggestion);

            await waitFor(() => {
                const matches = screen.getAllByText('How much did I spend on food this month?');
                expect(matches.length).toBeGreaterThan(1);
            });
        });

        it('sends message when clicking show trends suggestion', async () => {
            renderComponent();

            const suggestion = screen.getByText('Show me my spending trends');
            fireEvent.click(suggestion);

            await waitFor(() => {
                const matches = screen.getAllByText('Show me my spending trends');
                expect(matches.length).toBeGreaterThan(1);
            });
        });

        it('sends message when clicking biggest expense suggestion', async () => {
            renderComponent();

            const suggestion = screen.getByText("What's my biggest expense category?");
            fireEvent.click(suggestion);

            await waitFor(() => {
                const matches = screen.getAllByText("What's my biggest expense category?");
                expect(matches.length).toBeGreaterThan(1);
            });
        });

        it('sends message when clicking savings tips suggestion', async () => {
            renderComponent();

            const suggestion = screen.getByText('Give me savings tips');
            fireEvent.click(suggestion);

            await waitFor(() => {
                const matches = screen.getAllByText('Give me savings tips');
                expect(matches.length).toBeGreaterThan(1);
            });
        });

        it('shows tip-related suggestions when message contains "tip"', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Give me a tip' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('How can I reduce food expenses?')).toBeInTheDocument();
                expect(screen.getByText('Show me my savings progress')).toBeInTheDocument();
                expect(screen.getByText('Set up a budget reminder')).toBeInTheDocument();
            });
        });

        it('shows default suggestions when message does not contain "tip"', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Show my expenses' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('Tell me more about this category')).toBeInTheDocument();
                expect(screen.getByText('How does this compare to last month?')).toBeInTheDocument();
                expect(screen.getByText('Give me improvement suggestions')).toBeInTheDocument();
            });
        });

        it('handles case-insensitive "tip" detection', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Give me a TIP' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('How can I reduce food expenses?')).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        it('displays error message when API call fails', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText(/I cannot respond currently, there is some issue. Please try again later/i)).toBeInTheDocument();
            });

            consoleSpy.mockRestore();
        });

        it('displays error message when API returns non-OK status', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
            });
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText(/I cannot respond currently/i)).toBeInTheDocument();
            });

            consoleSpy.mockRestore();
        });

        it('logs error to console when API fails', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Error sending message to AI:', expect.any(Error));
            });

            consoleSpy.mockRestore();
        });

        it('handles missing session gracefully', async () => {
            mocks.getSession.mockResolvedValue({
                data: { session: null }
            });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            // Should not call fetch when session is missing
            await waitFor(() => {
                expect(global.fetch).not.toHaveBeenCalled();
            });
        });

        it('handles missing access token gracefully', async () => {
            mocks.getSession.mockResolvedValue({
                data: { session: { access_token: null } }
            });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(global.fetch).not.toHaveBeenCalled();
            });
        });

        it('stops typing indicator after error', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i) as HTMLInputElement;

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(input).not.toBeDisabled();
            });

            consoleSpy.mockRestore();
        });
    });

    describe('Form Submission', () => {
        it('sends message on form submit', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);
            const form = input.closest('form');

            fireEvent.change(input, { target: { value: 'Test submit' } });
            fireEvent.submit(form!);

            await waitFor(() => {
                expect(screen.getByText('Test submit')).toBeInTheDocument();
            });
        });

        it('prevents default form submission', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);
            const form = input.closest('form');

            const mockPreventDefault = vi.fn();
            fireEvent.change(input, { target: { value: 'Test' } });

            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            Object.defineProperty(submitEvent, 'preventDefault', {
                value: mockPreventDefault,
                writable: true,
            });

            form?.dispatchEvent(submitEvent);

            expect(mockPreventDefault).toHaveBeenCalled();
        });
    });

    describe('Data Sharing', () => {
        it('shows data sharing popup when dataSharing is false', async () => {
            mocks.useSettings.mockReturnValue({
                dataSharing: false,
            });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('Data Sharing Required')).toBeInTheDocument();
            });
        });

        it('does not make API call when dataSharing is false', async () => {
            mocks.useSettings.mockReturnValue({
                dataSharing: false,
            });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('Data Sharing Required')).toBeInTheDocument();
            });

            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('shows correct message in data sharing popup', async () => {
            mocks.useSettings.mockReturnValue({
                dataSharing: false,
            });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText(/To use the AI Assistant, you need to enable data sharing in your settings/i)).toBeInTheDocument();
            });
        });

        it('navigates to settings when clicking Go to Settings button', async () => {
            mocks.useSettings.mockReturnValue({
                dataSharing: false,
            });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('Go to Settings')).toBeInTheDocument();
            });

            const settingsButton = screen.getByText('Go to Settings');
            fireEvent.click(settingsButton);

            expect(mocks.navigate).toHaveBeenCalledWith('/settings');
        });

        it('closes popup when clicking Cancel', async () => {
            mocks.useSettings.mockReturnValue({
                dataSharing: false,
            });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('Cancel')).toBeInTheDocument();
            });

            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            await waitFor(() => {
                expect(screen.queryByText('Data Sharing Required')).not.toBeInTheDocument();
            });
        });
    });

    describe('User Authentication', () => {
        it('does not send message when user is not authenticated', async () => {
            mocks.useAuth.mockReturnValue({
                user: null,
            });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            expect(global.fetch).not.toHaveBeenCalled();
        });
    });

    describe('Message History and Mapping', () => {
        it('maps user messages to correct role in history', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            // Send first message to get it in history
            fireEvent.change(input, { target: { value: 'First message' } });
            let sendButtons = screen.getAllByRole('button');
            let sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => screen.getByText('This is an AI response'));

            // Send second message to check history
            fireEvent.change(input, { target: { value: 'Second message' } });
            sendButtons = screen.getAllByRole('button');
            sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                const fetchCalls = (global.fetch as any).mock.calls;
                expect(fetchCalls.length).toBeGreaterThan(1);
                const lastCall = fetchCalls[fetchCalls.length - 1];
                const body = JSON.parse(lastCall[1].body);
                const userMessages = body.history.filter((msg: any) => msg.role === 'user');
                expect(userMessages.length).toBeGreaterThan(0);
            });
        });

        it('maps bot messages to assistant role in history', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'First' } });
            let sendButtons = screen.getAllByRole('button');
            let sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => screen.getByText('This is an AI response'));

            fireEvent.change(input, { target: { value: 'Second' } });
            sendButtons = screen.getAllByRole('button');
            sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                const fetchCalls = (global.fetch as any).mock.calls;
                const lastCall = fetchCalls[fetchCalls.length - 1];
                const body = JSON.parse(lastCall[1].body);
                const assistantMessages = body.history.filter((msg: any) => msg.role === 'assistant');
                expect(assistantMessages.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Scroll Behavior', () => {
        it('scrollIntoView is available on element', () => {
            renderComponent();
            // Just verify the mock is set up correctly
            expect(Element.prototype.scrollIntoView).toBeDefined();
        });
    });

    describe('Message Timestamps', () => {
        it('displays timestamp for each message', () => {
            renderComponent();
            const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/);
            expect(timestamps.length).toBeGreaterThan(0);
        });

        it('formats timestamp correctly', () => {
            renderComponent();
            const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/);
            timestamps.forEach(timestamp => {
                expect(timestamp.textContent).toMatch(/^\d{1,2}:\d{2}( [AP]M)?$/);
            });
        });
    });

    describe('API Response Handling', () => {
        it('extracts response from API data', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ response: 'Custom AI response text' }),
            });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('Custom AI response text')).toBeInTheDocument();
            });
        });

        it('handles different response formats', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ response: 'Response with **markdown**' }),
            });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByTestId('markdown')).toBeInTheDocument();
            });
        });
    });

    describe('Edge Cases and Boundary Conditions', () => {
        it('handles messages with special characters', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            const specialMessage = 'Test $100 & 50% discount!';
            fireEvent.change(input, { target: { value: specialMessage } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText(specialMessage)).toBeInTheDocument();
            });
        });

        it('handles very long messages', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            const longMessage = 'A'.repeat(500);
            fireEvent.change(input, { target: { value: longMessage } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
            });
        });

        it('handles rapid consecutive messages', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            // Send multiple messages quickly
            for (let i = 0; i < 3; i++) {
                fireEvent.change(input, { target: { value: `Quick message ${i}` } });
                const sendButtons = screen.getAllByRole('button');
                const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
                fireEvent.click(sendButton!);
            }

            await waitFor(() => {
                expect((global.fetch as any).mock.calls.length).toBeGreaterThan(0);
            });
        });

        it('generates unique message IDs', async () => {
            const dateSpy = vi.spyOn(Date, 'now');
            dateSpy.mockReturnValueOnce(1000);
            dateSpy.mockReturnValueOnce(2000);

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'First' } });
            let sendButtons = screen.getAllByRole('button');
            let sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => screen.getByText('First'));

            fireEvent.change(input, { target: { value: 'Second' } });
            sendButtons = screen.getAllByRole('button');
            sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => screen.getByText('Second'));

            dateSpy.mockRestore();
        });

        it('handles message containing "tips" (plural)', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Give me some tips' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('How can I reduce food expenses?')).toBeInTheDocument();
            });
        });

        it('handles message with "tip" in the middle', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'What is a good tip for saving' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('How can I reduce food expenses?')).toBeInTheDocument();
            });
        });

        it('does not trigger tip suggestions for words without "tip"', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Show my budget information' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            // Wait for bot's API response first
            await waitFor(() => {
                expect(screen.getByText('This is an AI response')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Then check for default suggestions (not tip-related)
            expect(screen.getByText('Tell me more about this category')).toBeInTheDocument();
            expect(screen.queryByText('How can I reduce food expenses?')).not.toBeInTheDocument();
        });
    });

    describe('API Error Status Codes', () => {
        it('handles 400 Bad Request', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
            });
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText(/I cannot respond currently/i)).toBeInTheDocument();
            });

            consoleSpy.mockRestore();
        });

        it('handles 401 Unauthorized', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 401,
            });
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText(/I cannot respond currently/i)).toBeInTheDocument();
            });

            consoleSpy.mockRestore();
        });

        it('handles 403 Forbidden', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 403,
            });
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText(/I cannot respond currently/i)).toBeInTheDocument();
            });

            consoleSpy.mockRestore();
        });

        it('handles 404 Not Found', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
            });
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText(/I cannot respond currently/i)).toBeInTheDocument();
            });

            consoleSpy.mockRestore();
        });

        it('throws error with correct status message', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 503,
            });
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith(
                    'Error sending message to AI:',
                    expect.objectContaining({ message: expect.stringContaining('503') })
                );
            });

            consoleSpy.mockRestore();
        });
    });

    describe('Message State Management', () => {
        it('preserves previous messages when adding new ones', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            // Send first message
            fireEvent.change(input, { target: { value: 'First message' } });
            let sendButtons = screen.getAllByRole('button');
            let sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => screen.getByText('First message'));

            // Send second message
            fireEvent.change(input, { target: { value: 'Second message' } });
            sendButtons = screen.getAllByRole('button');
            sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('First message')).toBeInTheDocument();
                expect(screen.getByText('Second message')).toBeInTheDocument();
            });
        });

        it('maintains correct message order', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            const messages = ['First', 'Second', 'Third'];
            for (const msg of messages) {
                fireEvent.change(input, { target: { value: msg } });
                const sendButtons = screen.getAllByRole('button');
                const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
                fireEvent.click(sendButton!);
                await waitFor(() => screen.getByText(msg));
            }

            const allMessages = screen.getAllByText(/First|Second|Third/);
            expect(allMessages.length).toBeGreaterThanOrEqual(3);
        });

        it('adds bot response after user message', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'User question' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('User question')).toBeInTheDocument();
            });

            await waitFor(() => {
                expect(screen.getByText('This is an AI response')).toBeInTheDocument();
            });
        });
    });

    describe('Input Validation', () => {
        it('does not send empty string after trimming', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: '     ' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));

            // Button should be disabled
            expect(sendButton).toBeDisabled();
        });

        it('enables button only when non-empty content exists', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));

            // Initially disabled
            expect(sendButton).toBeDisabled();

            // Type whitespace - still disabled
            fireEvent.change(input, { target: { value: '   ' } });
            expect(sendButton).toBeDisabled();

            // Type actual content - enabled
            fireEvent.change(input, { target: { value: 'Real message' } });
            expect(sendButton).not.toBeDisabled();

            // Clear to whitespace - disabled again
            fireEvent.change(input, { target: { value: '' } });
            expect(sendButton).toBeDisabled();
        });
    });

    describe('Session Management', () => {
        it('stops typing indicator when session is null', async () => {
            mocks.getSession.mockResolvedValueOnce({
                data: { session: null }
            });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i) as HTMLInputElement;

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(input).not.toBeDisabled();
            });
        });

        it('stops typing indicator when access token is missing', async () => {
            mocks.getSession.mockResolvedValueOnce({
                data: { session: { access_token: null } }
            });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i) as HTMLInputElement;

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(input).not.toBeDisabled();
            });
        });
    });

    describe('Typing Indicator Behavior', () => {
        it('shows typing indicator immediately after sending', async () => {
            let resolveResponse: any;
            global.fetch = vi.fn().mockImplementation(() =>
                new Promise(resolve => {
                    resolveResponse = resolve;
                })
            );

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i) as HTMLInputElement;

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            // Input should be disabled while typing
            await waitFor(() => {
                expect(input).toBeDisabled();
            });

            // Resolve the promise
            resolveResponse({
                ok: true,
                json: async () => ({ response: 'Done' })
            });

            // Input should be enabled after response
            await waitFor(() => {
                expect(input).not.toBeDisabled();
            });
        });

        it('hides typing indicator after receiving response', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i) as HTMLInputElement;

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('This is an AI response')).toBeInTheDocument();
            });

            expect(input).not.toBeDisabled();
        });
    });

    describe('JSX Rendering and DOM Structure', () => {
        it('renders user messages with correct CSS classes', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'User message' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                const userMessage = screen.getByText('User message');
                // The whitespace-pre-line class is on the div containing the text
                expect(userMessage).toHaveClass('whitespace-pre-line');
            });
        });

        it('renders bot messages with markdown wrapper', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                const markdown = screen.getByTestId('markdown');
                expect(markdown).toBeInTheDocument();
            });
        });

        it('applies justify-end class for user messages', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test user' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                const userMessage = screen.getByText('Test user');
                const flexContainer = userMessage.closest('.flex');
                expect(flexContainer).toHaveClass('justify-end');
            });
        });

        it('applies justify-start class for bot messages', () => {
            renderComponent();
            const botMessage = screen.getByText(/Hi! I'm your AI financial assistant/i);
            const flexContainer = botMessage.closest('.flex');
            expect(flexContainer).toHaveClass('justify-start');
        });

        it('renders user avatar only for user messages', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'User msg' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                const userIcons = screen.getAllByTestId('icon-user');
                expect(userIcons.length).toBeGreaterThan(0);
            });
        });

        it('renders bot avatar only for bot messages', () => {
            renderComponent();
            const brainIcons = screen.getAllByTestId('icon-brain');
            expect(brainIcons.length).toBeGreaterThan(0);
        });

        it('applies bg-primary class for user message bubbles', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                const userMessage = screen.getByText('Test');
                const bubble = userMessage.closest('.bg-primary');
                expect(bubble).toBeInTheDocument();
            });
        });

        it('applies bg-muted class for bot message bubbles', () => {
            renderComponent();
            const botMessage = screen.getByText(/Hi! I'm your AI financial assistant/i);
            const bubble = botMessage.closest('.bg-muted');
            expect(bubble).toBeInTheDocument();
        });

        it('renders suggestions only for bot messages', () => {
            renderComponent();
            const suggestions = screen.getAllByText(/How much did I spend/i);
            expect(suggestions.length).toBeGreaterThan(0);
        });

        it('does not render suggestions for user messages', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'User message without suggestions' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                const userMessage = screen.getByText('User message without suggestions');
                const messageDiv = userMessage.closest('div[class*="max-w"]');
                const suggestionButtons = messageDiv?.querySelectorAll('button');
                // User messages should not have suggestion buttons
                expect(suggestionButtons?.length).toBe(0);
            });
        });
    });

    describe('Message Type Conditionals', () => {
        it('correctly identifies message type as user', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Check type' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                const message = screen.getByText('Check type');
                const container = message.closest('.flex');
                expect(container).toHaveClass('justify-end');
            });
        });

        it('correctly identifies message type as bot', () => {
            renderComponent();
            const botMessage = screen.getByText(/Hi! I'm your AI financial assistant/i);
            const container = botMessage.closest('.flex');
            expect(container).toHaveClass('justify-start');
        });

        it('renders different content structure for user vs bot', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test structure' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                // User message should have whitespace-pre-line class
                const userMessage = screen.getByText('Test structure');
                expect(userMessage).toHaveClass('whitespace-pre-line');

                // Bot message should have markdown wrapper
                const botInitialMessage = screen.getByText(/Hi! I'm your AI financial assistant/i);
                const markdownWrapper = botInitialMessage.closest('[class*="prose"]');
                expect(markdownWrapper).toBeInTheDocument();
            });
        });
    });

    describe('Ternary Operator Coverage', () => {
        it('applies order-last class when message type is user', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test order' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                const message = screen.getByText('Test order');
                const maxWidthDiv = message.closest('div[class*="max-w"]');
                expect(maxWidthDiv).toHaveClass('order-last');
            });
        });

        it('does not apply order-last class when message type is bot', () => {
            renderComponent();
            const botMessage = screen.getByText(/Hi! I'm your AI financial assistant/i);
            const maxWidthDiv = botMessage.closest('div[class*="max-w"]');
            expect(maxWidthDiv).not.toHaveClass('order-last');
        });

        it('applies ml-auto class for user messages', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test ml-auto' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                const message = screen.getByText('Test ml-auto');
                const bubble = message.closest('.rounded-lg');
                expect(bubble).toHaveClass('ml-auto');
            });
        });

        it('does not apply ml-auto class for bot messages', () => {
            renderComponent();
            const botMessage = screen.getByText(/Hi! I'm your AI financial assistant/i);
            const bubble = botMessage.closest('.rounded-lg');
            expect(bubble).not.toHaveClass('ml-auto');
        });
    });

    describe('Conditional Rendering with && Operator', () => {
        it('renders bot avatar when message type is bot', () => {
            renderComponent();
            const brainIcons = screen.getAllByTestId('icon-brain');
            // Should have at least one for the initial bot message
            expect(brainIcons.length).toBeGreaterThan(0);
        });

        it('renders user avatar when message type is user', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Avatar test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                const userIcons = screen.getAllByTestId('icon-user');
                expect(userIcons.length).toBeGreaterThan(0);
            });
        });

        it('renders suggestions when message has suggestions and type is bot', () => {
            renderComponent();
            // Initial bot message has suggestions
            expect(screen.getByText('How much did I spend on food this month?')).toBeInTheDocument();
            expect(screen.getByText('Show me my spending trends')).toBeInTheDocument();
        });

        it('shows typing indicator when isTyping is true', async () => {
            let resolveResponse: any;
            global.fetch = vi.fn().mockImplementation(() =>
                new Promise(resolve => {
                    resolveResponse = resolve;
                })
            );

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test typing' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                const typingDots = document.querySelectorAll('.animate-bounce');
                expect(typingDots.length).toBe(3);
            });

            resolveResponse({
                ok: true,
                json: async () => ({ response: 'Done' })
            });
        });
    });

    describe('String Literal Coverage', () => {
        it('uses exact error message text', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Test error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Error test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('I cannot respond currently, there is some issue. Please try again later.')).toBeInTheDocument();
            });

            consoleSpy.mockRestore();
        });

        it('uses exact tip suggestion texts', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'tip' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('How can I reduce food expenses?')).toBeInTheDocument();
                expect(screen.getByText('Show me my savings progress')).toBeInTheDocument();
                expect(screen.getByText('Set up a budget reminder')).toBeInTheDocument();
            });
        });

        it('uses exact default suggestion texts', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'budget' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('Tell me more about this category')).toBeInTheDocument();
                expect(screen.getByText('How does this compare to last month?')).toBeInTheDocument();
                expect(screen.getByText('Give me improvement suggestions')).toBeInTheDocument();
            });
        });

        it('uses exact quick action query strings', async () => {
            renderComponent();

            const breakdownButton = screen.getByText('Spending Breakdown');
            fireEvent.click(breakdownButton);

            await waitFor(() => {
                expect(screen.getByText('Show me my spending breakdown by category this month')).toBeInTheDocument();
            });
        });

        it('uses exact data sharing popup text', async () => {
            mocks.useSettings.mockReturnValue({
                dataSharing: false,
            });

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('To use the AI Assistant, you need to enable data sharing in your settings. This allows us to analyze your expense data and provide personalized insights.')).toBeInTheDocument();
            });
        });
    });

    describe('Array and History Operations', () => {
        it('correctly slices history to last 6 messages', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            // Send 10 messages
            for (let i = 1; i <= 10; i++) {
                fireEvent.change(input, { target: { value: `Msg ${i}` } });
                const sendButtons = screen.getAllByRole('button');
                const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
                fireEvent.click(sendButton!);
                await waitFor(() => screen.getByText(`Msg ${i}`));
            }

            const fetchCalls = (global.fetch as any).mock.calls;
            const lastCall = fetchCalls[fetchCalls.length - 1];
            const body = JSON.parse(lastCall[1].body);

            // Should be exactly 6 or less
            expect(body.history.length).toBeLessThanOrEqual(6);
            expect(body.history.length).toBeGreaterThan(0);
        });

        it('maps message types correctly in history', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Test mapping' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => screen.getByText('This is an AI response'));

            fireEvent.change(input, { target: { value: 'Second' } });
            const sendButtons2 = screen.getAllByRole('button');
            const sendButton2 = sendButtons2.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton2!);

            await waitFor(() => {
                const fetchCalls = (global.fetch as any).mock.calls;
                const lastCall = fetchCalls[fetchCalls.length - 1];
                const body = JSON.parse(lastCall[1].body);

                // Check that roles are correctly mapped
                const roles = body.history.map((msg: any) => msg.role);
                expect(roles).toContain('user');
                expect(roles).toContain('assistant');
            });
        });
    });

    describe('Date and ID Generation', () => {
        it('generates message ID using Date.now()', async () => {
            const dateSpy = vi.spyOn(Date, 'now');
            dateSpy.mockReturnValue(123456789);

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'ID test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('ID test')).toBeInTheDocument();
            });

            expect(dateSpy).toHaveBeenCalled();
            dateSpy.mockRestore();
        });

        it('generates bot response ID using Date.now() + 1', async () => {
            const dateSpy = vi.spyOn(Date, 'now');
            dateSpy.mockReturnValue(999999);

            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Bot ID test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                expect(screen.getByText('This is an AI response')).toBeInTheDocument();
            });

            expect(dateSpy).toHaveBeenCalled();
            dateSpy.mockRestore();
        });

        it('creates new Date objects for timestamps', async () => {
            renderComponent();
            const input = screen.getByPlaceholderText(/Ask me about your expenses/i);

            fireEvent.change(input, { target: { value: 'Timestamp test' } });
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            fireEvent.click(sendButton!);

            await waitFor(() => {
                const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/);
                expect(timestamps.length).toBeGreaterThan(1);
            });
        });
    });
});


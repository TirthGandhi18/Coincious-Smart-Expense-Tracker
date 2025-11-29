import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chatbot } from './Chatbot';
import { BrowserRouter } from 'react-router-dom';

// --- Hoisted Mocks ---
const mocks = vi.hoisted(() => ({
    navigate: vi.fn(),
    getSession: vi.fn(),
    scrollIntoView: vi.fn(),
}));

// --- Mock Modules ---

vi.mock('../../App', () => ({
    useAuth: () => ({
        user: { id: 'test-user-123', email: 'test@example.com' },
    }),
}));

vi.mock('../ui/SettingContext', () => ({
    useSettings: () => ({
        dataSharing: true,
    }),
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

vi.stubGlobal('import.meta', {
    env: { VITE_API_URL: 'http://localhost:3000' }
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = mocks.scrollIntoView;

describe('Chatbot Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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

        it('renders quick action buttons', () => {
            renderComponent();
            expect(screen.getByText('Spending Breakdown')).toBeInTheDocument();
            expect(screen.getByText('Spending Trends')).toBeInTheDocument();
            expect(screen.getByText('Monthly Budget')).toBeInTheDocument();
            expect(screen.getByText('Group Expenses')).toBeInTheDocument();
        });

        it('renders message input field', () => {
            renderComponent();
            expect(screen.getByPlaceholderText(/Ask me about your expenses/i)).toBeInTheDocument();
        });

        it('renders send button', () => {
            renderComponent();
            const sendButtons = screen.getAllByRole('button');
            const sendButton = sendButtons.find(btn => btn.querySelector('[data-testid="icon-send"]'));
            expect(sendButton).toBeInTheDocument();
        });

        it('renders initial suggestions', () => {
            renderComponent();
            expect(screen.getByText('How much did I spend on food this month?')).toBeInTheDocument();
            expect(screen.getByText('Show me my spending trends')).toBeInTheDocument();
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
    });

    describe('Suggestion Buttons', () => {
        it('sends message when clicking a suggestion', async () => {
            renderComponent();

            const suggestion = screen.getByText('How much did I spend on food this month?');
            fireEvent.click(suggestion);

            await waitFor(() => {
                // Should appear twice - once in suggestions, once as user message
                const matches = screen.getAllByText('How much did I spend on food this month?');
                expect(matches.length).toBeGreaterThan(1);
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
                expect(screen.getByText(/I cannot respond currently/i)).toBeInTheDocument();
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


});

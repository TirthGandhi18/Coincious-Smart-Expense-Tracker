import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Support } from './Support';

// --- Mocks ---
// Mock UI components to isolate logic
vi.mock('../ui/card', () => ({
    Card: ({ children, className }: any) => <div className={`mock-card ${className}`}>{children}</div>,
    CardHeader: ({ children }: any) => <div className="mock-card-header">{children}</div>,
    CardTitle: ({ children }: any) => <div className="mock-card-title">{children}</div>,
    CardContent: ({ children }: any) => <div className="mock-card-content">{children}</div>,
}));

vi.mock('../ui/input', () => ({
    Input: (props: any) => <input data-testid="search-input" {...props} />,
}));

vi.mock('../ui/badge', () => ({
    Badge: ({ children }: any) => <span className="mock-badge">{children}</span>,
}));

vi.mock('../ui/accordion', () => ({
    Accordion: ({ children }: any) => <div className="mock-accordion">{children}</div>,
    AccordionItem: ({ children }: any) => <div className="mock-accordion-item">{children}</div>,
    AccordionTrigger: ({ children }: any) => <button className="mock-accordion-trigger">{children}</button>,
    AccordionContent: ({ children }: any) => <div className="mock-accordion-content">{children}</div>,
}));

vi.mock('../ui/button', () => ({
    Button: ({ children, onClick, className }: any) => (
        <button onClick={onClick} className={className}>
            {children}
        </button>
    ),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
    HelpCircle: () => <span>HelpCircle</span>,
    Mail: () => <span>Mail</span>,
    Search: () => <span>Search</span>,
    Clock: () => <span>Clock</span>,
    Book: () => <span>Book</span>,
    MessageCircle: () => <span>MessageCircle</span>,
    Calculator: () => <span>Calculator</span>,
    Settings: () => <span>Settings</span>,
    X: () => <span>X</span>,
    CreditCard: () => <span>CreditCard</span>,
    Copy: () => <span>Copy</span>,
    Check: () => <span>Check</span>,
}));

describe('Support Component', () => {
    const writeTextMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock clipboard API
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock,
            },
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders the support page correctly', () => {
        render(<Support />);
        expect(screen.getByText('Help & Support')).toBeInTheDocument();
        expect(screen.getByText('Get the help you need, when you need it')).toBeInTheDocument();
        expect(screen.getByText('Email Support')).toBeInTheDocument();
        expect(screen.getByText('Contact via Email')).toBeInTheDocument();
        expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });

    it('renders FAQ categories', () => {
        render(<Support />);
        expect(screen.getByText('Getting Started')).toBeInTheDocument();
        expect(screen.getByText('Expenses & Splitting')).toBeInTheDocument();
        expect(screen.getByText('Groups & Management')).toBeInTheDocument();
        expect(screen.getByText('Payments & Settlements')).toBeInTheDocument();
        expect(screen.getByText('Account & Settings')).toBeInTheDocument();
        expect(screen.getByText('Troubleshooting')).toBeInTheDocument();
    });

    it('filters FAQs based on search query', () => {
        render(<Support />);
        const searchInput = screen.getByTestId('search-input');

        // Search for "create group"
        fireEvent.change(searchInput, { target: { value: 'create group' } });

        // Should show "Getting Started" category
        expect(screen.getByText('Getting Started')).toBeInTheDocument();
        // Should NOT show "Payments & Settlements" (assuming no match)
        expect(screen.queryByText('Payments & Settlements')).not.toBeInTheDocument();

        // Specific question should be present (in the filtered list)
        expect(screen.getByText('How do I create my first expense group?')).toBeInTheDocument();
    });

    it('shows empty state when search yields no results', () => {
        render(<Support />);
        const searchInput = screen.getByTestId('search-input');

        fireEvent.change(searchInput, { target: { value: 'nonexistentterm123' } });

        expect(screen.getByText('No results found')).toBeInTheDocument();
        expect(screen.queryByText('Getting Started')).not.toBeInTheDocument();
    });

    it('opens and closes the email modal', () => {
        render(<Support />);

        // Open modal
        const contactButton = screen.getByText('Contact via Email');
        fireEvent.click(contactButton);

        expect(screen.getByText('Contact Support')).toBeInTheDocument();
        expect(screen.getByText('General Support')).toBeInTheDocument();
        expect(screen.getByText('Technical Issues')).toBeInTheDocument();

        // Close modal via X button
        const closeButton = screen.getByLabelText('Close modal');
        fireEvent.click(closeButton);

        expect(screen.queryByText('Contact Support')).not.toBeInTheDocument();
    });

    it('closes email modal when clicking backdrop', () => {
        const { container } = render(<Support />);

        fireEvent.click(screen.getByText('Contact via Email'));
        expect(screen.getByText('Contact Support')).toBeInTheDocument();

        // The backdrop is the div with `aria-hidden="true"` inside the fixed container.
        // It is a direct child of the div that contains the modal.
        // Let's find the "Contact Support" text, go to its container, then go to parent, then find the backdrop sibling.
        const modalTitle = screen.getByText('Contact Support');
        const modalContent = modalTitle.closest('.relative'); // The modal content div
        const backdropDiv = modalContent?.previousSibling as HTMLElement;

        fireEvent.click(backdropDiv);

        expect(screen.queryByText('Contact Support')).not.toBeInTheDocument();
    });

    it('copies email to clipboard when clicked', async () => {
        render(<Support />);

        fireEvent.click(screen.getByText('Contact via Email'));

        const generalSupportEmail = 'coincious.expensetracker@gmail.com';
        const generalSupportButton = screen.getByText(generalSupportEmail).closest('button');

        fireEvent.click(generalSupportButton!);

        expect(writeTextMock).toHaveBeenCalledWith(generalSupportEmail);

        // Check for "Check" icon (which indicates copied state)
        // We mocked Check component to render <span>Check</span>
        // Initially it shows Copy (<span>Copy</span>)
        // After click it should show Check

        await waitFor(() => {
            expect(screen.getAllByText('Check').length).toBeGreaterThan(0);
        });
    });

    it('copies technical email to clipboard', () => {
        render(<Support />);
        fireEvent.click(screen.getByText('Contact via Email'));

        const techEmail = 'technical@smartexpense.com';
        const techButton = screen.getByText(techEmail).closest('button');

        fireEvent.click(techButton!);

        expect(writeTextMock).toHaveBeenCalledWith(techEmail);
    });
});

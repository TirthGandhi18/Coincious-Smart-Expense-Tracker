import React, { useState, useEffect } from 'react';

// Icons (you can replace with your preferred icon library)
const PlusIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);

const DollarIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
);

const ReceiptIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5l-5-5v-5a1 1 0 00-1-1H9a1 1 0 00-1 1v5l-5 5V7a2 2 0 012-2h10a2 2 0 012 2v10z" />
    </svg>
);

const ChartIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const LoadingIcon = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

const CheckIcon = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const ClockIcon = () => (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ZapIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
);

const ExpenseTracker = () => {
    const [expenses, setExpenses] = useState([]);
    const [inputData, setInputData] = useState({
        merchant: '',
        amount: '',
        description: ''
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [apiStatus, setApiStatus] = useState('unknown');

    // Category configuration matching your design
    const categoryConfig = {
        'Shopping': {
            color: 'bg-blue-500',
            lightColor: 'bg-blue-100 text-blue-800',
            icon: '🛍️'
        },
        'Bills & Utilities': {
            color: 'bg-red-600',
            lightColor: 'bg-red-100 text-red-800',
            icon: '⚡'
        },
        'Food & Dining': {
            color: 'bg-red-400',
            lightColor: 'bg-red-100 text-red-800',
            icon: '🍽️'
        },
        'Transportation': {
            color: 'bg-orange-500',
            lightColor: 'bg-orange-100 text-orange-800',
            icon: '🚗'
        },
        'Health & Wellness': {
            color: 'bg-blue-700',
            lightColor: 'bg-blue-100 text-blue-800',
            icon: '🏥'
        },
        'Other': {
            color: 'bg-gray-500',
            lightColor: 'bg-gray-100 text-gray-800',
            icon: '📦'
        }
    };

    // Check API health on component mount
    useEffect(() => {
        checkApiHealth();
    }, []);

    const checkApiHealth = async () => {
        try {
            const response = await fetch('http://localhost:5005/api/health');
            if (response.ok) {
                const data = await response.json();
                setApiStatus(data.api_key_status === 'configured' ? 'ai-enabled' : 'rule-based');
            } else {
                setApiStatus('offline');
            }
        } catch (error) {
            setApiStatus('offline');
            console.log('Backend offline - this is normal if backend server is not running');
        }
    };

    const categorizeWithAPI = async (merchant, amount, description) => {
        setIsProcessing(true);
        setError('');

        try {
            const response = await fetch('http://localhost:5005/api/categorize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    merchant: merchant.trim(),
                    amount: parseFloat(amount),
                    description: description.trim()
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            setIsProcessing(false);
            return result;

        } catch (error) {
            setIsProcessing(false);
            console.error('Error categorizing expense:', error);
            setError(`Failed to categorize expense: ${error.message}`);
            throw error;
        }
    };

    const handleAddExpense = async () => {
        // Validation
        if (!inputData.merchant.trim()) {
            setError('Please enter a merchant name');
            return;
        }

        if (!inputData.amount || parseFloat(inputData.amount) <= 0) {
            setError('Please enter a valid amount greater than 0');
            return;
        }

        try {
            // Get AI categorization
            const aiResult = await categorizeWithAPI(
                inputData.merchant,
                inputData.amount,
                inputData.description
            );

            // Create new expense with AI categorization
            const newExpense = {
                id: Date.now(),
                merchant: inputData.merchant.trim(),
                amount: parseFloat(inputData.amount),
                description: inputData.description.trim(),
                timestamp: new Date().toLocaleString(),
                dateAdded: new Date().toISOString(),
                ...aiResult
            };

            // Add to expenses list (newest first)
            setExpenses(prevExpenses => [newExpense, ...prevExpenses]);

            // Clear input form
            setInputData({ merchant: '', amount: '', description: '' });
            setError('');

        } catch (error) {
            // Error already handled in categorizeWithAPI
        }
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter' && !isProcessing) {
            handleAddExpense();
        }
    };

    const fillExample = (merchant, amount, description) => {
        setInputData({ merchant, amount, description });
    };

    const deleteExpense = (id) => {
        setExpenses(prevExpenses => prevExpenses.filter(exp => exp.id !== id));
    };

    const clearAllExpenses = () => {
        if (window.confirm('Are you sure you want to clear all expenses?')) {
            setExpenses([]);
        }
    };

    // Calculate category totals for summary
    const getCategoryTotals = () => {
        const totals = {};
        expenses.forEach(expense => {
            const category = expense.category || 'Other';
            totals[category] = (totals[category] || 0) + expense.amount;
        });

        return Object.entries(totals)
            .map(([category, total]) => ({ category, total }))
            .sort((a, b) => b.total - a.total);
    };

    const categoryTotals = getCategoryTotals();
    const grandTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const getStatusBadge = () => {
        const badges = {
            'ai-enabled': { text: 'AI Enabled', color: 'bg-green-100 text-green-800' },
            'rule-based': { text: 'Rule-Based', color: 'bg-yellow-100 text-yellow-800' },
            'offline': { text: 'API Offline', color: 'bg-red-100 text-red-800' },
            'unknown': { text: 'Checking...', color: 'bg-gray-100 text-gray-800' }
        };

        const badge = badges[apiStatus] || badges.unknown;
        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                {badge.text}
            </span>
        );
    };

    const exportExpenses = () => {
        if (expenses.length === 0) {
            alert('No expenses to export');
            return;
        }

        const csvContent = [
            ['Date', 'Merchant', 'Amount', 'Category', 'Subcategory', 'Description', 'Confidence'],
            ...expenses.map(exp => [
                exp.timestamp,
                exp.merchant,
                exp.amount.toFixed(2),
                exp.category || 'Other',
                exp.subcategory || '',
                exp.description || '',
                (exp.confidence || 0) + '%'
            ])
        ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-3">
                    <ZapIcon className="text-purple-600" />
                    AI Expense Tracker
                </h1>
                <p className="text-gray-600 text-lg mb-2">
                    Enter your expenses and let AI automatically categorize them
                </p>
                {getStatusBadge()}
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                        <div className="text-red-400">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                        <div className="ml-auto">
                            <button
                                onClick={() => setError('')}
                                className="text-red-400 hover:text-red-600"
                            >
                                <span className="sr-only">Dismiss</span>
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column - Input Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 sticky top-6">
                        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-gray-800">
                            <PlusIcon />
                            Add Expense
                        </h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Merchant/Store Name *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., Starbucks, Amazon, Shell"
                                    value={inputData.merchant}
                                    onChange={(e) => setInputData({ ...inputData, merchant: e.target.value })}
                                    onKeyPress={handleKeyPress}
                                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Amount *
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                        <DollarIcon />
                                    </div>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={inputData.amount}
                                        onChange={(e) => setInputData({ ...inputData, amount: e.target.value })}
                                        onKeyPress={handleKeyPress}
                                        className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg"
                                        step="0.01"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., morning coffee, gas fill-up"
                                    value={inputData.description}
                                    onChange={(e) => setInputData({ ...inputData, description: e.target.value })}
                                    onKeyPress={handleKeyPress}
                                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg"
                                />
                            </div>

                            <button
                                onClick={handleAddExpense}
                                disabled={isProcessing || !inputData.merchant.trim() || !inputData.amount}
                                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-purple-300 disabled:to-purple-400 text-white px-6 py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
                            >
                                {isProcessing ? (
                                    <>
                                        <LoadingIcon />
                                        AI Processing...
                                    </>
                                ) : (
                                    <>
                                        <ZapIcon />
                                        Categorize with AI
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Quick Examples */}
                        <div className="mt-6 p-4 bg-purple-50 rounded-xl">
                            <h4 className="font-semibold text-purple-900 mb-2">Try these examples:</h4>
                            <div className="text-sm text-purple-700 space-y-2">
                                <div
                                    className="cursor-pointer hover:text-purple-900 hover:bg-purple-100 p-2 rounded transition-colors"
                                    onClick={() => fillExample('Amazon', '67.43', 'wireless headphones')}
                                >
                                    📦 Amazon - $67.43 - wireless headphones
                                </div>
                                <div
                                    className="cursor-pointer hover:text-purple-900 hover:bg-purple-100 p-2 rounded transition-colors"
                                    onClick={() => fillExample('Starbucks', '4.50', 'morning coffee')}
                                >
                                    ☕ Starbucks - $4.50 - morning coffee
                                </div>
                                <div
                                    className="cursor-pointer hover:text-purple-900 hover:bg-purple-100 p-2 rounded transition-colors"
                                    onClick={() => fillExample('Comcast', '79.99', 'internet bill')}
                                >
                                    📡 Comcast - $79.99 - internet bill
                                </div>
                                <div
                                    className="cursor-pointer hover:text-purple-900 hover:bg-purple-100 p-2 rounded transition-colors"
                                    onClick={() => fillExample('Shell', '45.20', 'gas fill-up')}
                                >
                                    ⛽ Shell - $45.20 - gas fill-up
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Middle Column - Recent Expenses */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <ReceiptIcon />
                                Recent Expenses ({expenses.length})
                            </h3>
                            {expenses.length > 0 && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={exportExpenses}
                                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                                    >
                                        Export CSV
                                    </button>
                                    <button
                                        onClick={clearAllExpenses}
                                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            )}
                        </div>

                        {expenses.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <div className="mx-auto mb-4 text-gray-300" style={{ fontSize: '4rem' }}>📋</div>
                                <p className="text-lg font-medium">No expenses yet</p>
                                <p className="text-sm">Add your first expense to see AI categorization!</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {expenses.slice(0, 8).map((expense) => (
                                    <div key={expense.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-lg text-gray-900">{expense.merchant}</h4>
                                                {expense.description && (
                                                    <p className="text-gray-600 text-sm mt-1">{expense.description}</p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-xl text-gray-900">${expense.amount.toFixed(2)}</p>
                                                <button
                                                    onClick={() => deleteExpense(expense.id)}
                                                    className="text-red-400 hover:text-red-600 text-xs mt-1"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${categoryConfig[expense.category]?.lightColor || 'bg-gray-100 text-gray-800'}`}>
                                                {categoryConfig[expense.category]?.icon || '📦'} {expense.category}
                                            </span>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <CheckIcon />
                                                {expense.confidence || 0}% confident
                                            </div>
                                        </div>

                                        {expense.reasoning && (
                                            <p className="text-xs text-gray-500 mb-2 italic">"{expense.reasoning}"</p>
                                        )}

                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <ClockIcon />
                                                {expense.processingTime} • {expense.aiModel || 'AI'}
                                            </div>
                                            <span>{expense.timestamp}</span>
                                        </div>
                                    </div>
                                ))}

                                {expenses.length > 8 && (
                                    <div className="text-center pt-4 text-sm text-gray-500">
                                        ... and {expenses.length - 8} more expenses
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Category Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <ChartIcon />
                            Spending Summary
                        </h3>

                        {categoryTotals.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <div className="mx-auto mb-4 text-gray-300" style={{ fontSize: '4rem' }}>📊</div>
                                <p className="text-lg font-medium">No data yet</p>
                                <p className="text-sm">Add expenses to see your spending breakdown</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {categoryTotals.map(({ category, total }) => (
                                    <div key={category} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className={`w-4 h-4 rounded-full ${categoryConfig[category]?.color || 'bg-gray-500'}`}></div>
                                        <div className="flex-1 flex justify-between items-center">
                                            <span className="font-medium text-gray-800">
                                                {categoryConfig[category]?.icon || '📦'} {category}
                                            </span>
                                            <span className="font-bold text-lg text-gray-900">
                                                ${total.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                <div className="border-t pt-4 mt-6">
                                    <div className="flex justify-between items-center bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                                        <span className="font-bold text-purple-900 text-lg">Total Spending</span>
                                        <span className="font-bold text-2xl text-purple-900">
                                            ${grandTotal.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <p className="text-2xl font-bold text-gray-900">{expenses.length}</p>
                                        <p className="text-sm text-gray-600">Total Expenses</p>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <p className="text-2xl font-bold text-gray-900">${expenses.length > 0 ? (grandTotal / expenses.length).toFixed(2) : '0.00'}</p>
                                        <p className="text-sm text-gray-600">Average Amount</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* API Status Card */}
                    <div className="mt-6 bg-white rounded-xl shadow border border-gray-200 p-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                            🤖 AI Status
                        </h4>
                        <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex justify-between">
                                <span>API Status:</span>
                                {getStatusBadge()}
                            </div>
                            <div className="flex justify-between">
                                <span>Categories:</span>
                                <span className="font-medium">{Object.keys(categoryConfig).length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Processing:</span>
                                <span className="font-medium">{isProcessing ? 'Active' : 'Ready'}</span>
                            </div>
                        </div>

                        {apiStatus === 'offline' && (
                            <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                                💡 Start the backend server to enable AI categorization
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseTracker;
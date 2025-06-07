import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PlusCircle, Trash2, Edit, Save, X, DollarSign, TrendingUp, TrendingDown, Landmark, CreditCard, Car } from 'lucide-react';

// Mock Date for consistent results - in a real app, use new Date()
const MOCK_CURRENT_DATE = new Date('2025-06-06T12:00:00.000Z');

// --- Helper Functions ---
const getNextPaymentDate = (startDate, frequency) => {
    const nextDate = new Date(startDate); // startDate is expected to be a Date object
    nextDate.setHours(0, 0, 0, 0);

    if (frequency === 'one-time') {
        return nextDate; // For one-time events, the "next" date is the start date itself.
    }

    const today = new Date(MOCK_CURRENT_DATE); // Use a new Date instance to avoid modifying MOCK_CURRENT_DATE
    today.setHours(0, 0, 0, 0);

    // Optimization jump block: If nextDate is far in the past, jump closer to today.
    if (nextDate < today) {
        switch (frequency) {
            case 'weekly': {
                const diffTime = today.getTime() - nextDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays >= 7) {
                    const numWeeks = Math.floor(diffDays / 7);
                    nextDate.setDate(nextDate.getDate() + numWeeks * 7);
                }
                break;
            }
            case 'bi-weekly': {
                const diffTime = today.getTime() - nextDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays >= 14) {
                    const numPeriods = Math.floor(diffDays / 14);
                    nextDate.setDate(nextDate.getDate() + numPeriods * 14);
                }
                break;
            }
            case 'monthly': {
                let monthDiff = (today.getFullYear() - nextDate.getFullYear()) * 12 + today.getMonth() - nextDate.getMonth();
                if (monthDiff > 0) { // Ensure there's an actual difference to jump
                    nextDate.setMonth(nextDate.getMonth() + monthDiff);
                     // If the jump overshot (e.g., Jan 31 + 1 month = Mar 3, but we want Feb 28)
                     // or if it landed past today (e.g. jumped from Jan 15 to June 15, today is June 6)
                     // pull back one month. The subsequent while loop will fine-tune.
                    if (nextDate > today) {
                        nextDate.setMonth(nextDate.getMonth() - 1);
                    }
                }
                break;
            }
            case 'annually': {
                let yearDiff = today.getFullYear() - nextDate.getFullYear();
                if (yearDiff > 0) { // Ensure there's an actual difference to jump
                    nextDate.setFullYear(nextDate.getFullYear() + yearDiff);
                    // If the jump overshot (e.g. due to leap year day changes or specific date like Feb 29)
                    // or if it landed past today, pull back one year.
                    if (nextDate > today) {
                        nextDate.setFullYear(nextDate.getFullYear() - 1);
                    }
                }
                break;
            }
        }
    }

    // Iterative refinement: Ensure nextDate is the first occurrence on or after today.
    // This loop will also handle cases where startDate was already >= today or very close.
    // For 'one-time' frequency, this block is skipped due to the early return.
    switch (frequency) {
        case 'weekly':
            while (nextDate < today) nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'bi-weekly':
            while (nextDate < today) nextDate.setDate(nextDate.getDate() + 14);
            break;
        case 'monthly':
            // This loop is critical. If nextDate is (e.g.) May 30 and today is June 5,
            // and the jump landed it on May 30 (because monthDiff was 0 as same month after a year jump),
            // this loop will advance it to June 30.
            // Or if startDate is May 15, today June 6. Jump to May 15. Loop advances to June 15.
            while (nextDate < today) {
                 // Special handling for advancing months to avoid issues like Jan 31 -> Mar 3 (should be Feb 28/29)
                 // However, a simple +1 month is usually what's implied by "monthly from X date".
                 // For true end-of-month stability, one might need more complex date logic or a library.
                 // The current approach is standard for simple monthly recurrence.
                nextDate.setMonth(nextDate.getMonth() + 1);
            }
            break;
        case 'annually':
             while (nextDate < today) nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        // No default needed as 'one-time' is handled, and other frequencies are covered.
    }
    return nextDate;
};

const calculatePaymentsMade = (debt, upToDate) => {
    let totalPayments = 0;
    let paymentDate = new Date(debt.startDate + 'T00:00:00'); // Ensure time is neutral for date comparisons
    const processingDate = new Date(upToDate);
    processingDate.setHours(0,0,0,0); // Normalize upToDate to compare dates only

    if (debt.frequency === 'one-time') {
        return paymentDate <= processingDate ? Math.min(debt.paymentAmount, debt.totalOwed) : 0;
    }

    while (paymentDate <= processingDate) {
        totalPayments += debt.paymentAmount;
        if (totalPayments >= debt.totalOwed) {
            totalPayments = debt.totalOwed;
            break;
        }

        // Advance paymentDate
        const currentMonth = paymentDate.getMonth();
        switch (debt.frequency) {
            case 'weekly':
                paymentDate.setDate(paymentDate.getDate() + 7);
                break;
            case 'bi-weekly':
                paymentDate.setDate(paymentDate.getDate() + 14);
                break;
            case 'monthly':
                // Handle advancing month correctly, especially for end-of-month dates
                paymentDate.setMonth(paymentDate.getMonth() + 1);
                // If month didn't advance as expected (e.g. Jan 31 to Feb 28, then to Mar 28 instead of Mar 31)
                // This is a complex problem. For now, simple month advance.
                // A more robust solution might involve libraries like date-fns or moment.js for date math.
                break;
            case 'annually':
                paymentDate.setFullYear(paymentDate.getFullYear() + 1);
                break;
            default: // Should not happen if frequency is validated
                return totalPayments;
        }
    }
    return totalPayments;
};


// --- Main App Component ---
export default function App() {
    // --- State Management ---
    const [currentBalance, setCurrentBalance] = useState(5000);
    const [debts, setDebts] = useState([
        { id: 1, name: 'Car Loan', totalOwed: 15000, paymentAmount: 350, frequency: 'monthly', startDate: '2025-06-15' },
        { id: 2, name: 'Credit Card', totalOwed: 2500, paymentAmount: 100, frequency: 'monthly', startDate: '2025-06-25' },
    ]);
    const [bills, setBills] = useState([
        { id: 1, name: 'Rent', amount: 1200, frequency: 'monthly', startDate: '2025-06-01' },
        { id: 2, name: 'Internet', amount: 80, frequency: 'monthly', startDate: '2025-06-20' },
        { id: 3, name: 'Gym', amount: 40, frequency: 'monthly', startDate: '2025-06-10' },
    ]);
    const [incomes, setIncomes] = useState([
        { id: 1, name: 'Paycheck', amount: 2000, frequency: 'bi-weekly', startDate: '2025-06-13' },
    ]);
    
    const [editingItemId, setEditingItemId] = useState(null);
    const [editFormData, setEditFormData] = useState(null);
    const [newItem, setNewItem] = useState({ type: null, data: {} });

    // --- Memoized Timeline Calculation ---
    const timelineEvents = useMemo(() => {
        const events = [];
        const today = MOCK_CURRENT_DATE;
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 90);

        const generateEvents = (source, type, amountKey) => {
            source.forEach(item => {
                let currentDate = getNextPaymentDate(new Date(item.startDate + 'T00:00:00'), item.frequency);
                while (currentDate <= endDate) {
                    events.push({
                        date: new Date(currentDate),
                        description: item.name,
                        amount: item[amountKey],
                        type,
                    });
                    if (item.frequency === 'one-time') break;
                    
                    const nextDate = new Date(currentDate);
                    switch (item.frequency) {
                        case 'weekly':
                            nextDate.setDate(nextDate.getDate() + 7);
                            break;
                        case 'bi-weekly':
                            nextDate.setDate(nextDate.getDate() + 14);
                            break;
                        case 'monthly':
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            break;
                        case 'annually':
                            nextDate.setFullYear(nextDate.getFullYear() + 1);
                            break;
                    }
                    currentDate = nextDate;
                }
            });
        };
        
        generateEvents(incomes, 'income', 'amount');
        generateEvents(bills, 'expense', 'amount');
        generateEvents(debts, 'expense', 'paymentAmount');

        events.sort((a, b) => a.date - b.date);

        let runningBalance = currentBalance;
        return events.map(event => {
            runningBalance += (event.type === 'income' ? event.amount : -event.amount);
            return { ...event, runningBalance: runningBalance.toFixed(2) };
        });
    }, [currentBalance, debts, bills, incomes]);

    const chartData = useMemo(() => {
        const dataMap = new Map();
        timelineEvents.forEach(event => {
            const week = `Week of ${new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate() - event.date.getDay()).toLocaleDateString()}`;
            if (!dataMap.has(week)) {
                dataMap.set(week, { name: week, income: 0, expenses: 0 });
            }
            const weekData = dataMap.get(week);
            if (event.type === 'income') {
                weekData.income += event.amount;
            } else {
                weekData.expenses += event.amount;
            }
        });
        return Array.from(dataMap.values());
    }, [timelineEvents]);

    // --- Handlers ---
    const handleAddItem = (type) => {
        let defaultData;
        switch(type) {
            case 'debt': defaultData = { name: '', totalOwed: '0', paymentAmount: '0', frequency: 'monthly', startDate: '' }; break;
            case 'bill': defaultData = { name: '', amount: '0', frequency: 'monthly', startDate: '' }; break;
            case 'income': defaultData = { name: '', amount: '0', frequency: 'bi-weekly', startDate: '' }; break;
            default: return;
        }
        setNewItem({ type, data: defaultData });
    };

    const handleSaveNewItem = () => {
        const { type, data } = newItem;

        if (!data.startDate) {
            alert('Start date is required.');
            return;
        }

        const id = Date.now();
        const itemWithId = {
            ...data,
            id,
            totalOwed: parseFloat(data.totalOwed) || 0,
            paymentAmount: parseFloat(data.paymentAmount) || 0,
            amount: parseFloat(data.amount) || 0
        };

        switch(type) {
            case 'debt': setDebts([...debts, itemWithId]); break;
            case 'bill': setBills([...bills, itemWithId]); break;
            case 'income': setIncomes([...incomes, itemWithId]); break;
            default: return;
        }
        setNewItem({ type: null, data: {} });
    };

    const handleDeleteItem = (type, id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        switch(type) {
            case 'debt': setDebts(debts.filter(d => d.id !== id)); break;
            case 'bill': setBills(bills.filter(b => b.id !== id)); break;
            case 'income': setIncomes(incomes.filter(i => i.id !== id)); break;
            default: return;
        }
    };

    const handleStartEdit = (type, item) => {
        setEditingItemId(item.id);
        const formattedStartDate = item.startDate ? new Date(item.startDate + 'T00:00:00').toISOString().split('T')[0] : '';
        setEditFormData({ ...item, type, startDate: formattedStartDate });
    };

    const handleCancelEdit = () => {
        setEditingItemId(null);
        setEditFormData(null);
    };

    const handleSaveEditedItem = () => {
        if (!editFormData) return;

        if (!editFormData.startDate) {
            alert('Start date is required.');
            return;
        }

        const { type, ...data } = editFormData;

        // data already contains id, name, frequency, startDate (potentially formatted for input)
        // and the numerical values as strings from the form.
        const savedData = {
            ...data, // Includes id, name, frequency, potentially formatted startDate
            totalOwed: parseFloat(data.totalOwed) || 0,
            paymentAmount: parseFloat(data.paymentAmount) || 0,
            amount: parseFloat(data.amount) || 0
            // Note: startDate from editFormData is already in YYYY-MM-DD string format,
            // which is the format currently used for storage.
        };

        switch(type) {
            case 'debt':
                setDebts(debts.map(d => d.id === savedData.id ? savedData : d));
                break;
            case 'bill':
                setBills(bills.map(b => b.id === savedData.id ? savedData : b));
                break;
            case 'income':
                setIncomes(incomes.map(i => i.id === savedData.id ? savedData : i));
                break;
            default: return;
        }
        handleCancelEdit();
    };

    const handleChangeEditForm = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };
    
    // --- Render Functions ---
    const renderItemRow = (item, type) => {
        const isEditing = editingItemId === item.id;
        const ItemIcon = { debt: Car, bill: CreditCard, income: DollarSign }[type];

        let displayedOwed = item.totalOwed;
        if (type === 'debt' && !isEditing) { // Only calculate for display, not during edit mode for totalOwed
            const paymentsMade = calculatePaymentsMade(item, MOCK_CURRENT_DATE);
            displayedOwed = Math.max(0, item.totalOwed - paymentsMade);
        }

        if (isEditing && editFormData) {
            const fields = {
                debt: ['name', 'totalOwed', 'paymentAmount', 'frequency', 'startDate'],
                bill: ['name', 'amount', 'frequency', 'startDate'],
                income: ['name', 'amount', 'frequency', 'startDate'],
            }[type];

            return (
                <div key={item.id} className="grid grid-cols-4 md:grid-cols-6 gap-2 items-center p-3 bg-slate-700 rounded-lg mb-2">
                    {/* Column 1: Name (All types) */}
                    <div className="col-span-1 md:col-span-1">
                        <input type="text" name="name" value={editFormData.name} onChange={handleChangeEditForm} className="w-full bg-slate-800 border border-slate-600 rounded-md p-1 text-sm text-white" placeholder="Name" />
                    </div>

                    {/* Column 2: TotalOwed (Debt) / Amount (Bill/Income) */}
                    <div className="text-center">
                        {type === 'debt' ? (
                            <input type="number" name="totalOwed" value={editFormData.totalOwed} onChange={handleChangeEditForm} className="w-full bg-slate-800 border border-slate-600 rounded-md p-1 text-sm text-white" placeholder="Total Owed" />
                        ) : (
                            <input type="number" name="amount" value={editFormData.amount} onChange={handleChangeEditForm} className="w-full bg-slate-800 border border-slate-600 rounded-md p-1 text-sm text-white" placeholder="Amount" />
                        )}
                    </div>

                    {/* Column 3: PaymentAmount (Debt) / Frequency (Bill/Income) */}
                    <div className="text-center">
                        {type === 'debt' ? (
                            <input type="number" name="paymentAmount" value={editFormData.paymentAmount} onChange={handleChangeEditForm} className="w-full bg-slate-800 border border-slate-600 rounded-md p-1 text-sm text-white" placeholder="Payment" />
                        ) : (
                            <select name="frequency" value={editFormData.frequency} onChange={handleChangeEditForm} className="w-full bg-slate-800 border border-slate-600 rounded-md p-1 text-sm text-white">
                                <option value="weekly">Weekly</option>
                                <option value="bi-weekly">Bi-Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="annually">Annually</option>
                                <option value="one-time">One-Time</option>
                            </select>
                        )}
                    </div>

                    {/* Column 4: Frequency (Debt) / Start Date (Bill/Income, small screens) / Empty (Bill/Income, md screens) */}
                    {/* This column's content depends on type and screen size */}
                    {type === 'debt' ? (
                        // For Debt: Frequency (visible on md+ screens, hidden on sm)
                        <div className="hidden md:block text-center">
                            <select name="frequency" value={editFormData.frequency} onChange={handleChangeEditForm} className="w-full bg-slate-800 border border-slate-600 rounded-md p-1 text-sm text-white">
                                <option value="weekly">Weekly</option>
                                <option value="bi-weekly">Bi-Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="annually">Annually</option>
                                <option value="one-time">One-Time</option>
                            </select>
                        </div>
                    ) : (
                        // For Bill/Income: This is the 4th column.
                        // On small screens, it's not used (Name, Amount, Frequency, Actions = 4 cells).
                        // On md+ screens, it's an empty placeholder to align with Debt's Frequency column.
                        <div className="hidden md:block"></div> // Empty placeholder for Bill/Income on md screens
                    )}

                    {/* Column 5: StartDate (All types, but hidden on small screens for all) */}
                    {/* For Debt: hidden on small screens (Name, TotalOwed, Payment, Actions). Visible on md+. */}
                    {/* For Bill/Income: hidden on small screens (Name, Amount, Frequency, Actions). Visible on md+. */}
                    <div className="hidden md:block text-center">
                        <input type="date" name="startDate" value={editFormData.startDate} onChange={handleChangeEditForm} className="w-full bg-slate-800 border border-slate-600 rounded-md p-1 text-sm text-white" />
                    </div>

                    {/* Column 6 (md) / Column 4 (sm): Actions */}
                    <div className="flex justify-end gap-2 items-center"> {/* This will take the last available column */}
                        <button onClick={handleSaveEditedItem} className="p-2 text-green-400 hover:text-green-300 transition-colors"><Save size={18} /></button>
                        <button onClick={handleCancelEdit} className="p-2 text-gray-400 hover:text-gray-300 transition-colors"><X size={18} /></button>
                    </div>
                </div>
            );
        }

        // Display Mode
        const nextDateStr = getNextPaymentDate(new Date(item.startDate + 'T00:00:00'), item.frequency).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });

        return (
            <div key={item.id} className="group grid grid-cols-4 md:grid-cols-7 gap-2 items-center p-2 bg-white/5 rounded-lg mb-2">
                {/* Column 1: Name */}
                <div className="col-span-2 md:col-span-2 flex items-center gap-2">
                   <ItemIcon className="w-5 h-5 text-indigo-400 hidden sm:block" />
                   <span>{item.name}</span>
                </div>

                {/* Column 2: Total Owed (Debt) / Empty placeholder (Bill/Income for MD) */}
                {type === 'debt' ? (
                    <div className="hidden md:block text-center">${displayedOwed.toFixed(2)}</div>
                ) : (
                    <div className="hidden md:block"></div> /* Align Bill/Income Amount with Debt's PaymentAmount column */
                )}

                {/* Column 3: Payment Amount (Debt) / Amount (Bill/Income) */}
                {/* For SM screens, this is the first data column after Name for Debts, and for Bills/Incomes */}
                <div className="text-center">${(type === 'debt' ? item.paymentAmount : item.amount).toFixed(2)}</div>

                {/* Column 4: Frequency (All types, but hidden on SM for Debt and Bill/Income) */}
                {type === 'debt' ? (
                    <div className="hidden md:block text-center capitalize">{item.frequency}</div>
                ) : (
                    // For Bills/Incomes, this is Frequency, hidden on SM
                    <div className="hidden md:block text-center capitalize">{item.frequency}</div>
                )}

                {/* Column 5: Next Due Date (All types, MD screens only for this dedicated column) */}
                <div className="hidden md:block text-center">
                    {nextDateStr}
                </div>

                {/* Column 6: Actions (All types) */}
                <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 ease-in-out">
                     <button onClick={() => handleStartEdit(type, item)} className="p-2 text-blue-400 hover:text-blue-300 transition-colors"><Edit size={18} /></button>
                     <button onClick={() => handleDeleteItem(type, item.id)} className="p-2 text-red-400 hover:text-red-300 transition-colors"><Trash2 size={18} /></button>
                </div>
            </div>
        );
    };
    
    const renderNewItemForm = () => {
        if (!newItem.type) return null;
        const { type, data } = newItem;
        const fields = {
            debt: ['name', 'totalOwed', 'paymentAmount', 'frequency', 'startDate'],
            bill: ['name', 'amount', 'frequency', 'startDate'],
            income: ['name', 'amount', 'frequency', 'startDate'],
        }[type];
        
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700 shadow-2xl">
                    <h3 className="text-xl font-bold mb-4 text-white capitalize">Add New {type}</h3>
                    <div className="space-y-4">
                        {fields.map(field => (
                            <div key={field}>
                                <label className="text-sm font-medium text-slate-400 capitalize block mb-1">{field.replace(/([A-Z])/g, ' $1')}</label>
                                {field === 'frequency' ? (
                                     <select value={data[field]} onChange={e => setNewItem({...newItem, data: {...data, [field]: e.target.value}})} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-white">
                                        <option value="weekly">Weekly</option>
                                        <option value="bi-weekly">Bi-Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="annually">Annually</option>
                                        <option value="one-time">One-Time</option>
                                     </select>
                                ) : (
                                    <input
                                        type={field.includes('Date') ? 'date' : (field.includes('Amount') || field.includes('Owed')) ? 'number' : 'text'}
                                        placeholder={`Enter ${field}`}
                                        value={data[field]}
                                        onChange={e => setNewItem({...newItem, data: {...data, [field]: e.target.value}})}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-white"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                         <button onClick={() => setNewItem({ type: null, data: {} })} className="px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-colors"><X className="w-4 h-4 inline-block mr-1"/>Cancel</button>
                         <button onClick={handleSaveNewItem} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"><Save className="w-4 h-4 inline-block mr-1"/>Save</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-slate-900 text-slate-200 min-h-screen font-sans p-4 sm:p-6 lg:p-8">
            {renderNewItemForm()}
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Financial Forecaster</h1>
                    <p className="text-slate-400 mt-1">Project your cash flow for the next 90 days.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Timeline & Chart */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Current Balance */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                            <label htmlFor="currentBalance" className="text-lg font-semibold text-white flex items-center gap-2">
                                <Landmark className="text-indigo-400"/>
                                Current Bank Balance
                            </label>
                            <div className="mt-2 flex items-center">
                                <span className="text-3xl text-slate-400 font-mono mr-2">$</span>
                                <input
                                    id="currentBalance"
                                    type="number"
                                    value={currentBalance}
                                    onChange={e => setCurrentBalance(parseFloat(e.target.value) || 0)}
                                    className="text-3xl font-bold bg-transparent w-full focus:outline-none text-white"
                                />
                            </div>
                        </div>

                        {/* 90-Day Timeline */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-white mb-4">90-Day Forecast Timeline</h2>
                            <div className="h-[500px] overflow-y-auto pr-3 space-y-4 relative">
                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-700"></div>
                                {timelineEvents.length > 0 ? timelineEvents.map((event, index) => (
                                    <div key={index} className="flex items-start gap-4 pl-8 relative">
                                        <div className={`absolute left-0 top-1.5 transform -translate-x-1/2 w-4 h-4 rounded-full border-2 border-slate-700 ${event.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <div className="flex-shrink-0 w-24 text-sm text-slate-400 font-medium">
                                            {event.date.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}
                                        </div>
                                        <div className="flex-grow bg-slate-800 p-3 rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-white">{event.description}</span>
                                                <span className={`font-bold ${event.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                                    {event.type === 'income' ? '+' : '-'}${event.amount.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-400 mt-1">
                                                New Balance: <span className="font-mono text-indigo-300">${event.runningBalance}</span>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-10 text-slate-500">
                                        <p>No upcoming transactions in the next 90 days.</p>
                                        <p className="text-sm">Add income, bills, or debts to see your forecast.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                         {/* Weekly Summary Chart */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-white mb-4">Weekly Cash Flow Summary</h2>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }}
                                            labelStyle={{ color: '#f1f5f9' }}
                                            itemStyle={{ fontWeight: 'bold' }}
                                        />
                                        <Legend wrapperStyle={{fontSize: "14px"}}/>
                                        <Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Data Management */}
                    <div className="space-y-8">
                        {/* Income */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2"><TrendingUp className="text-green-400"/>Incomes</h2>
                                <button onClick={() => handleAddItem('income')} className="flex items-center gap-1 text-sm bg-green-600/20 text-green-300 px-3 py-1 rounded-full hover:bg-green-600/40 transition-colors">
                                    <PlusCircle size={16} /> Add
                                </button>
                            </div>
                            <div className="grid grid-cols-4 md:grid-cols-7 gap-2 text-sm font-semibold text-slate-400 mb-2 px-3">
                                <div className="col-span-2 md:col-span-2">Name</div>
                                <div className="hidden md:block text-center"></div> {/* Empty header for MD's 2nd col */}
                                <div className="text-center">Amount</div>
                                <div className="hidden md:block text-center">Frequency</div>
                                <div className="hidden md:block text-center">Next Date</div>
                                <div className="text-right">Actions</div>
                            </div>
                            <div className="space-y-2">
                               {incomes.map(item => renderItemRow(item, 'income'))}
                            </div>
                        </div>

                        {/* Debts */}
                         <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Car className="text-red-400"/>Debts</h2>
                                <button onClick={() => handleAddItem('debt')} className="flex items-center gap-1 text-sm bg-red-600/20 text-red-300 px-3 py-1 rounded-full hover:bg-red-600/40 transition-colors">
                                    <PlusCircle size={16} /> Add
                                </button>
                            </div>
                             <div className="grid grid-cols-4 md:grid-cols-7 gap-2 text-sm font-semibold text-slate-400 mb-2 px-3">
                                <div className="col-span-2 md:col-span-2">Name</div>
                                <div className="hidden md:block text-center">Total Owed</div>
                                <div className="text-center">Payment</div>
                                <div className="hidden md:block text-center">Frequency</div>
                                <div className="hidden md:block text-center">Next Due</div>
                                <div className="text-right">Actions</div>
                            </div>
                             <div className="space-y-2">
                                {debts.map(item => renderItemRow(item, 'debt'))}
                            </div>
                        </div>

                        {/* Bills */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                           <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2"><CreditCard className="text-orange-400"/>Bills</h2>
                                <button onClick={() => handleAddItem('bill')} className="flex items-center gap-1 text-sm bg-orange-600/20 text-orange-300 px-3 py-1 rounded-full hover:bg-orange-600/40 transition-colors">
                                    <PlusCircle size={16} /> Add
                                </button>
                            </div>
                             <div className="grid grid-cols-4 md:grid-cols-7 gap-2 text-sm font-semibold text-slate-400 mb-2 px-3">
                                <div className="col-span-2 md:col-span-2">Name</div>
                                <div className="hidden md:block text-center"></div> {/* Empty header for MD's 2nd col */}
                                <div className="text-center">Amount</div>
                                <div className="hidden md:block text-center">Frequency</div>
                                <div className="hidden md:block text-center">Next Date</div>
                                <div className="text-right">Actions</div>
                            </div>
                            <div className="space-y-2">
                                {bills.map(item => renderItemRow(item, 'bill'))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

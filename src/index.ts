import express, { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Server, StableBTreeMap, ic } from 'azle';
import 'reflect-metadata';

class Expense {
    id: string;
    amount: number;
    category: string;  //invoice/payment dropdown
    recipient: string;   //sending to or receiving from
    notes: string;
    time: Date;
    status: boolean;    //in process/ done dropdown
}

const expenseStorage = StableBTreeMap<string, Expense>(0);

const app = express();
app.use(express.json());

// Middleware for error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Middleware for validating expense data
const validateExpense = (req: Request, res: Response, next: NextFunction) => {
    const { category, recipient, amount, status } = req.body;
    if (typeof category !== 'string' || typeof recipient !== 'string' ||
        typeof amount !== 'number' || typeof status !== 'boolean') {
        return res.status(400).send('Invalid data format');
    }
    next();
};

// Creating a new expense
app.post("/expenses", validateExpense, (req, res) => {
    const { category, recipient, amount, notes, status } = req.body;
    const expense: Expense = {
        id: uuidv4(),
        category,
        recipient,
        amount,
        notes,
        time: getCurrentDate(),
        status
    };
    expenseStorage.insert(expense.id, expense);
    res.json(expense);
});

// Getting or searching through all expenses
app.get("/expenses", (req, res) => {
    const { search } = req.query;
    let expenses = expenseStorage.values();

    if (search) {
        const searchStr = search.toString().toLowerCase();
        expenses = expenses.filter(expense =>
            expense.category.toLowerCase().includes(searchStr) ||
            expense.recipient.toLowerCase().includes(searchStr)
        );
    }

    res.json(expenses);
});

// Get an expense using its ID
app.get("/expenses/:id", (req, res) => {
    const expenseId = req.params.id;
    const expenseOpt = expenseStorage.get(expenseId);
    if ("None" in expenseOpt) {
        res.status(404).send(`Expense with id=${expenseId} not found`);
    } else {
        res.json(expenseOpt.Some);
    }
});

// Updating an expense using its ID
app.put("/expenses/:id", validateExpense, (req, res) => {
    const expenseId = req.params.id;
    const expenseOpt = expenseStorage.get(expenseId);
    if ("None" in expenseOpt) {
        res.status(404).send(`Expense with id=${expenseId} not found`);
    } else {
        const existingExpense = expenseOpt.Some;
        const updatedExpense = { ...existingExpense, ...req.body, updatedAt: getCurrentDate() };
        expenseStorage.insert(expenseId, updatedExpense);
        res.json(updatedExpense);
    }
});

// Deleting an expense using its ID
app.delete("/expenses/:id", (req, res) => {
    const expenseId = req.params.id;
    const deletedExpense = expenseStorage.remove(expenseId);
    if ("None" in deletedExpense) {
        res.status(404).send(`Expense with id=${expenseId} not found`);
    } else {
        res.json(deletedExpense.Some);
    }
});

// Calculating and returning the total balance
app.get("/balance", (req, res) => {
    const expenses = expenseStorage.values();
    let totalBalance = 0;
    for (const expense of expenses) {
        if (expense.category === 'payment') {
            totalBalance -= expense.amount;
        } else if (expense.category === 'invoice') {
            totalBalance += expense.amount;
        }
    }
    res.json({ totalBalance });
});

// New Route: Get Expenses by Status
app.get("/expenses/status/:status", (req, res) => {
    const status = req.params.status === 'true';
    const expenses = expenseStorage.values().filter(expense => expense.status === status);
    res.json(expenses);
});

// New Route: Get Expenses by Date Range
app.get("/expenses/date-range", (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) {
        return res.status(400).send('Please provide start and end date');
    }
    const startDate = new Date(start.toString());
    const endDate = new Date(end.toString());
    const expenses = expenseStorage.values().filter(expense =>
        new Date(expense.time) >= startDate && new Date(expense.time) <= endDate
    );
    res.json(expenses);
});

// Helper function to get current date
function getCurrentDate() {
    const times = new Number(ic.time());
    return new Date(times.valueOf() / 1000_000);
}

export default Server(() => app.listen());

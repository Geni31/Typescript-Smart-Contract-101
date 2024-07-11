import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Server, StableBTreeMap, ic } from 'azle';
import 'reflect-metadata';


class Expense {
    id: string;
    amount: number;
    category: string;  //invoice/payment dropdown
    recipient: string;   //sending to or receiving from
    description: string;
    time: Date;
    status: boolean;    //in process/ done dropdown
}
 
const expenseStorage= StableBTreeMap<string, Expense>(0);

export default Server(() => {
    const app = express();
    app.use(express.json());

//Creating a new expense
    app.post("/expenses", (req, res) => {
        const {category, recipient, amount, description, status } = req.body;
        const expense: Expense = {
            id: uuidv4(),
            category,
            recipient,
            amount,
            description,
            time: getCurrentDate(), 
            status
        };
        expenseStorage.insert(expense.id, expense);
        res.json(expense);
    });

//Getting or searching through all expenses
    app.get("/expenses", (req, res) => {
        const {search} = req.query;
        let expenses = expenseStorage.values();

        if(search){
            expenses = expenses.filter(expense =>
                expense.category.toLowerCase().includes(search.toString().toLowerCase())||
                expense.recipient.toLowerCase().includes(search.toString().toLowerCase())
                // (expense.status === 'in process' || expense.status === 'done' ) && expense.status.includes(search.toString().toLowerCase())
            );
        }

        res.json(expenses);
    });

//Get an expense using its ID
    app.get("/expenses/:id", (req, res) => {
        const expenseId = req.params.id;
        const expenseOpt = expenseStorage.get(expenseId);
        if ("None" in expenseOpt) {
            res.status(404).send(`Expense with id=${expenseId} not found`);
        } else {
            res.json(expenseOpt.Some);
        }
    });

//Updating an expense using its ID
    app.put("/expenses/:id", (req, res) => {
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

//Deleting an expense using its ID
    app.delete("/expenses/:id", (req, res) => {
        const expenseId = req.params.id;
        const deletedExpense = expenseStorage.remove(expenseId);
        if ("None" in deletedExpense) {
            res.status(404).send(`Expense with id=${expenseId} not found`);
        } else {
            res.json(deletedExpense.Some);
        }
    });

//Calculating and returning the total balance
    app.get("/balance", (req, res) =>{
        const expenses = expenseStorage.values();
        let totalBalance = 0;
        for (const expense of expenses){
            if (expense.category === 'payment'){
                totalBalance -= expense.amount;
            }else if (expense.category === 'invoice'){
                totalBalance += expense.amount;
            }
        }
        res.json({totalBalance});
    });

    return app.listen();  
});


// Helper function to get current date
function getCurrentDate() {
    const times = new Number(ic.time());
    return new Date(times.valueOf() / 1000_000);
}


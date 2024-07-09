import { v4 as uuidv4 } from 'uuid';
import { Server, StableBTreeMap, ic } from 'azle';
import express from 'express';



interface Expense_Tracker{
    id: string;
    amount: number;
    time: Date;
    // balance: number;
    category: string;
    description: string;
}

const expenseStorage = StableBTreeMap<string, Expense_Tracker>(0);

export default Server(() => {
   const app = express();
   app.use(express.json());
 
   app.post("/expenses", (req, res) => {
        const {amount, category, description} = req.body;
        const expense: Expense_Tracker =  {
            id: uuidv4(), 
            amount,
            category,
            time: getCurrentDate(),
            description
        };
       expenseStorage.insert(expense.id, expense);
       res.json(expense);
   });

   app.get("/expenses", (req, res) => {
        res.json(expenseStorage.values());
   });

   app.get("/expenses/:id", (req, res) => {
        const expenseId = req.params.id;
        const expenseOpt = expenseStorage.get(expenseId);
        if ("None" in expenseOpt) {
           res.status(404).send(`the message with id=${expenseId} not found`);
        } else {
           res.json(expenseOpt.Some);
        }
   });

   app.put("/expenses/:id", (req, res) => {
        const expenseId = req.params.id;
        const expenseOpt = expenseStorage.get(expenseId);
        if ("None" in expenseOpt) {
           res.status(400).send(`couldn't update a message with id=${expenseId}. message not found`);
        } else {
           const message = expenseOpt.Some;
           const updatedMessage = { ...message, ...req.body, updatedAt: getCurrentDate()};
           expenseStorage.insert(expenseId, updatedMessage);
           res.json(updatedMessage);
        }
   });

   app.delete("/expenses/:id", (req, res) => {
        const expenseId = req.params.id;
        const deletedMessage = expenseStorage.remove(expenseId);
        if ("None" in deletedMessage) {
           res.status(400).send(`couldn't delete a message with id=${expenseId}. message not found`);
        } else {
           res.json(deletedMessage.Some);
        }
   });
  
     return app.listen();
});
  
function getCurrentDate() {
   const timestamp = new Number(ic.time());
   return new Date(timestamp.valueOf() / 1000_000);
}


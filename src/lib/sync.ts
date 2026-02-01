import prisma from "@/lib/prisma";

// Get or create the "Affiliate Sales" category
async function getAffiliateSalesCategory() {
  let category = await prisma.category.findUnique({
    where: { name: "Affiliate Sales" },
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        name: "Affiliate Sales",
        type: "income",
        color: "#10b981", // Green
      },
    });
  }

  return category.id;
}

// Get or create the "Affiliate Expenses" category
async function getAffiliateExpensesCategory() {
  let category = await prisma.category.findUnique({
    where: { name: "Affiliate Expenses" },
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        name: "Affiliate Expenses",
        type: "expense",
        color: "#ef4444", // Red
      },
    });
  }

  return category.id;
}

// Sync a sale to the Financial Tracker as a transaction
export async function syncSaleToTransaction(sale: {
  id: string;
  platform: string;
  amount: number;
  saleDate: Date;
  externalId?: string | null;
}, projectName?: string) {
  const description = projectName
    ? `${sale.platform} - ${projectName}`
    : `${sale.platform} Sale`;

  const categoryId = await getAffiliateSalesCategory();

  if (sale.externalId) {
    // Update existing transaction
    await prisma.transaction.update({
      where: { id: sale.externalId },
      data: {
        description,
        amount: sale.amount,
        date: sale.saleDate,
        categoryId,
      },
    });
  } else {
    // Create new transaction and link it
    const transaction = await prisma.transaction.create({
      data: {
        description,
        amount: sale.amount,
        type: "income",
        date: sale.saleDate,
        source: "affiliatehq",
        externalId: sale.id,
        categoryId,
      },
    });

    // Update sale with the transaction ID
    await prisma.dailySale.update({
      where: { id: sale.id },
      data: { externalId: transaction.id },
    });

    return transaction;
  }
}

// Sync an expense to the Financial Tracker as a transaction
export async function syncExpenseToTransaction(expense: {
  id: string;
  category: string;
  description?: string | null;
  amount: number;
  expenseDate: Date;
  externalId?: string | null;
}, projectName?: string) {
  const desc = expense.description
    ? `${expense.description} (${expense.category})`
    : expense.category;
  const fullDescription = projectName ? `${desc} - ${projectName}` : desc;

  const categoryId = await getAffiliateExpensesCategory();

  if (expense.externalId) {
    // Update existing transaction
    await prisma.transaction.update({
      where: { id: expense.externalId },
      data: {
        description: fullDescription,
        amount: expense.amount,
        date: expense.expenseDate,
        categoryId,
      },
    });
  } else {
    // Create new transaction and link it
    const transaction = await prisma.transaction.create({
      data: {
        description: fullDescription,
        amount: expense.amount,
        type: "expense",
        date: expense.expenseDate,
        source: "affiliatehq",
        externalId: expense.id,
        categoryId,
      },
    });

    // Update expense with the transaction ID
    await prisma.expense.update({
      where: { id: expense.id },
      data: { externalId: transaction.id },
    });

    return transaction;
  }
}

// Delete synced transaction when sale is deleted
export async function deleteSyncedTransaction(externalId: string | null) {
  if (!externalId) return;

  try {
    await prisma.transaction.delete({
      where: { id: externalId },
    });
  } catch {
    // Transaction may not exist or already deleted
  }
}

// Sync a transaction back to AffiliateHQ (when created/updated in Financial Tracker)
export async function syncTransactionToAffiliateHQ(transaction: {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: Date;
  externalId?: string | null;
  source?: string | null;
}) {
  // Only sync manual transactions (not ones already from AffiliateHQ)
  if (transaction.source === "affiliatehq") return;

  // For now, we don't auto-create entries in AffiliateHQ from Financial Tracker
  // because AffiliateHQ entries require a project context
  // We only update existing linked entries
  if (transaction.externalId) {
    if (transaction.type === "income") {
      try {
        await prisma.dailySale.update({
          where: { id: transaction.externalId },
          data: {
            amount: transaction.amount,
            saleDate: transaction.date,
          },
        });
      } catch {
        // Sale may not exist
      }
    } else if (transaction.type === "expense") {
      try {
        await prisma.expense.update({
          where: { id: transaction.externalId },
          data: {
            amount: transaction.amount,
            expenseDate: transaction.date,
          },
        });
      } catch {
        // Expense may not exist
      }
    }
  }
}

// Delete synced AffiliateHQ entry when transaction is deleted
export async function deleteSyncedAffiliateHQEntry(
  externalId: string | null,
  type: string
) {
  if (!externalId) return;

  try {
    if (type === "income") {
      await prisma.dailySale.delete({
        where: { id: externalId },
      });
    } else if (type === "expense") {
      await prisma.expense.delete({
        where: { id: externalId },
      });
    }
  } catch {
    // Entry may not exist or already deleted
  }
}

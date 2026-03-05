import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST: process due recurring expenses - create entries for current month and advance dates
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all recurring expenses with dates in the past
    const dueExpenses = await prisma.expense.findMany({
      where: {
        expenseType: "recurring",
        expenseDate: { lt: today },
      },
    });

    let created = 0;

    for (const expense of dueExpenses) {
      // Generate entries for each missed period up to today
      const nextDate = new Date(expense.expenseDate);

      while (nextDate < today) {
        // Create a one-time copy for this period
        await prisma.expense.create({
          data: {
            projectId: expense.projectId,
            category: expense.category,
            description: expense.description,
            amount: expense.amount,
            expenseType: "generated",
            frequency: null,
            expenseDate: new Date(nextDate),
          },
        });
        created++;

        // Advance to next period
        switch (expense.frequency) {
          case "weekly":
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case "biweekly":
            nextDate.setDate(nextDate.getDate() + 14);
            break;
          case "yearly":
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
          case "monthly":
          default:
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        }
      }

      // Update the recurring template's date to the next future date
      await prisma.expense.update({
        where: { id: expense.id },
        data: { expenseDate: nextDate },
      });
    }

    return NextResponse.json({ processed: created });
  } catch (error) {
    console.error("Error processing recurring expenses:", error);
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}

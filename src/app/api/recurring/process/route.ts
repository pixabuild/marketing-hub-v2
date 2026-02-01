import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// POST process due recurring transactions
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all due recurring transactions
    const dueRecurring = await prisma.recurringTransaction.findMany({
      where: {
        isActive: true,
        nextDate: {
          lte: today,
        },
      },
    });

    const created: string[] = [];

    for (const r of dueRecurring) {
      // Create the transaction
      const transaction = await prisma.transaction.create({
        data: {
          description: r.description,
          amount: r.amount,
          type: r.type,
          categoryId: r.categoryId,
          date: r.nextDate,
          source: "recurring",
        },
      });

      created.push(transaction.id);

      // Calculate next date based on frequency
      const nextDate = new Date(r.nextDate);
      switch (r.frequency) {
        case "daily":
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case "weekly":
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case "biweekly":
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case "monthly":
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case "yearly":
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }

      // Update recurring transaction with new next date
      await prisma.recurringTransaction.update({
        where: { id: r.id },
        data: { nextDate },
      });
    }

    return NextResponse.json({
      processed: created.length,
      transactionIds: created,
    });
  } catch (error) {
    console.error("Error processing recurring:", error);
    return NextResponse.json({ error: "Failed to process recurring transactions" }, { status: 500 });
  }
}

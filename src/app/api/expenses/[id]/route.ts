import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { syncExpenseToTransaction, deleteSyncedTransaction } from "@/lib/sync";

// Helper to get user's accessible project IDs
async function getUserProjectIds(userId: string, role: string): Promise<string[]> {
  if (role === "admin") {
    const projects = await prisma.project.findMany({ select: { id: true } });
    return projects.map(p => p.id);
  }

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { permissions: { some: { userId } } },
      ],
    },
    select: { id: true },
  });
  return projects.map(p => p.id);
}

// PUT update an expense
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { category, description, amount, expenseType, expenseDate } = body;

    // Verify user has access
    const projectIds = await getUserProjectIds(user.id, user.role);
    const existingExpense = await prisma.expense.findFirst({
      where: { id, projectId: { in: projectIds } },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(category && { category }),
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(expenseType && { expenseType }),
        ...(expenseDate && { expenseDate: new Date(expenseDate) }),
      },
      include: { project: { select: { name: true } } },
    });

    // Sync to Financial Tracker
    await syncExpenseToTransaction(expense, expense.project?.name);

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

// DELETE an expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectIds = await getUserProjectIds(user.id, user.role);

    // Get the expense first to get the externalId
    const existingExpense = await prisma.expense.findFirst({
      where: { id, projectId: { in: projectIds } },
      select: { externalId: true },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await prisma.expense.delete({
      where: { id },
    });

    // Delete synced transaction in Financial Tracker
    await deleteSyncedTransaction(existingExpense.externalId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { syncExpenseToTransaction, syncExpenseToRecurringTransaction } from "@/lib/sync";

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

// GET all expenses for user's projects
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const projectIds = await getUserProjectIds(user.id, user.role);

    const expenses = await prisma.expense.findMany({
      where: {
        projectId: projectId ? projectId : { in: projectIds },
        ...(startDate && endDate ? {
          expenseDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        } : {}),
      },
      orderBy: { expenseDate: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

// POST create a new expense
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, category, description, amount, expenseType, frequency, expenseDate } = body;

    if (!projectId || !category || amount === undefined || !expenseDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify user has access to the project
    const projectIds = await getUserProjectIds(user.id, user.role);
    if (!projectIds.includes(projectId)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get project name for sync
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    const expense = await prisma.expense.create({
      data: {
        projectId,
        category,
        description: description || null,
        amount: parseFloat(amount),
        expenseType: expenseType || "one-time",
        frequency: expenseType === "recurring" ? (frequency || "monthly") : null,
        expenseDate: new Date(expenseDate),
      },
    });

    // Sync to Financial Tracker - use recurring sync for recurring expenses
    if (expenseType === "recurring") {
      await syncExpenseToRecurringTransaction({
        ...expense,
        frequency: frequency || "monthly",
      }, project?.name);
    } else {
      await syncExpenseToTransaction(expense, project?.name);
    }

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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

// GET all goals for a project
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify user has access to the project
    const projectIds = await getUserProjectIds(user.id, user.role);
    if (!projectIds.includes(projectId)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get goals with actual revenue calculated from sales
    const goals = await prisma.goal.findMany({
      where: { projectId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    // Calculate actual revenue for each goal
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const startDate = new Date(goal.year, goal.month - 1, 1);
        const endDate = new Date(goal.year, goal.month, 0); // Last day of month

        const salesSum = await prisma.dailySale.aggregate({
          where: {
            projectId: goal.projectId,
            saleDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: { amount: true },
        });

        const actualRevenue = salesSum._sum.amount || 0;
        const progress = goal.targetRevenue > 0
          ? Math.min(100, (actualRevenue / goal.targetRevenue) * 100)
          : 0;

        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const isCurrent = goal.month === currentMonth && goal.year === currentYear;

        return {
          ...goal,
          actualRevenue,
          progress,
          isCurrent,
        };
      })
    );

    return NextResponse.json(goalsWithProgress);
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

// POST create or update a goal (upsert)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, month, year, targetRevenue } = body;

    if (!projectId || !month || !year || targetRevenue === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify user has access to the project
    const projectIds = await getUserProjectIds(user.id, user.role);
    if (!projectIds.includes(projectId)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Upsert goal
    const goal = await prisma.goal.upsert({
      where: {
        projectId_month_year: { projectId, month: parseInt(month), year: parseInt(year) },
      },
      update: {
        targetRevenue: parseFloat(targetRevenue),
      },
      create: {
        projectId,
        month: parseInt(month),
        year: parseInt(year),
        targetRevenue: parseFloat(targetRevenue),
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}

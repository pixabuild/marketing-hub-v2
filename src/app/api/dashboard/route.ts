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

// GET dashboard stats
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

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify user has access to the project
    const projectIds = await getUserProjectIds(user.id, user.role);
    if (!projectIds.includes(projectId)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Determine period dates
    const periodStart = startDate ? new Date(startDate) : today;
    const periodEnd = endDate ? new Date(endDate) : today;

    // Period stats (selected filter)
    const periodSalesAgg = await prisma.dailySale.aggregate({
      where: {
        projectId,
        saleDate: { gte: periodStart, lte: periodEnd },
      },
      _sum: { amount: true, salesCount: true },
    });

    const periodTrafficAgg = await prisma.dailyTraffic.aggregate({
      where: {
        projectId,
        trafficDate: { gte: periodStart, lte: periodEnd },
      },
      _sum: { clicks: true, optins: true, cost: true },
    });

    const periodExpensesAgg = await prisma.expense.aggregate({
      where: {
        projectId,
        expenseDate: { gte: periodStart, lte: periodEnd },
      },
      _sum: { amount: true },
    });

    // Calculate previous period (same duration before the start date)
    const periodMs = periodEnd.getTime() - periodStart.getTime();
    const periodDays = Math.max(1, Math.ceil(periodMs / 86400000) + 1);
    const prevEnd = new Date(periodStart.getTime() - 86400000);
    const prevStart = new Date(periodStart.getTime() - periodDays * 86400000);

    const prevSalesAgg = await prisma.dailySale.aggregate({
      where: {
        projectId,
        saleDate: { gte: prevStart, lte: prevEnd },
      },
      _sum: { amount: true, salesCount: true },
    });

    // This month stats (for goals)
    const monthSalesAgg = await prisma.dailySale.aggregate({
      where: {
        projectId,
        saleDate: { gte: monthStart },
      },
      _sum: { amount: true, salesCount: true },
    });

    const monthExpensesAgg = await prisma.expense.aggregate({
      where: {
        projectId,
        expenseDate: { gte: monthStart },
      },
      _sum: { amount: true },
    });

    // Top platforms for selected period
    const topPlatforms = await prisma.dailySale.groupBy({
      by: ["platform"],
      where: {
        projectId,
        saleDate: { gte: periodStart, lte: periodEnd },
      },
      _sum: { amount: true, salesCount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    });

    // Last 7 days chart data
    const dailyRevenue = await prisma.dailySale.groupBy({
      by: ["saleDate"],
      where: {
        projectId,
        saleDate: { gte: weekAgo },
      },
      _sum: { amount: true },
      orderBy: { saleDate: "asc" },
    });

    // Current month goal
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const monthlyGoal = await prisma.goal.findUnique({
      where: {
        projectId_month_year: { projectId, month: currentMonth, year: currentYear },
      },
    });

    const periodRevenue = periodSalesAgg._sum.amount || 0;
    const periodExpenses = periodExpensesAgg._sum.amount || 0;
    const monthRevenue = monthSalesAgg._sum.amount || 0;
    const monthExpenses = monthExpensesAgg._sum.amount || 0;

    return NextResponse.json({
      period: {
        revenue: periodRevenue,
        sales: periodSalesAgg._sum.salesCount || 0,
        clicks: periodTrafficAgg._sum.clicks || 0,
        optins: periodTrafficAgg._sum.optins || 0,
        trafficCost: periodTrafficAgg._sum.cost || 0,
        expenses: periodExpenses,
        profit: periodRevenue - periodExpenses,
      },
      previous: {
        revenue: prevSalesAgg._sum.amount || 0,
        sales: prevSalesAgg._sum.salesCount || 0,
      },
      month: {
        revenue: monthRevenue,
        sales: monthSalesAgg._sum.salesCount || 0,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses,
      },
      topPlatforms: topPlatforms.map((p) => ({
        platform: p.platform,
        revenue: p._sum.amount || 0,
        sales: p._sum.salesCount || 0,
      })),
      dailyRevenue: dailyRevenue.map((d) => ({
        date: d.saleDate,
        revenue: d._sum.amount || 0,
      })),
      goal: monthlyGoal,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}

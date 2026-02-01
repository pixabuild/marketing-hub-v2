import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// GET summary statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const reportType = searchParams.get("type") || "summary";

    const dateFilter = startDate && endDate ? {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    } : {};

    if (reportType === "summary") {
      // Get income total
      const incomeResult = await prisma.transaction.aggregate({
        where: {
          type: "income",
          ...dateFilter,
        },
        _sum: {
          amount: true,
        },
      });

      // Get expense total
      const expenseResult = await prisma.transaction.aggregate({
        where: {
          type: "expense",
          ...dateFilter,
        },
        _sum: {
          amount: true,
        },
      });

      const totalIncome = incomeResult._sum.amount || 0;
      const totalExpense = expenseResult._sum.amount || 0;

      return NextResponse.json({
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      });
    }

    if (reportType === "by-category") {
      const categoryType = searchParams.get("categoryType") || "expense";

      const categories = await prisma.category.findMany({
        where: { type: categoryType },
        include: {
          transactions: {
            where: dateFilter,
            select: {
              amount: true,
            },
          },
        },
      });

      const result = categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        total: cat.transactions.reduce((sum, t) => sum + t.amount, 0),
      }));

      return NextResponse.json(result.sort((a, b) => b.total - a.total));
    }

    if (reportType === "monthly-trends") {
      // Get all transactions from the last 12 months
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const transactions = await prisma.transaction.findMany({
        where: {
          date: {
            gte: twelveMonthsAgo,
          },
        },
        select: {
          date: true,
          amount: true,
          type: true,
        },
        orderBy: {
          date: "asc",
        },
      });

      // Group by month
      const monthlyData: Record<string, { income: number; expense: number }> = {};

      transactions.forEach((t) => {
        const month = t.date.toISOString().substring(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = { income: 0, expense: 0 };
        }
        if (t.type === "income") {
          monthlyData[month].income += t.amount;
        } else {
          monthlyData[month].expense += t.amount;
        }
      });

      const result = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
      }));

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}

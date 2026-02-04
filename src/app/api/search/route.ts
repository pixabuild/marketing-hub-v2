import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get("q")?.toLowerCase() || "";

  if (!query || query.length < 2) {
    return NextResponse.json({ transactions: [], sales: [], expenses: [] });
  }

  try {
    // Search Financial Tracker transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        description: {
          contains: query,
          mode: "insensitive",
        },
      },
      include: {
        category: true,
      },
      orderBy: { date: "desc" },
      take: 10,
    });

    // Search Affiliate HQ sales
    const sales = await prisma.dailySale.findMany({
      where: {
        OR: [
          { platform: { contains: query, mode: "insensitive" } },
          { project: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      include: {
        project: true,
      },
      orderBy: { saleDate: "desc" },
      take: 10,
    });

    // Search Affiliate HQ expenses
    const expenses = await prisma.expense.findMany({
      where: {
        OR: [
          { description: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        project: true,
      },
      orderBy: { expenseDate: "desc" },
      take: 10,
    });

    return NextResponse.json({
      transactions,
      sales,
      expenses,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}

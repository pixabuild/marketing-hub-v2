import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// GET all recurring transactions
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recurring = await prisma.recurringTransaction.findMany({
      include: {
        category: true,
      },
      orderBy: { nextDate: "asc" },
    });

    return NextResponse.json(recurring);
  } catch (error) {
    console.error("Error fetching recurring:", error);
    return NextResponse.json({ error: "Failed to fetch recurring transactions" }, { status: 500 });
  }
}

// POST create a new recurring transaction
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { description, amount, type, categoryId, frequency, startDate } = body;

    if (!description || amount === undefined || !type || !frequency || !startDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const recurring = await prisma.recurringTransaction.create({
      data: {
        description,
        amount: parseFloat(amount),
        type,
        categoryId: categoryId || null,
        frequency,
        startDate: new Date(startDate),
        nextDate: new Date(startDate),
        isActive: true,
        source: "manual",
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(recurring, { status: 201 });
  } catch (error) {
    console.error("Error creating recurring:", error);
    return NextResponse.json({ error: "Failed to create recurring transaction" }, { status: 500 });
  }
}

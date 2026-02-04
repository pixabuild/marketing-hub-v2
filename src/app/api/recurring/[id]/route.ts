import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// PUT update a recurring transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { isActive, description, amount, type, categoryId, frequency, startDate } = body;

    // Build update data object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (isActive !== undefined) updateData.isActive = isActive;
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (type !== undefined) updateData.type = type;
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (startDate !== undefined) {
      updateData.startDate = new Date(startDate);
      updateData.nextDate = new Date(startDate);
    }

    const recurring = await prisma.recurringTransaction.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    return NextResponse.json(recurring);
  } catch (error) {
    console.error("Error updating recurring:", error);
    return NextResponse.json({ error: "Failed to update recurring transaction" }, { status: 500 });
  }
}

// DELETE a recurring transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.recurringTransaction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recurring:", error);
    return NextResponse.json({ error: "Failed to delete recurring transaction" }, { status: 500 });
  }
}

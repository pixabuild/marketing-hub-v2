import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// PUT update a recurring transaction (toggle active status)
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
    const { isActive } = body;

    const recurring = await prisma.recurringTransaction.update({
      where: { id },
      data: { isActive },
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

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { syncTransactionToAffiliateHQ, deleteSyncedAffiliateHQEntry } from "@/lib/sync";

// PUT update a transaction
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
    const { description, amount, type, categoryId, date } = body;

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(description && { description }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(type && { type }),
        ...(categoryId !== undefined && { categoryId }),
        ...(date && { date: new Date(date) }),
      },
    });

    // Sync changes back to AffiliateHQ if linked
    await syncTransactionToAffiliateHQ(transaction);

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

// DELETE a transaction
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

    // Get the transaction first to get externalId and type
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
      select: { externalId: true, type: true, source: true },
    });

    await prisma.transaction.delete({
      where: { id },
    });

    // Delete synced AffiliateHQ entry if linked and originally from AffiliateHQ
    if (existingTransaction?.source === "affiliatehq") {
      await deleteSyncedAffiliateHQEntry(existingTransaction.externalId, existingTransaction.type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}

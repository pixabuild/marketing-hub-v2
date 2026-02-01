import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { syncSaleToTransaction, deleteSyncedTransaction } from "@/lib/sync";

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

// PUT update a sale
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
    const { platform, amount, salesCount, saleDate } = body;

    // Verify user has access
    const projectIds = await getUserProjectIds(user.id, user.role);
    const existingSale = await prisma.dailySale.findFirst({
      where: { id, projectId: { in: projectIds } },
    });

    if (!existingSale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const sale = await prisma.dailySale.update({
      where: { id },
      data: {
        ...(platform && { platform }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(salesCount !== undefined && { salesCount: parseInt(salesCount) }),
        ...(saleDate && { saleDate: new Date(saleDate) }),
      },
      include: { project: { select: { name: true } } },
    });

    // Sync to Financial Tracker
    await syncSaleToTransaction(sale, sale.project?.name);

    return NextResponse.json(sale);
  } catch (error) {
    console.error("Error updating sale:", error);
    return NextResponse.json({ error: "Failed to update sale" }, { status: 500 });
  }
}

// DELETE a sale
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

    // Get the sale first to get the externalId
    const existingSale = await prisma.dailySale.findFirst({
      where: { id, projectId: { in: projectIds } },
      select: { externalId: true },
    });

    if (!existingSale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    await prisma.dailySale.delete({
      where: { id },
    });

    // Delete synced transaction in Financial Tracker
    await deleteSyncedTransaction(existingSale.externalId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sale:", error);
    return NextResponse.json({ error: "Failed to delete sale" }, { status: 500 });
  }
}

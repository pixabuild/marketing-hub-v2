import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { syncSaleToTransaction } from "@/lib/sync";

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

// GET all sales for user's projects
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

    const sales = await prisma.dailySale.findMany({
      where: {
        projectId: projectId ? projectId : { in: projectIds },
        ...(startDate && endDate ? {
          saleDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        } : {}),
      },
      orderBy: { saleDate: "desc" },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

// POST create a new sale
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, platform, amount, salesCount, saleDate } = body;

    if (!projectId || !platform || amount === undefined || !saleDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify user has access to the project
    const projectIds = await getUserProjectIds(user.id, user.role);
    if (!projectIds.includes(projectId)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get project name for sync description
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    const sale = await prisma.dailySale.create({
      data: {
        projectId,
        platform,
        amount: parseFloat(amount),
        salesCount: parseInt(salesCount) || 1,
        saleDate: new Date(saleDate),
      },
    });

    // Sync to Financial Tracker
    await syncSaleToTransaction(sale, project?.name);

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json({ error: "Failed to create sale" }, { status: 500 });
  }
}

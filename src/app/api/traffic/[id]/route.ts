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

// PUT update a traffic entry
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
    const { source, clicks, optins, cost, trafficDate } = body;

    // Verify user has access
    const projectIds = await getUserProjectIds(user.id, user.role);
    const existingTraffic = await prisma.dailyTraffic.findFirst({
      where: { id, projectId: { in: projectIds } },
    });

    if (!existingTraffic) {
      return NextResponse.json({ error: "Traffic entry not found" }, { status: 404 });
    }

    const traffic = await prisma.dailyTraffic.update({
      where: { id },
      data: {
        ...(source && { source }),
        ...(clicks !== undefined && { clicks: parseInt(clicks) }),
        ...(optins !== undefined && { optins: parseInt(optins) }),
        ...(cost !== undefined && { cost: parseFloat(cost) }),
        ...(trafficDate && { trafficDate: new Date(trafficDate) }),
      },
    });

    return NextResponse.json(traffic);
  } catch (error) {
    console.error("Error updating traffic:", error);
    return NextResponse.json({ error: "Failed to update traffic" }, { status: 500 });
  }
}

// DELETE a traffic entry
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

    const traffic = await prisma.dailyTraffic.deleteMany({
      where: { id, projectId: { in: projectIds } },
    });

    if (traffic.count === 0) {
      return NextResponse.json({ error: "Traffic entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting traffic:", error);
    return NextResponse.json({ error: "Failed to delete traffic" }, { status: 500 });
  }
}

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

// GET all traffic for user's projects
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

    const traffic = await prisma.dailyTraffic.findMany({
      where: {
        projectId: projectId ? projectId : { in: projectIds },
        ...(startDate && endDate ? {
          trafficDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        } : {}),
      },
      orderBy: { trafficDate: "desc" },
    });

    return NextResponse.json(traffic);
  } catch (error) {
    console.error("Error fetching traffic:", error);
    return NextResponse.json({ error: "Failed to fetch traffic" }, { status: 500 });
  }
}

// POST create new traffic entry
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, source, clicks, optins, cost, trafficDate } = body;

    if (!projectId || !source || !trafficDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify user has access to the project
    const projectIds = await getUserProjectIds(user.id, user.role);
    if (!projectIds.includes(projectId)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const traffic = await prisma.dailyTraffic.create({
      data: {
        projectId,
        source,
        clicks: parseInt(clicks) || 0,
        optins: parseInt(optins) || 0,
        cost: parseFloat(cost) || 0,
        trafficDate: new Date(trafficDate),
      },
    });

    return NextResponse.json(traffic, { status: 201 });
  } catch (error) {
    console.error("Error creating traffic:", error);
    return NextResponse.json({ error: "Failed to create traffic" }, { status: 500 });
  }
}

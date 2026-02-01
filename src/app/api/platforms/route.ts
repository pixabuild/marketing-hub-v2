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

// GET all platforms for a project
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const type = searchParams.get("type");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify user has access to the project
    const projectIds = await getUserProjectIds(user.id, user.role);
    if (!projectIds.includes(projectId)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const platforms = await prisma.platform.findMany({
      where: {
        projectId,
        ...(type ? { type } : {}),
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(platforms);
  } catch (error) {
    console.error("Error fetching platforms:", error);
    return NextResponse.json({ error: "Failed to fetch platforms" }, { status: 500 });
  }
}

// POST create a new platform
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, name, platformType = "sales" } = body;

    if (!projectId || !name) {
      return NextResponse.json({ error: "Project ID and name are required" }, { status: 400 });
    }

    if (!["sales", "traffic"].includes(platformType)) {
      return NextResponse.json({ error: 'Platform type must be "sales" or "traffic"' }, { status: 400 });
    }

    // Verify user has access to the project
    const projectIds = await getUserProjectIds(user.id, user.role);
    if (!projectIds.includes(projectId)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if platform already exists
    const existing = await prisma.platform.findFirst({
      where: {
        projectId,
        name,
        type: platformType,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Platform already exists" }, { status: 400 });
    }

    const platform = await prisma.platform.create({
      data: {
        projectId,
        name,
        type: platformType,
      },
    });

    return NextResponse.json(platform, { status: 201 });
  } catch (error) {
    console.error("Error creating platform:", error);
    return NextResponse.json({ error: "Failed to create platform" }, { status: 500 });
  }
}

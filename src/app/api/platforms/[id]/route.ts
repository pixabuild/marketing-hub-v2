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

// PUT update a platform
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

    const platform = await prisma.platform.findUnique({
      where: { id },
    });

    if (!platform) {
      return NextResponse.json({ error: "Platform not found" }, { status: 404 });
    }

    const projectIds = await getUserProjectIds(user.id, user.role);
    if (!projectIds.includes(platform.projectId)) {
      return NextResponse.json({ error: "Platform not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name } = body;

    const updated = await prisma.platform.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating platform:", error);
    return NextResponse.json({ error: "Failed to update platform" }, { status: 500 });
  }
}

// DELETE a platform
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

    // Verify user has access to the platform's project
    const platform = await prisma.platform.findUnique({
      where: { id },
    });

    if (!platform) {
      return NextResponse.json({ error: "Platform not found" }, { status: 404 });
    }

    const projectIds = await getUserProjectIds(user.id, user.role);
    if (!projectIds.includes(platform.projectId)) {
      return NextResponse.json({ error: "Platform not found" }, { status: 404 });
    }

    await prisma.platform.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting platform:", error);
    return NextResponse.json({ error: "Failed to delete platform" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Helper to check if user has access to a project
async function hasProjectAccess(userId: string, projectId: string, role: string): Promise<boolean> {
  if (role === "admin") return true;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { permissions: { some: { userId } } },
      ],
    },
  });
  return !!project;
}

// GET a single project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasProjectAccess(user.id, id, user.role))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

// PUT update a project
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

    // Find the project first
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Only admins or project owners can update
    if (user.role !== "admin" && existingProject.ownerId !== user.id) {
      return NextResponse.json({ error: "Not authorized to update this project" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    const project = await prisma.project.update({
      where: { id },
      data: { name, description },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

// DELETE a project
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

    // Find the project first
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Only admins or project owners can delete
    if (user.role !== "admin" && existingProject.ownerId !== user.id) {
      return NextResponse.json({ error: "Not authorized to delete this project" }, { status: 403 });
    }

    // Delete all related records first, then the project
    await prisma.$transaction([
      prisma.goal.deleteMany({ where: { projectId: id } }),
      prisma.expense.deleteMany({ where: { projectId: id } }),
      prisma.dailyTraffic.deleteMany({ where: { projectId: id } }),
      prisma.dailySale.deleteMany({ where: { projectId: id } }),
      prisma.platform.deleteMany({ where: { projectId: id } }),
      prisma.userProjectPermission.deleteMany({ where: { projectId: id } }),
      prisma.project.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}

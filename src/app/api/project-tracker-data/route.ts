import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET all projects for user
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.billingProject.findMany({
      where: user.role === "admin" ? {} : { userId: user.id },
      orderBy: { date: "desc" },
    });

    // Format dates as strings for the frontend
    const formatted = projects.map(p => ({
      ...p,
      date: p.date.toISOString().split("T")[0],
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error reading project tracker data:", error);
    return NextResponse.json({ error: "Failed to read data" }, { status: 500 });
  }
}

// POST create a new project
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const project = await prisma.billingProject.create({
      data: {
        projectName: body.projectName,
        clientName: body.clientName,
        description: body.description || "",
        cost: body.cost ?? null,
        status: body.status || "unpaid",
        date: new Date(body.date),
        month: body.month,
        userId: user.id,
      },
    });

    return NextResponse.json({
      ...project,
      date: project.date.toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

// PUT update a project
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing project id" }, { status: 400 });
    }

    // Verify ownership (admin can edit any)
    const existing = await prisma.billingProject.findUnique({ where: { id } });
    if (!existing || (user.role !== "admin" && existing.userId !== user.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (updates.projectName !== undefined) data.projectName = updates.projectName;
    if (updates.clientName !== undefined) data.clientName = updates.clientName;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.cost !== undefined) data.cost = updates.cost;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.date !== undefined) data.date = new Date(updates.date);
    if (updates.month !== undefined) data.month = updates.month;

    const project = await prisma.billingProject.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      ...project,
      date: project.date.toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

// DELETE a project
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    // Verify ownership (admin can delete any)
    const existing = await prisma.billingProject.findUnique({ where: { id: projectId } });
    if (!existing || (user.role !== "admin" && existing.userId !== user.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.billingProject.delete({ where: { id: projectId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}

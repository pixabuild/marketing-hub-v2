import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET single user
export async function GET(
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

    const dbUser = await prisma.user.findUnique({
      where: { id },
      include: {
        appPermissions: true,
        projectPermissions: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(dbUser);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

// PUT update user
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

    const currentUser = await prisma.user.findUnique({
      where: { email: user.email! },
    });

    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { name, role, password, appPermissions, projectIds } = body;

    // Get the user being updated
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update password in Supabase Auth if provided
    if (password && password.trim()) {
      if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }

      // Check if service role key is configured
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: "Password management not configured. Please add SUPABASE_SERVICE_ROLE_KEY to your environment." }, { status: 500 });
      }

      const adminClient = createAdminClient();

      // Get user from Supabase Auth by email
      const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({
        perPage: 1000,
      });

      if (listError) {
        console.error("Error finding auth user:", listError);
        return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
      }

      const authUser = usersData.users.find(u => u.email === targetUser.email);

      if (authUser) {
        const { error: updateError } = await adminClient.auth.admin.updateUserById(authUser.id, {
          password,
        });

        if (updateError) {
          console.error("Error updating password:", updateError);
          return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
        }
      }
    }

    // Update user basic info
    const updateData: { name?: string; role?: string } = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Update app permissions if provided
    if (appPermissions) {
      // Delete existing permissions
      await prisma.userAppPermission.deleteMany({
        where: { userId: id },
      });

      // Create new permissions
      for (const [appName, canAccess] of Object.entries(appPermissions)) {
        if (canAccess) {
          await prisma.userAppPermission.create({
            data: {
              userId: id,
              appName,
              canAccess: true,
            },
          });
        }
      }
    }

    // Update project permissions if provided
    if (projectIds !== undefined) {
      // Delete existing permissions
      await prisma.userProjectPermission.deleteMany({
        where: { userId: id },
      });

      // Create new permissions
      for (const projectId of projectIds) {
        await prisma.userProjectPermission.create({
          data: {
            userId: id,
            projectId,
          },
        });
      }
    }

    // Fetch updated user with all relations
    const result = await prisma.user.findUnique({
      where: { id },
      include: {
        appPermissions: true,
        projectPermissions: {
          include: {
            project: true,
          },
        },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE user
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

    const currentUser = await prisma.user.findUnique({
      where: { email: user.email! },
    });

    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Don't allow deleting yourself
    if (currentUser.id === id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

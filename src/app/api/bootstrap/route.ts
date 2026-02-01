import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// POST - Bootstrap current user as admin if no admins exist
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if any admin exists
    const adminCount = await prisma.user.count({
      where: { role: "admin" },
    });

    // Check if current user exists
    let dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!dbUser) {
      // Create user - make them admin if no admins exist
      dbUser = await prisma.user.create({
        data: {
          email: user.email,
          name: user.user_metadata?.name || user.email.split("@")[0],
          password: "supabase-auth",
          role: adminCount === 0 ? "admin" : "user",
        },
      });

      // Give them app permissions
      await prisma.userAppPermission.createMany({
        data: [
          { userId: dbUser.id, appName: "affiliate_hq", canAccess: true },
          { userId: dbUser.id, appName: "financial_tracker", canAccess: true },
        ],
      });

      return NextResponse.json({
        message: `User created as ${dbUser.role}`,
        user: { id: dbUser.id, email: dbUser.email, role: dbUser.role },
      });
    }

    // If user exists but no admins, promote them
    if (adminCount === 0 && dbUser.role !== "admin") {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { role: "admin" },
      });

      return NextResponse.json({
        message: "User promoted to admin",
        user: { id: dbUser.id, email: dbUser.email, role: dbUser.role },
      });
    }

    return NextResponse.json({
      message: "User already exists",
      user: { id: dbUser.id, email: dbUser.email, role: dbUser.role },
    });
  } catch (error) {
    console.error("Bootstrap error:", error);
    return NextResponse.json({ error: "Bootstrap failed" }, { status: 500 });
  }
}

// GET - Check current user status
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      include: { appPermissions: true },
    });

    if (!dbUser) {
      return NextResponse.json({
        exists: false,
        message: "User not in database. POST to /api/bootstrap to create."
      });
    }

    return NextResponse.json({
      exists: true,
      user: { id: dbUser.id, email: dbUser.email, role: dbUser.role },
      permissions: dbUser.appPermissions,
    });
  } catch (error) {
    console.error("Bootstrap check error:", error);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}

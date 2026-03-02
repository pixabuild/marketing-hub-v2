import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, email: true, name: true, role: true, appPermissions: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build app permissions map
    let appPermissions = { affiliate_hq: false, financial_tracker: false, todo_dashboard: false, project_tracker: false };
    if (dbUser.role === "admin") {
      appPermissions = { affiliate_hq: true, financial_tracker: true, todo_dashboard: true, project_tracker: true };
    } else if (dbUser.appPermissions) {
      appPermissions = {
        affiliate_hq: dbUser.appPermissions.some((p: { appName: string; canAccess: boolean }) => p.appName === "affiliate_hq" && p.canAccess),
        financial_tracker: dbUser.appPermissions.some((p: { appName: string; canAccess: boolean }) => p.appName === "financial_tracker" && p.canAccess),
        todo_dashboard: dbUser.appPermissions.some((p: { appName: string; canAccess: boolean }) => p.appName === "todo_dashboard" && p.canAccess),
        project_tracker: dbUser.appPermissions.some((p: { appName: string; canAccess: boolean }) => p.appName === "project_tracker" && p.canAccess),
      };
    }

    return NextResponse.json({ ...dbUser, appPermissions });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

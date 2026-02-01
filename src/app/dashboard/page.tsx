import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userName = user.user_metadata?.name || user.email?.split("@")[0] || "User";

  // Fetch or create user in database
  let userRole = "user";
  let appPermissions = { affiliate_hq: false, financial_tracker: false };
  try {
    let dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      include: { appPermissions: true },
    });

    // Auto-create user if they don't exist
    if (!dbUser) {
      // Check if any admin exists - first user becomes admin
      const adminCount = await prisma.user.count({
        where: { role: "admin" },
      });

      dbUser = await prisma.user.create({
        data: {
          email: user.email!,
          name: userName,
          password: "supabase-auth",
          role: adminCount === 0 ? "admin" : "user",
        },
        include: { appPermissions: true },
      });

      // Give them app permissions
      await prisma.userAppPermission.createMany({
        data: [
          { userId: dbUser.id, appName: "affiliate_hq", canAccess: true },
          { userId: dbUser.id, appName: "financial_tracker", canAccess: true },
        ],
      });

      // Refresh to get permissions
      dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        include: { appPermissions: true },
      });
    }

    userRole = dbUser?.role || "user";

    // Admins have access to everything
    if (userRole === "admin") {
      appPermissions = { affiliate_hq: true, financial_tracker: true };
    } else if (dbUser?.appPermissions) {
      appPermissions = {
        affiliate_hq: dbUser.appPermissions.some(p => p.appName === "affiliate_hq" && p.canAccess),
        financial_tracker: dbUser.appPermissions.some(p => p.appName === "financial_tracker" && p.canAccess),
      };
    }
  } catch (error) {
    console.error("Error fetching/creating user:", error);
  }

  return <DashboardClient user={{ name: userName, email: user.email || "", role: userRole }} appPermissions={appPermissions} />;
}

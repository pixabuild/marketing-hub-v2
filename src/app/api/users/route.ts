import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET all users with their app permissions
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user's role
    const currentUser = await prisma.user.findUnique({
      where: { email: user.email! },
    });

    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      include: {
        appPermissions: true,
        projectPermissions: {
          include: {
            project: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST create a new user
export async function POST(request: NextRequest) {
  try {
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
    const { email, name, password, role = "user" } = body;

    if (!email || !name || !password) {
      return NextResponse.json({ error: "Email, name, and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "User creation not configured. Please add SUPABASE_SERVICE_ROLE_KEY to your environment." }, { status: 500 });
    }

    // Check if user exists in database
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    // Create user in Supabase Auth using admin client
    const adminClient = createAdminClient();
    const { error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      // If user already exists in Auth, update their password instead
      if (authError.message.includes("already been registered")) {
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        const authUser = usersData?.users.find(u => u.email === email);

        if (authUser) {
          await adminClient.auth.admin.updateUserById(authUser.id, { password });
        }
      } else {
        console.error("Supabase auth error:", authError);
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    }

    // Create user in database
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: "supabase-auth", // Placeholder - actual password is in Supabase Auth
        role,
      },
      include: {
        appPermissions: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

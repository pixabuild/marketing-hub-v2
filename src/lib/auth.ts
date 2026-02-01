import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Gets the current authenticated user from Supabase and ensures they exist in Prisma.
 * Creates the user in Prisma if they don't exist yet.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser || !authUser.email) {
    return null;
  }

  // Look up user in Prisma database by email
  let dbUser = await prisma.user.findUnique({
    where: { email: authUser.email },
  });

  // If user doesn't exist in Prisma, create them
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email.split("@")[0],
        password: "supabase-auth", // Placeholder - using Supabase Auth
        role: "user", // Default role, admin can change later
      },
    });
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
  };
}

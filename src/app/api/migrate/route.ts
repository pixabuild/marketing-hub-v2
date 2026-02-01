import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST - Run database migrations
export async function POST() {
  try {
    // Create the goals table if it doesn't exist
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "projectId" TEXT NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        "targetRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT goals_projectId_fkey FOREIGN KEY ("projectId") REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT goals_projectId_month_year_key UNIQUE ("projectId", month, year)
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Migration completed - goals table created",
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Check migration status
export async function GET() {
  try {
    // Check if goals table exists
    const result = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'goals'
      )
    `;

    return NextResponse.json({
      goalsTableExists: result[0]?.exists || false,
    });
  } catch (error) {
    console.error("Migration check error:", error);
    return NextResponse.json(
      { error: "Check failed", details: String(error) },
      { status: 500 }
    );
  }
}

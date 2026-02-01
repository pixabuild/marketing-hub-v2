import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET health check - tests database connection
export async function GET() {
  try {
    // Test the database connection with a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;

    return NextResponse.json({
      status: "ok",
      database: "connected",
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database connection error:", error);

    return NextResponse.json({
      status: "error",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

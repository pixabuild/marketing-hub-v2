import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "todos");

interface TodoData {
  projects: Array<{
    id: string;
    name: string;
    description: string | null;
    color: string;
  }>;
  categories: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  todos: Array<{
    id: string;
    title: string;
    description: string | null;
    completed: boolean;
    priority: string;
    dueDate: string | null;
    projectId: string | null;
    categoryId: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function getUserFilePath(userId: string): Promise<string> {
  await ensureDataDir();
  return path.join(DATA_DIR, `${userId}.json`);
}

async function readUserData(userId: string): Promise<TodoData> {
  const filePath = await getUserFilePath(userId);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return { projects: [], categories: [], todos: [] };
  }
}

async function writeUserData(userId: string, data: TodoData): Promise<void> {
  const filePath = await getUserFilePath(userId);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await readUserData(user.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error reading todo data:", error);
    return NextResponse.json({ error: "Failed to read data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: TodoData = await request.json();
    await writeUserData(user.id, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error writing todo data:", error);
    return NextResponse.json({ error: "Failed to write data" }, { status: 500 });
  }
}

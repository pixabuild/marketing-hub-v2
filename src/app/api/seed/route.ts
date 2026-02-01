import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST - Seed the database with sample data
export async function POST() {
  try {
    console.log("Seeding database...");

    // Create admin user
    const adminUser = await prisma.user.upsert({
      where: { email: "admin@company.com" },
      update: {},
      create: {
        email: "admin@company.com",
        name: "Admin",
        password: "supabase-auth",
        role: "admin",
      },
    });

    // Give admin app permissions
    try {
      await prisma.userAppPermission.upsert({
        where: { userId_appName: { userId: adminUser.id, appName: "affiliate_hq" } },
        update: {},
        create: { userId: adminUser.id, appName: "affiliate_hq", canAccess: true },
      });
      await prisma.userAppPermission.upsert({
        where: { userId_appName: { userId: adminUser.id, appName: "financial_tracker" } },
        update: {},
        create: { userId: adminUser.id, appName: "financial_tracker", canAccess: true },
      });
    } catch (e) {
      console.log("Permissions might already exist:", e);
    }

    // Create a sample project
    const project = await prisma.project.upsert({
      where: { id: "sample-project-1" },
      update: {},
      create: {
        id: "sample-project-1",
        name: "Sample Affiliate Project",
        description: "A sample project for testing",
        ownerId: adminUser.id,
      },
    });

    // Create platforms for the project
    const salesPlatforms = ["WarriorPlus", "ClickBank", "JVZoo", "Digistore24"];
    const trafficPlatforms = ["Facebook Ads", "Google Ads", "Solo Ads", "Organic"];

    for (const name of salesPlatforms) {
      try {
        await prisma.platform.upsert({
          where: { projectId_name_type: { projectId: project.id, name, type: "sales" } },
          update: {},
          create: { projectId: project.id, name, type: "sales" },
        });
      } catch (e) {
        console.log(`Platform ${name} might already exist`);
      }
    }

    for (const name of trafficPlatforms) {
      try {
        await prisma.platform.upsert({
          where: { projectId_name_type: { projectId: project.id, name, type: "traffic" } },
          update: {},
          create: { projectId: project.id, name, type: "traffic" },
        });
      } catch (e) {
        console.log(`Platform ${name} might already exist`);
      }
    }

    // Create sample sales data (last 30 days)
    const today = new Date();
    let salesCreated = 0;
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      if (Math.random() > 0.3) {
        const platform = salesPlatforms[Math.floor(Math.random() * salesPlatforms.length)];
        const amount = Math.floor(Math.random() * 500) + 50;
        const salesCount = Math.floor(Math.random() * 5) + 1;

        await prisma.dailySale.create({
          data: {
            projectId: project.id,
            platform,
            amount,
            salesCount,
            saleDate: date,
          },
        });
        salesCreated++;
      }
    }

    // Create sample traffic data
    let trafficCreated = 0;
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      if (Math.random() > 0.2) {
        const source = trafficPlatforms[Math.floor(Math.random() * trafficPlatforms.length)];
        const clicks = Math.floor(Math.random() * 200) + 50;
        const optins = Math.floor(clicks * (Math.random() * 0.3 + 0.1));
        const cost = source.includes("Ads") ? Math.floor(Math.random() * 100) + 20 : 0;

        await prisma.dailyTraffic.create({
          data: {
            projectId: project.id,
            source,
            clicks,
            optins,
            cost,
            trafficDate: date,
          },
        });
        trafficCreated++;
      }
    }

    // Create sample expenses
    const expenseCategories = ["Software", "Advertising", "Tools", "Services"];
    let expensesCreated = 0;
    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));

      await prisma.expense.create({
        data: {
          projectId: project.id,
          category: expenseCategories[Math.floor(Math.random() * expenseCategories.length)],
          description: `Sample expense ${i + 1}`,
          amount: Math.floor(Math.random() * 200) + 20,
          expenseType: Math.random() > 0.7 ? "recurring" : "one-time",
          expenseDate: date,
        },
      });
      expensesCreated++;
    }

    // Create Financial Tracker categories
    const incomeCategories = [
      { name: "Affiliate Sales", color: "#22c55e" },
      { name: "Consulting", color: "#10b981" },
      { name: "Freelance", color: "#14b8a6" },
    ];

    const expenseCategoriesFT = [
      { name: "Software & Tools", color: "#f43f5e" },
      { name: "Advertising", color: "#ef4444" },
      { name: "Hosting", color: "#f97316" },
      { name: "Education", color: "#eab308" },
      { name: "Office", color: "#a855f7" },
    ];

    for (const cat of incomeCategories) {
      await prisma.category.upsert({
        where: { name: cat.name },
        update: {},
        create: { name: cat.name, type: "income", color: cat.color },
      });
    }

    for (const cat of expenseCategoriesFT) {
      await prisma.category.upsert({
        where: { name: cat.name },
        update: {},
        create: { name: cat.name, type: "expense", color: cat.color },
      });
    }

    // Get created categories
    const categories = await prisma.category.findMany();
    const incCats = categories.filter(c => c.type === "income");
    const expCats = categories.filter(c => c.type === "expense");

    // Create sample transactions
    let transactionsCreated = 0;
    for (let i = 0; i < 40; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - Math.floor(Math.random() * 60));

      const isIncome = Math.random() > 0.4;
      const category = isIncome
        ? incCats[Math.floor(Math.random() * incCats.length)]
        : expCats[Math.floor(Math.random() * expCats.length)];

      if (category) {
        await prisma.transaction.create({
          data: {
            description: isIncome ? `Income from ${category.name}` : `Payment for ${category.name}`,
            amount: isIncome ? Math.floor(Math.random() * 1000) + 100 : Math.floor(Math.random() * 300) + 20,
            type: isIncome ? "income" : "expense",
            categoryId: category.id,
            date: date,
            source: "manual",
          },
        });
        transactionsCreated++;
      }
    }

    // Create sample recurring transactions
    const recurringItems = [
      { description: "Netflix", amount: 15.99, type: "expense", frequency: "monthly" },
      { description: "Hosting", amount: 29, type: "expense", frequency: "monthly" },
      { description: "Monthly Retainer", amount: 500, type: "income", frequency: "monthly" },
    ];

    for (const item of recurringItems) {
      const category = item.type === "income"
        ? incCats[0]
        : expCats.find(c => c.name.includes("Software")) || expCats[0];

      if (category) {
        await prisma.recurringTransaction.create({
          data: {
            description: item.description,
            amount: item.amount,
            type: item.type,
            categoryId: category.id,
            frequency: item.frequency,
            startDate: new Date(today.getFullYear(), today.getMonth(), 1),
            nextDate: new Date(today.getFullYear(), today.getMonth() + 1, 1),
            isActive: true,
            source: "manual",
          },
        });
      }
    }

    // Create sample budgets
    for (const cat of expCats.slice(0, 3)) {
      try {
        await prisma.budget.upsert({
          where: { categoryId: cat.id },
          update: {},
          create: {
            categoryId: cat.id,
            amount: Math.floor(Math.random() * 500) + 100,
            period: "monthly",
          },
        });
      } catch (e) {
        console.log(`Budget for ${cat.name} might already exist`);
      }
    }

    // Create sample goals
    let goalsCreated = 0;
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Create goals for current month and previous 2 months
    for (let i = 0; i < 3; i++) {
      const goalMonth = currentMonth - i <= 0 ? currentMonth - i + 12 : currentMonth - i;
      const goalYear = currentMonth - i <= 0 ? currentYear - 1 : currentYear;

      try {
        await prisma.goal.upsert({
          where: {
            projectId_month_year: {
              projectId: project.id,
              month: goalMonth,
              year: goalYear,
            },
          },
          update: {},
          create: {
            projectId: project.id,
            month: goalMonth,
            year: goalYear,
            targetRevenue: Math.floor(Math.random() * 5000) + 2000,
          },
        });
        goalsCreated++;
      } catch (e) {
        console.error(`Goal error for ${goalMonth}/${goalYear}:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      stats: {
        user: adminUser.email,
        project: project.name,
        salesPlatforms: salesPlatforms.length,
        trafficPlatforms: trafficPlatforms.length,
        salesCreated,
        trafficCreated,
        expensesCreated,
        categories: categories.length,
        transactionsCreated,
        recurringTransactions: recurringItems.length,
        goalsCreated,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Seed failed", details: String(error) },
      { status: 500 }
    );
  }
}

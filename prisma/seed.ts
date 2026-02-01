import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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
  console.log("Created admin user:", adminUser.email);

  // Give admin app permissions
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
  console.log("Created project:", project.name);

  // Create platforms for the project
  const salesPlatforms = ["WarriorPlus", "ClickBank", "JVZoo", "Digistore24"];
  const trafficPlatforms = ["Facebook Ads", "Google Ads", "Solo Ads", "Organic"];

  for (const name of salesPlatforms) {
    await prisma.platform.upsert({
      where: { projectId_name_type: { projectId: project.id, name, type: "sales" } },
      update: {},
      create: { projectId: project.id, name, type: "sales" },
    });
  }
  console.log("Created sales platforms");

  for (const name of trafficPlatforms) {
    await prisma.platform.upsert({
      where: { projectId_name_type: { projectId: project.id, name, type: "traffic" } },
      update: {},
      create: { projectId: project.id, name, type: "traffic" },
    });
  }
  console.log("Created traffic platforms");

  // Create sample sales data (last 30 days)
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Random sales for different platforms
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
    }
  }
  console.log("Created sample sales data");

  // Create sample traffic data
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
    }
  }
  console.log("Created sample traffic data");

  // Create sample expenses
  const expenseCategories = ["Software", "Advertising", "Tools", "Services"];
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
  }
  console.log("Created sample expenses");

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
  console.log("Created financial categories");

  // Get created categories
  const categories = await prisma.category.findMany();
  const incCats = categories.filter(c => c.type === "income");
  const expCats = categories.filter(c => c.type === "expense");

  // Create sample transactions
  for (let i = 0; i < 40; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - Math.floor(Math.random() * 60));

    const isIncome = Math.random() > 0.4;
    const category = isIncome
      ? incCats[Math.floor(Math.random() * incCats.length)]
      : expCats[Math.floor(Math.random() * expCats.length)];

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
  }
  console.log("Created sample transactions");

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
  console.log("Created recurring transactions");

  // Create sample budgets
  for (const cat of expCats.slice(0, 3)) {
    await prisma.budget.upsert({
      where: { categoryId: cat.id },
      update: {},
      create: {
        categoryId: cat.id,
        amount: Math.floor(Math.random() * 500) + 100,
        period: "monthly",
      },
    });
  }
  console.log("Created sample budgets");

  console.log("\nSeeding completed!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

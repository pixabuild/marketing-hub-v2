"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface DashboardClientProps {
  user: {
    name: string;
    email: string;
    role?: string;
  };
  appPermissions: {
    affiliate_hq: boolean;
    financial_tracker: boolean;
    todo_dashboard: boolean;
    project_tracker: boolean;
  };
}

export default function DashboardClient({ user, appPermissions }: DashboardClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const isAdmin = user.role === "admin";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const openApp = (app: string) => {
    if (app === "finance") {
      router.push("/financial-tracker");
    } else if (app === "affiliate") {
      router.push("/affiliate-hq");
    } else if (app === "todo") {
      router.push("/todo-dashboard");
    } else if (app === "projects") {
      router.push("/project-tracker");
    } else if (app === "users") {
      router.push("/dashboard/users");
    }
  };

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="view active">
      <button className="logout-btn" onClick={handleLogout}>Sign Out</button>

      <div className="dashboard-header">
        <div className="brand">
          <div className="brand-logo large">
            <div className="brand-logo-ring"></div>
          </div>
        </div>
        <div className="user-greeting">
          <div className="user-avatar">{userInitial}</div>
          <span>Welcome back, <strong>{user.name}</strong></span>
        </div>
        <h1>MarketingHQ</h1>
        <p>your_business_dashboard.v2</p>
      </div>

      <div className="apps-grid">
        <div
          className={`app-card finance ${!appPermissions.financial_tracker ? "disabled" : ""}`}
          onClick={() => appPermissions.financial_tracker && openApp("finance")}
          style={!appPermissions.financial_tracker ? { cursor: "not-allowed", opacity: 0.5 } : {}}
        >
          <div className="shine"></div>
          <div className="app-icon">V</div>
          <h2>Vault - Financial Tracker</h2>
          <p>Track your income, expenses, budgets, and analyze your financial trends with beautiful charts.</p>
          <div className={`app-status ${appPermissions.financial_tracker ? "active" : "no-access"}`}>
            <span className="status-dot"></span>
            {appPermissions.financial_tracker ? "Active" : "No Access"}
          </div>
        </div>

        <div
          className={`app-card affiliate ${!appPermissions.affiliate_hq ? "disabled" : ""}`}
          onClick={() => appPermissions.affiliate_hq && openApp("affiliate")}
          style={!appPermissions.affiliate_hq ? { cursor: "not-allowed", opacity: 0.5 } : {}}
        >
          <div className="shine"></div>
          <div className="app-icon">A</div>
          <h2>AffiliateHQ</h2>
          <p>Monitor your affiliate sales, traffic, expenses, and track monthly revenue goals by project.</p>
          <div className={`app-status ${appPermissions.affiliate_hq ? "active" : "no-access"}`}>
            <span className="status-dot"></span>
            {appPermissions.affiliate_hq ? "Active" : "No Access"}
          </div>
        </div>

        <div
          className={`app-card todo ${!appPermissions.todo_dashboard ? "disabled" : ""}`}
          onClick={() => appPermissions.todo_dashboard && openApp("todo")}
          style={!appPermissions.todo_dashboard ? { cursor: "not-allowed", opacity: 0.5 } : {}}
        >
          <div className="shine"></div>
          <div className="app-icon">T</div>
          <h2>TaskHub - Todo Dashboard</h2>
          <p>Organize your tasks with projects, categories, priorities, and due dates. Stay productive.</p>
          <div className={`app-status ${appPermissions.todo_dashboard ? "active" : "no-access"}`}>
            <span className="status-dot"></span>
            {appPermissions.todo_dashboard ? "Active" : "No Access"}
          </div>
        </div>

        <div
          className={`app-card projects ${!appPermissions.project_tracker ? "disabled" : ""}`}
          onClick={() => appPermissions.project_tracker && openApp("projects")}
          style={!appPermissions.project_tracker ? { cursor: "not-allowed", opacity: 0.5 } : {}}
        >
          <div className="shine"></div>
          <div className="app-icon">P</div>
          <h2>ProjectHub - Billing Tracker</h2>
          <p>Track client projects, monthly billing status, team assignments, and revenue by month.</p>
          <div className={`app-status ${appPermissions.project_tracker ? "active" : "no-access"}`}>
            <span className="status-dot"></span>
            {appPermissions.project_tracker ? "Active" : "No Access"}
          </div>
        </div>

        {isAdmin && (
          <div className="app-card users" onClick={() => openApp("users")}>
            <div className="shine"></div>
            <div className="app-icon">U</div>
            <h2>User Management</h2>
            <p>Manage users, assign roles, and control access to apps and projects.</p>
            <div className="app-status active">
              <span className="status-dot"></span>
              Admin Only
            </div>
          </div>
        )}

        <div className="app-card coming-soon">
          <div className="shine"></div>
          <div className="app-icon">+</div>
          <h2>More Coming Soon</h2>
          <p>Additional modules will be added here as you build them. Email marketing, CRM, and more.</p>
          <div className="app-status coming">Coming Soon</div>
        </div>
      </div>

      <div className="footer">
        <p>Marketing with Justin O&apos;Pay &copy; 2026</p>
      </div>
    </div>
  );
}

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdminUser() {
  const email = "opay.karen@pixabuild.com";
  const password = "admin123";

  console.log("Creating admin user in Supabase Auth...");

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      console.log("User already exists, updating password...");

      // List users to find the admin
      const { data: users } = await supabase.auth.admin.listUsers();
      const adminUser = users?.users.find(u => u.email === email);

      if (adminUser) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          adminUser.id,
          { password }
        );

        if (updateError) {
          console.error("Error updating password:", updateError);
          return;
        }
        console.log("Password updated successfully!");
      }
    } else {
      console.error("Error creating user:", error);
      return;
    }
  } else {
    console.log("Admin user created successfully!");
  }

  console.log("\n=================================");
  console.log("Admin Login Credentials:");
  console.log("Email:", email);
  console.log("Password:", password);
  console.log("=================================\n");
}

createAdminUser();

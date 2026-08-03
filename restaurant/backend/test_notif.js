const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testNotifications() {
  console.log("--- Testing Supabase sd_notifications ---");
  
  // 1. Fetch current rows
  const { data: rows, error: selectErr } = await supabase.from("sd_notifications").select("*").limit(10);
  console.log("Current rows in sd_notifications count:", rows?.length, "Select Error:", selectErr);
  if (rows && rows.length > 0) {
    console.log("Sample row:", rows[0]);
  }

  // 2. Test Insert without ID (auto-generated ID)
  const testPayload = {
    table_number: "99",
    customer_name: "Test Audit Guest",
    request_type: "Request Water",
    service_type: "water",
    status: "Pending",
    created_at: new Date().toISOString()
  };
  
  const { data: inserted, error: insErr } = await supabase
    .from("sd_notifications")
    .insert([testPayload])
    .select();
    
  console.log("Inserted row result:", inserted, "Insert Error:", insErr);

  if (inserted && inserted.length > 0) {
    const insertedRow = inserted[0];
    const insertedId = insertedRow.id;
    console.log(`Testing UPDATE on row ID: ${insertedId} (type: ${typeof insertedId})`);

    // 3. Test Update to Accepted
    const { data: updatedAcc, error: updAccErr } = await supabase
      .from("sd_notifications")
      .update({ status: "Accepted" })
      .eq("id", insertedId)
      .select();

    console.log("Updated to Accepted result:", updatedAcc, "Update Error:", updAccErr);

    // 4. Test Update to Completed
    const { data: updatedComp, error: updCompErr } = await supabase
      .from("sd_notifications")
      .update({ status: "Completed" })
      .eq("id", insertedId)
      .select();

    console.log("Updated to Completed result:", updatedComp, "Update Error:", updCompErr);

    // Clean up test row
    await supabase.from("sd_notifications").delete().eq("id", insertedId);
    console.log("Deleted test row.");
  }
}

testNotifications().catch(console.error);

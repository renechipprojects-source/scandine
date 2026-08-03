const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testNotificationsFixed() {
  console.log("--- Testing Cleaned Payload Insert on sd_notifications ---");
  
  const testId = `SRV-${Date.now()}`;
  const testPayload = {
    id: testId,
    table_number: "5",
    request_type: "Request Water",
    title: "Table 5 Request Water (Test Guest)",
    message: "Customer Test Guest requested Water for Table 5",
    type: "service_request",
    status: "Pending",
    read: false,
    created_at: new Date().toISOString()
  };
  
  const { data: inserted, error: insErr } = await supabase
    .from("sd_notifications")
    .insert([testPayload])
    .select();
    
  console.log("Inserted row result:", inserted, "Insert Error:", insErr);

  if (inserted && inserted.length > 0) {
    const insertedId = inserted[0].id;
    console.log(`Testing UPDATE to Accepted on row ID: ${insertedId}`);

    const { data: updatedAcc, error: updAccErr } = await supabase
      .from("sd_notifications")
      .update({ status: "Accepted" })
      .eq("id", insertedId)
      .select();

    console.log("Updated to Accepted result:", updatedAcc, "Update Error:", updAccErr);

    const { data: updatedComp, error: updCompErr } = await supabase
      .from("sd_notifications")
      .update({ status: "Completed" })
      .eq("id", insertedId)
      .select();

    console.log("Updated to Completed result:", updatedComp, "Update Error:", updCompErr);

    // Clean up test row
    await supabase.from("sd_notifications").delete().eq("id", insertedId);
    console.log("Cleanup test row complete.");
  }
}

testNotificationsFixed().catch(console.error);

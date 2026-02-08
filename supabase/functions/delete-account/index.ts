import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 🔥 Delete user-owned data first (in parallel for speed)
    const deleteOperations = [
      supabase.from("profiles").delete().eq("id", user.id),
      supabase.from("posts").delete().eq("user_id", user.id),
      supabase.from("comments").delete().eq("user_id", user.id),
      // Add any other tables with user data
      // supabase.from("likes").delete().eq("user_id", user.id),
      // supabase.from("follows").delete().eq("user_id", user.id),
    ];

    const results = await Promise.allSettled(deleteOperations);

    // Log any failures (but continue with user deletion)
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `Failed to delete data for operation ${index}:`,
          result.reason,
        );
      }
    });

    // 🔥 Delete auth user (service role only)
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(
      user.id,
    );

    if (deleteUserError) {
      console.error("Failed to delete user:", deleteUserError);
      return new Response(
        JSON.stringify({
          error: "Failed to delete account",
          details: deleteUserError.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account deleted successfully",
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    console.error("Error deleting account:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});

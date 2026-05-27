import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/notes?clientId=xxx
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const { data, error } = await supabase
    .from("client_notes")
    .select("*, profiles(full_name)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten profile name
  const notes = (data ?? []).map((n) => ({
    ...n,
    author_name: (n.profiles as { full_name: string } | null)?.full_name ?? "Team member",
  }));

  return NextResponse.json(notes);
}

// POST /api/notes  — body: { client_id, content }
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { client_id, content } = await request.json();

  if (!client_id || !content?.trim()) {
    return NextResponse.json({ error: "client_id and content are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("client_notes")
    .insert({ client_id, content: content.trim(), created_by: user.id })
    .select("*, profiles(full_name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ...data,
    author_name: (data.profiles as { full_name: string } | null)?.full_name ?? "Team member",
  });
}

// DELETE /api/notes?id=xxx  — only own notes
export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("client_notes")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id); // can only delete own notes

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

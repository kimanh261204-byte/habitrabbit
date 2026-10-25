import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email là bắt buộc." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Cấu hình Supabase chưa hoàn tất." },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const cleanEmail = email.trim().toLowerCase();
    const { data: listData } = await adminClient.auth.admin.listUsers();
    const existingUser = listData?.users.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    if (existingUser) {
      if (!existingUser.email_confirmed_at) {
        await adminClient.auth.admin.updateUserById(existingUser.id, {
          email_confirm: true,
        });
        return NextResponse.json({ success: true, confirmed: true });
      }
      return NextResponse.json({ success: true, alreadyConfirmed: true });
    }

    return NextResponse.json({ error: "Không tìm thấy người dùng." }, { status: 404 });
  } catch (err: any) {
    console.error("Auto-confirm error:", err);
    return NextResponse.json(
      { error: err.message || "Lỗi tự động kích hoạt tài khoản." },
      { status: 500 }
    );
  }
}

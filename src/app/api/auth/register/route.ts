import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { seedCoreCurriculumForUser } from "@/lib/curriculum/seed";

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ email và mật khẩu." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Cấu hình Supabase trên máy chủ chưa hoàn tất." },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const { data: listData } = await adminClient.auth.admin.listUsers();
    const existingUser = listData?.users.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    if (existingUser) {
      // If user exists but email was not confirmed, auto-confirm it now!
      if (!existingUser.email_confirmed_at) {
        await adminClient.auth.admin.updateUserById(existingUser.id, {
          email_confirm: true,
          password: password,
          user_metadata: {
            full_name: fullName?.trim() || cleanEmail.split("@")[0],
          },
        });
        return NextResponse.json({
          success: true,
          message: "Tài khoản đã được tự động kích hoạt.",
        });
      }

      return NextResponse.json(
        { error: "Email này đã được đăng ký tài khoản. Vui lòng đăng nhập." },
        { status: 400 }
      );
    }

    // Create user with email_confirm = true so they can log in instantly
    const { data, error } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName?.trim() || cleanEmail.split("@")[0],
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Trigger curriculum seeding in background immediately
    if (data.user?.id) {
      seedCoreCurriculumForUser(data.user.id).catch((err) =>
        console.error("Background seeding error on register:", err)
      );
    }

    return NextResponse.json({
      success: true,
      user: data.user,
    });
  } catch (err: any) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: err.message || "Đã xảy ra lỗi trong quá trình tạo tài khoản." },
      { status: 500 }
    );
  }
}

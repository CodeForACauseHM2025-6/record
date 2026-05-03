import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userPublicWithEmailSelect } from "@/lib/prisma-selects";
import { checkAdmin } from "@/lib/middleware/auth";
import { updateAdminSchema } from "@/lib/validations";
import { errorResponse } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await checkAdmin();
  if (error) return error;

  if (session.user.id === id) {
    return errorResponse("BAD_REQUEST", "You cannot change your own admin status");
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "User not found", 404);
  }

  const body = await req.json();
  const parsed = updateAdminSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse("BAD_REQUEST", parsed.error.issues[0].message);
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isAdmin: parsed.data.isAdmin },
    select: { ...userPublicWithEmailSelect, isAdmin: true },
  }) as unknown as { id: string; email: string | null; name: string | null; image: string | null; role: string; displayTitle: string | null; isAdmin: boolean };

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isAdmin: user.isAdmin,
  });
}

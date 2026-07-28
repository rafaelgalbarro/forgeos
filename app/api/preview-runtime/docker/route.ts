import { NextResponse } from "next/server";
import { detectDocker } from "@/lib/preview-runtime/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const docker = await detectDocker();
  return NextResponse.json(docker);
}

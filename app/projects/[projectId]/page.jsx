import { redirect } from "next/navigation";

export default async function ProjectIndex({ params }) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}/board`);
}

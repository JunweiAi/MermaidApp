"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { ProjectEditClient } from "@/components/project/ProjectEditClient";

export default function ProjectEditPage() {
  const params = useParams();
  const id = params.id as string;

  return <ProjectEditClient projectId={id} />;
}

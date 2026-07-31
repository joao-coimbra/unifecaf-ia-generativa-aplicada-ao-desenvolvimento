import { createFileRoute } from "@tanstack/react-router";

import { CopilotoNortha } from "../components/copiloto-northa";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return <CopilotoNortha />;
}

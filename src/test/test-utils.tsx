import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { WorkHubProvider } from "@/lib/work-hub-store";

export function renderWithProvider(ui: ReactElement) {
  return render(<WorkHubProvider>{ui}</WorkHubProvider>);
}
